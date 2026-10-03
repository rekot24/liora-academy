// ─── SYNC CLIENT FOR THE HOMESCHOOL API ──────────────────────────────────────────
//
// How it works, in plain words
//   * LOADING: ask the API for the student's snapshot (the same shape the app has always used).
//   * SAVING: the app calls queueWrite(name, before, after) every time it saves something.
//     We compare "before" with "after", work out only what CHANGED, and send just that to the
//     API as a small PATCH. A device with an old copy can therefore only change the things it
//     actually edited. It can no longer overwrite everything (the bug the old sync had).
//   * Writes go out in order, one at a time, a moment after the last edit (debounced).
//   * If the network is down the changes stay queued (also saved in localStorage so a page
//     reload doesn't lose them) and are retried.
//
// This file has no React in it, so it can be tested on its own (api/test/sync-roundtrip.test.mjs).

import {
  API_BASE_PATH,
  LOCAL_ONLY_STORES,
  STORAGE_KEY_STUDENT_ID,
  STORAGE_KEY_SYNC_PENDING,
  SYNC_DEBOUNCE_MS,
  SYNC_RETRY_DELAYS_MS,
  SYNC_WRITE_ORDER,
} from "../constants/index.js";

/** @typedef {{ online: boolean, pending: number, error?: string|null, lastSyncedAt?: string }} SyncStatus */
/** @typedef {{ method: string, where: { student?: string, household?: string }, body: any }} SyncRequest */

export { SYNC_WRITE_ORDER as WRITE_ORDER };

// ── config (tests point this at a test server) ──

/**
 * The browser's localStorage if it can be used here (it can't in Node tests or private modes).
 * @returns {Storage|null}
 */
function defaultStorage() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

let cfg = { baseUrl: "", storage: defaultStorage(), fetchImpl: null };

/**
 * Override settings, used by tests: baseUrl of a test server, a fake storage, a fake fetch.
 * @param {{ baseUrl?: string, storage?: any, fetchImpl?: Function|null }} [next]
 * @returns {void}
 */
export function configureSync(next = {}) { cfg = { ...cfg, ...next }; }

/**
 * fetch, or the test replacement if one was configured.
 * @param {...any} args - same arguments as fetch
 * @returns {Promise<Response>}
 */
const doFetch = (...args) => (cfg.fetchImpl ?? fetch)(...args);

// ── state ──
let studentId = null;
let lastEtag = null;
/** @type {Map<string, any>} name -> the value before the first unsent edit */
const pendingPrev = new Map();
/** @type {Map<string, any>} name -> the latest value */
const pendingNext = new Map();
let timer = null;
let flushing = false;
let retryIndex = 0;
/** @type {SyncStatus} */
let status = { online: false, pending: 0 };
const listeners = new Set();

/**
 * Be told whenever the sync status changes (online/offline, edits waiting, errors).
 * @param {(status: SyncStatus) => void} fn
 * @returns {() => void} call to stop listening
 */
export function onSyncStatusChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/**
 * The latest sync status.
 * @returns {SyncStatus}
 */
export function getSyncStatus() { return status; }

/**
 * Merge a change into the status and tell every listener.
 * @param {Partial<SyncStatus>} patch
 * @returns {void}
 */
function emit(patch) {
  status = { ...status, ...patch, pending: pendingNext.size };
  // A broken listener (a screen that has gone away) must never stop the others being told.
  listeners.forEach((fn) => { try { fn(status); } catch (err) { warn("a sync status listener threw", err); } });
}

/**
 * True while edits are waiting or being sent. The app must not overwrite its screen with
 * server data during this time, or it could wipe an edit that hasn't been sent yet.
 * @returns {boolean}
 */
export function isBusy() { return pendingNext.size > 0 || flushing; }

// ── logging ──
// NOTE: dev-standards wants all output to go through a logger layer. This project has none yet,
// so these two helpers are the only place the sync client writes to the console.
// See the open question in the pull request.

/**
 * Log something unexpected but recoverable.
 * @param {string} message
 * @param {any} [detail]
 * @returns {void}
 */
function warn(message, detail) { if (typeof console !== "undefined") console.warn(`[sync] ${message}`, detail ?? ""); }

/**
 * Log something that failed and will not fix itself.
 * @param {string} message
 * @param {any} [detail]
 * @returns {void}
 */
function logError(message, detail) { if (typeof console !== "undefined") console.error(`[sync] ${message}`, detail ?? ""); }

// ── tiny storage helpers ──
// Storage can be missing or full (private windows, quota). The app still works without it, so
// these report the problem through warn() and carry on instead of throwing.

/**
 * Read a string from storage.
 * @param {string} key
 * @returns {string|null}
 */
function storeGet(key) {
  try { return cfg.storage?.getItem(key) ?? null; } catch (err) { warn(`could not read ${key} from storage`, err); return null; }
}

/**
 * Write a string to storage.
 * @param {string} key
 * @param {string} val
 * @returns {void}
 */
function storeSet(key, val) {
  try { cfg.storage?.setItem(key, val); } catch (err) { warn(`could not write ${key} to storage`, err); }
}

/**
 * Remove a key from storage.
 * @param {string} key
 * @returns {void}
 */
function storeRemove(key) {
  try { cfg.storage?.removeItem(key); } catch (err) { warn(`could not remove ${key} from storage`, err); }
}

/**
 * Save the queue of unsent edits so a page reload doesn't lose them.
 * @returns {void}
 */
function persistPending() {
  if (pendingNext.size === 0) { storeRemove(STORAGE_KEY_SYNC_PENDING); return; }
  const queued = {};
  for (const [name, next] of pendingNext) queued[name] = { prev: pendingPrev.get(name), next };
  storeSet(STORAGE_KEY_SYNC_PENDING, JSON.stringify(queued));
}

/**
 * Bring back edits that were queued but never sent (the tab was closed, the network was down)
 * and start sending them.
 * @returns {number} how many stores have unsent edits
 */
export function restorePending() {
  const raw = storeGet(STORAGE_KEY_SYNC_PENDING);
  if (!raw) return 0;
  try {
    const queued = JSON.parse(raw);
    for (const [name, v] of Object.entries(queued)) {
      if (!pendingNext.has(name)) { pendingPrev.set(name, v.prev); pendingNext.set(name, v.next); }
    }
  } catch (err) {
    warn("the saved queue of unsent edits was unreadable and was ignored", err);
  }
  if (pendingNext.size) { emit({}); scheduleFlush(0); }
  return pendingNext.size;
}

// ── comparing values ──

/**
 * A stable text form of a value: keys sorted, null/undefined fields dropped (the server doesn't
 * keep empty fields, so {a:1, b:null} and {a:1} are the same thing).
 * @param {any} v
 * @returns {string}
 */
export function stable(v) {
  if (v === undefined || v === null) return "null";
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (typeof v === "object") {
    return "{" + Object.keys(v).filter((k) => v[k] !== undefined && v[k] !== null).sort().map((k) => JSON.stringify(k) + ":" + stable(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

/** True if two values are the same once null fields and key order are ignored. */
const same = (a, b) => stable(a) === stable(b);
/** The value if it is a plain object, otherwise an empty object. */
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
/** The value if it is an array, otherwise an empty array. */
const arr = (v) => (Array.isArray(v) ? v : []);
/** Every key that appears in any of the given objects. */
const union = (...objs) => [...new Set(objs.flatMap((o) => Object.keys(o)))];

// ── the differs: (before, after) -> list of API requests ──
// Each returns a list of requests, or an empty list when nothing changed. `where.student` is a
// path under the student ("log"); `where.household` is a path under the household ("catalog").

/** Build one request. @returns {SyncRequest} */
const req = (method, where, body) => ({ method, where, body });
/** A path under the current student. */
const S = (path) => ({ student: path });
/** A path shared by the whole household. */
const H = (path) => ({ household: path });

/**
 * Completion log: { date: { lessonKey: true | "skipped" | false } }
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffLog(prev, next) {
  prev = obj(prev); next = obj(next);
  const body = {};
  for (const date of union(prev, next)) {
    const p = obj(prev[date]), n = obj(next[date]);
    for (const k of union(p, n)) {
      const pv = p[k] ?? false, nv = n[k] ?? false;
      if (pv !== nv) (body[date] ??= {})[k] = nv;
    }
  }
  return Object.keys(body).length ? [req("PATCH", S("log"), body)] : [];
}

/**
 * Grades: { date: { lessonKey: {type, value, max?} } }
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffGrades(prev, next) {
  prev = obj(prev); next = obj(next);
  const body = {};
  for (const date of union(prev, next)) {
    const p = obj(prev[date]), n = obj(next[date]);
    for (const k of union(p, n)) {
      if (!same(p[k], n[k])) (body[date] ??= {})[k] = n[k] ?? null;
    }
  }
  return Object.keys(body).length ? [req("PATCH", S("grades"), body)] : [];
}

/**
 * Life skills a student has learned: { ls001: true, ls001_date: "2026-10-02" }
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffSkills(prev, next) {
  prev = obj(prev); next = obj(next);
  const ids = union(prev, next).filter((k) => !k.endsWith("_date"));
  const body = {};
  for (const id of ids) {
    const pDone = prev[id] === true, nDone = next[id] === true;
    const pDate = prev[`${id}_date`] ?? null, nDate = next[`${id}_date`] ?? null;
    if (pDone === nDone && (!nDone || pDate === nDate)) continue;
    if (nDone) { body[id] = true; if (nDate) body[`${id}_date`] = nDate; }
    else { body[id] = null; body[`${id}_date`] = null; }
  }
  return Object.keys(body).length ? [req("PATCH", S("skills"), body)] : [];
}

/**
 * Reminder times: { "2026-10-02:lessonKey": "09:30" }
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffAlerts(prev, next) {
  prev = obj(prev); next = obj(next);
  const body = {};
  for (const k of union(prev, next)) {
    if (prev[k] !== next[k]) body[k] = next[k] ?? null;
  }
  return Object.keys(body).length ? [req("PATCH", S("alerts"), body)] : [];
}

/**
 * Make a differ for stores keyed by day ({ date: [items] }): changed days are replaced whole,
 * and a day that disappeared is cleared.
 * @param {string} path - the API path under the student ("schedule" or "overrides")
 * @returns {(prev: any, next: any) => SyncRequest[]}
 */
function diffByDay(path) {
  return (prev, next) => {
    prev = obj(prev); next = obj(next);
    const body = {};
    for (const date of union(prev, next)) {
      if (!same(prev[date], next[date])) body[date] = next[date] ?? null;
    }
    return Object.keys(body).length ? [req("PATCH", S(path), body)] : [];
  };
}

/**
 * Weekly pattern: [{ subject, days }] (the whole list is replaced when it changes).
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
const diffPattern = (prev, next) => (same(prev, next) ? [] : [req("PUT", S("pattern"), arr(next))]);

/**
 * Evaluation settings (one object per student).
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
const diffEvaluation = (prev, next) => (next && !same(prev, next) ? [req("PUT", S("evaluation"), next)] : []);

/**
 * Alert channel toggles (one object per student).
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
const diffAlertSettings = (prev, next) => (next && !same(prev, next) ? [req("PUT", S("alert-settings"), next)] : []);

/**
 * A semester without the `active` flag the server adds, so the two sides compare equal.
 * @param {any} s
 * @returns {any}
 */
const semesterForCompare = (s) => { if (!s) return s; const { active: _active, ...rest } = s; return rest; };

/**
 * Semesters: { slug: { id, name, startDate, endDate, subjects, targetDays } }.
 * Sends the added or edited ones, and names the removed ones explicitly.
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffSemesters(prev, next) {
  prev = obj(prev); next = obj(next);
  const semesters = {};
  for (const slug of Object.keys(next)) {
    if (!same(semesterForCompare(prev[slug]), semesterForCompare(next[slug]))) {
      semesters[slug] = { ...semesterForCompare(next[slug]), id: next[slug].id || slug };
    }
  }
  const remove = Object.keys(prev).filter((slug) => !(slug in next));
  if (!Object.keys(semesters).length && !remove.length) return [];
  return [req("PATCH", S("semesters"), { semesters, remove })];
}

/**
 * Which semester is active (sent after the semesters themselves, so it always exists).
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffActiveSemester(prev, next) {
  return prev === next || !next ? [] : [req("PATCH", S("semesters"), { activeSemester: next })];
}

/**
 * The lesson catalog shared by the household: { Subject: [ {id, title, ...} ] }.
 * Sends added or edited lessons, removed lesson ids, subject order, and lesson order.
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffAssignments(prev, next) {
  prev = obj(prev); next = obj(next);
  const flat = (cat) => {
    const m = new Map();
    for (const [subject, lessons] of Object.entries(cat)) for (const l of arr(lessons)) if (l && l.id) m.set(l.id, { ...l, subject });
    return m;
  };
  const p = flat(prev), n = flat(next);
  const body = {};
  const subjects = Object.keys(next);
  if (!same(Object.keys(prev), subjects)) body.subjects = subjects;
  const upsert = [];
  for (const [id, lesson] of n) if (!same(p.get(id), lesson)) upsert.push(lesson);
  const remove = [...p.keys()].filter((id) => !n.has(id));
  if (upsert.length || remove.length) body.lessons = { upsert, remove };
  const order = {};
  for (const subject of subjects) {
    const pIds = arr(prev[subject]).map((l) => l.id), nIds = arr(next[subject]).map((l) => l.id);
    if (!same(pIds, nIds)) order[subject] = nIds;
  }
  if (Object.keys(order).length) body.order = order;
  return Object.keys(body).length ? [req("PATCH", H("catalog"), body)] : [];
}

/**
 * The life-skills catalog: { Category: [ {id, title} ] }.
 * @param {any} prev
 * @param {any} next
 * @returns {SyncRequest[]}
 */
function diffSkillsCatalog(prev, next) {
  prev = obj(prev); next = obj(next);
  const flat = (cat) => {
    const m = new Map();
    for (const [category, items] of Object.entries(cat)) for (const s of arr(items)) if (s && s.id) m.set(s.id, { id: s.id, category, title: s.title });
    return m;
  };
  const p = flat(prev), n = flat(next);
  const upsert = [...n.values()].filter((s) => !same(p.get(s.id), s));
  const remove = [...p.keys()].filter((id) => !n.has(id));
  const body = {};
  if (upsert.length) body.upsert = upsert;
  if (remove.length) body.remove = remove;
  if (!same([...p.keys()], [...n.keys()])) body.order = [...n.keys()];
  return Object.keys(body).length ? [req("PATCH", H("life-skills"), body)] : [];
}

/**
 * Make a differ for lists whose entries have ids (field trips, activities): sends the added or
 * edited entries and the ids of removed ones.
 * @param {string} path - the API path under the student
 * @returns {(prev: any, next: any) => SyncRequest[]}
 */
function diffById(path) {
  return (prev, next) => {
    prev = arr(prev); next = arr(next);
    const withId = (list) => list.filter((x) => x && x.id);
    const p = new Map(withId(prev).map((x) => [x.id, x])), n = new Map(withId(next).map((x) => [x.id, x]));
    if (next.some((x) => x && !x.id)) warn(`some ${path} entries have no id and can't be synced`);
    const upsert = [...n.values()].filter((x) => !same(p.get(x.id), x));
    const remove = [...p.keys()].filter((id) => !n.has(id));
    const body = {};
    if (upsert.length) body.upsert = upsert;
    if (remove.length) body.remove = remove;
    return Object.keys(body).length ? [req("PATCH", S(path), body)] : [];
  };
}

/** One differ per synced store, keyed by the app's store name. */
export const DIFFERS = {
  log: diffLog,
  grades: diffGrades,
  skills: diffSkills,
  alerts: diffAlerts,
  schedule: diffByDay("schedule"),
  overrides: diffByDay("overrides"),
  pattern: diffPattern,
  evaluation: diffEvaluation,
  alertSettings: diffAlertSettings,
  semesters: diffSemesters,
  activeSemester: diffActiveSemester,
  assignments: diffAssignments,
  skillsCatalog: diffSkillsCatalog,
  fieldTrips: diffById("field-trips"),
  extracurriculars: diffById("extracurriculars"),
};

/** What "nothing there yet" means for each store, used if the app has no earlier value. */
const EMPTY = { log: {}, grades: {}, skills: {}, alerts: {}, schedule: {}, overrides: {}, semesters: {}, assignments: {}, skillsCatalog: {}, fieldTrips: [], extracurriculars: [], pattern: [] };

// ── talking to the API ──

/** An error from talking to the API. `retryable` means waiting and trying again might work. */
class SyncError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, retryable?: boolean }} [opts]
   */
  constructor(message, { status = 0, retryable = false } = {}) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Call the API. Returns the parsed JSON (or a "not modified" marker). Throws SyncError for
 * network failures, non-JSON replies (such as a login page), and error statuses.
 * @param {string} method
 * @param {string} path - path under the API base, e.g. "/me"
 * @param {any} [body] - sent as JSON when given
 * @param {Record<string, string>} [extraHeaders]
 * @returns {Promise<{ data?: any, etag?: string|null, notModified?: boolean }>}
 */
async function api(method, path, body, extraHeaders = {}) {
  let res;
  try {
    res = await doFetch(`${cfg.baseUrl}${API_BASE_PATH}${path}`, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...extraHeaders },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new SyncError("Network error", { retryable: true });
  }
  if (res.status === 304) return { notModified: true, etag: res.headers.get("etag") };
  const type = res.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    // e.g. the Cloudflare Access login page, or Nginx returning the site's HTML
    throw new SyncError(res.ok ? "Not signed in (got a web page instead of data)" : `HTTP ${res.status}`, { status: res.status, retryable: true });
  }
  const data = await res.json();
  if (!res.ok) throw new SyncError(data?.error || `HTTP ${res.status}`, { status: res.status, retryable: res.status >= 500 || res.status === 429 });
  return { data, etag: res.headers.get("etag") };
}

/**
 * Work out which student this device shows: the one it remembered, else the first in the household.
 * @returns {Promise<string>} the student's id
 */
async function ensureStudent() {
  if (studentId) return studentId;
  const { data } = await api("GET", "/me");
  const first = data.students?.[0];
  if (!first) throw new SyncError("This household has no students yet");
  const remembered = storeGet(STORAGE_KEY_STUDENT_ID);
  const match = data.students.find((s) => s.id === remembered) ?? first;
  studentId = match.id;
  storeSet(STORAGE_KEY_STUDENT_ID, studentId);
  return studentId;
}

/**
 * The id of the student this device is showing, once known.
 * @returns {string|null}
 */
export function getStudentId() { return studentId; }

/**
 * If the app fetched a snapshot but couldn't use it (edits were in flight), call this so the
 * next check fetches it again instead of being told "nothing changed".
 * @returns {void}
 */
export function forgetEtag() { lastEtag = null; }

/**
 * Load the student's snapshot from the server.
 * @param {{ force?: boolean }} [opts] - force: skip the "has it changed?" check and always fetch
 * @returns {Promise<any|null>} the snapshot, or null if nothing changed or the server can't be
 *   reached (check getSyncStatus().online to tell which)
 */
export async function fetchServerState({ force = false } = {}) {
  try {
    const id = await ensureStudent();
    const res = await api("GET", `/students/${id}/snapshot`, undefined, lastEtag && !force ? { "If-None-Match": lastEtag } : {});
    emit({ online: true, error: null, lastSyncedAt: new Date().toISOString() });
    if (res.notModified) return null;
    lastEtag = res.etag;
    return res.data;
  } catch (err) {
    emit({ online: false, error: err.message });
    return null;
  }
}

// ── queueing and sending ──

/**
 * Record that a store changed. Call this every time the app saves.
 * @param {string} name - the app's store name, e.g. "log" or "schedule"
 * @param {any} before - what the store held before the edit (undefined if unknown)
 * @param {any} after - what it holds now
 * @returns {void}
 */
export function queueWrite(name, before, after) {
  if (LOCAL_ONLY_STORES.includes(name) || !DIFFERS[name]) return;
  if (!pendingNext.has(name)) pendingPrev.set(name, before === undefined ? EMPTY[name] : before);
  pendingNext.set(name, after);
  persistPending();
  emit({});
  scheduleFlush(SYNC_DEBOUNCE_MS);
}

/**
 * Send queued edits after a delay (restarting the delay if one is already counting down).
 * @param {number} ms
 * @returns {void}
 */
function scheduleFlush(ms) {
  clearTimeout(timer);
  timer = setTimeout(() => { flush(); }, ms);
}

/**
 * The API path for a request.
 * @param {SyncRequest["where"]} where
 * @param {string} id - the student id
 * @returns {string}
 */
function urlFor(where, id) {
  return where.student ? `/students/${id}/${where.student}` : `/${where.household}`;
}

/**
 * Send everything queued, in order. Stops at the first network failure so order is never
 * broken, and tries again later. A request the server rejects is reported, not retried.
 * @returns {Promise<void>}
 */
export async function flush() {
  if (flushing) return;
  clearTimeout(timer);
  flushing = true;
  try {
    for (const name of SYNC_WRITE_ORDER) {
      if (!pendingNext.has(name)) continue;
      const before = pendingPrev.get(name), after = pendingNext.get(name);
      const requests = DIFFERS[name](before, after);
      try {
        if (requests.length) {
          const id = await ensureStudent();
          for (const r of requests) {
            const { data } = await api(r.method, urlFor(r.where, id), r.body);
            if (data?.ignored?.length) warn(`the server ignored entries for ${name}`, data.ignored);
          }
        }
      } catch (err) {
        if (err.retryable) {
          emit({ online: false, error: err.message });
          const delay = SYNC_RETRY_DELAYS_MS[Math.min(retryIndex++, SYNC_RETRY_DELAYS_MS.length - 1)];
          flushing = false;
          scheduleFlush(delay);
          return;
        }
        // The server understood the request and said no. Retrying won't help; tell the user.
        logError(`${name} was rejected`, err.message);
        emit({ online: true, error: `Couldn't save ${name}: ${err.message}` });
      }
      // sent (or rejected): what the server now has is `after`, unless it changed while we were sending
      if (pendingNext.get(name) === after) { pendingNext.delete(name); pendingPrev.delete(name); }
      else pendingPrev.set(name, after);
    }
    retryIndex = 0;
    persistPending();
    if (pendingNext.size === 0) emit({ online: true, lastSyncedAt: new Date().toISOString(), ...(status.error?.startsWith("Couldn't save") ? {} : { error: null }) });
    else emit({});
  } finally {
    flushing = false;
  }
  if (pendingNext.size > 0) scheduleFlush(SYNC_DEBOUNCE_MS);
}

/**
 * Restoring a backup FILE: make the server match the file exactly (including removals).
 * This is deliberate, unlike normal saves, which only ever send the difference you made.
 * @param {any} snapshot - the parsed backup file
 * @returns {Promise<void>}
 * @throws {Error} if the server can't be reached
 */
export async function restoreToServer(snapshot) {
  const current = await fetchServerState({ force: true });
  if (!current) throw new Error("Can't reach the server to restore the backup");
  for (const name of SYNC_WRITE_ORDER) {
    if (snapshot[name] === undefined || snapshot[name] === null) continue;
    queueWrite(name, current[name], snapshot[name]);
  }
  await flush();
}

/**
 * Reset all module state. For tests only.
 * @returns {void}
 */
export function _resetForTests() {
  clearTimeout(timer);
  studentId = null; lastEtag = null; pendingPrev.clear(); pendingNext.clear();
  timer = null; flushing = false; retryIndex = 0; status = { online: false, pending: 0 };
}
