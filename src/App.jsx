import { useState, useEffect, useCallback } from "react";

// ─── INITIAL DATA ────────────────────────────────────────────────────────────

const INITIAL_SEMESTERS = {
  "2026-summer": {
    id: "2026-summer",
    name: "Summer Catch-Up",
    mode: "lite",
    startDate: "2026-05-01",
    endDate: "2026-07-31",
    subjects: ["Math", "Reading"],
    targetDays: 60,
    active: true,
  },
  "2026-fall": {
    id: "2026-fall",
    name: "Fall 2026",
    mode: "full",
    startDate: "2026-08-04",
    endDate: "2026-12-19",
    subjects: ["Math", "Reading", "Writing", "Science", "History", "Civics", "Literature", "Constitution"],
    targetDays: 86,
    active: false,
  },
};

const INITIAL_ASSIGNMENTS = {
  Math: [
    { id: "m001", subject: "Math", platform: "Khan Academy", title: "Place Value & Rounding", description: "Review place value through millions, rounding to nearest 10/100/1000", estMin: 25, level: "4th grade", seq: 1 },
    { id: "m002", subject: "Math", platform: "Khan Academy", title: "Multi-digit Multiplication", description: "Multiply 2-digit × 2-digit numbers using area model", estMin: 25, level: "4th grade", seq: 2 },
    { id: "m003", subject: "Math", platform: "Khan Academy", title: "Long Division Basics", description: "Divide 3-digit numbers by 1-digit divisors", estMin: 30, level: "4th grade", seq: 3 },
    { id: "m004", subject: "Math", platform: "Khan Academy", title: "Fractions — Understanding", description: "What fractions mean, numerator/denominator, visual models", estMin: 25, level: "4th grade", seq: 4 },
    { id: "m005", subject: "Math", platform: "Khan Academy", title: "Fractions — Equivalent", description: "Find and create equivalent fractions, simplify fractions", estMin: 25, level: "4th grade", seq: 5 },
    { id: "m006", subject: "Math", platform: "Khan Academy", title: "Fractions — Adding Same Denominator", description: "Add and subtract fractions with like denominators", estMin: 25, level: "4th grade", seq: 6 },
    { id: "m007", subject: "Math", platform: "Khan Academy", title: "Fractions — Adding Unlike Denominators", description: "Find common denominators, add/subtract unlike fractions", estMin: 30, level: "5th grade", seq: 7 },
    { id: "m008", subject: "Math", platform: "Khan Academy", title: "Fractions — Multiplying", description: "Multiply fractions and mixed numbers", estMin: 30, level: "5th grade", seq: 8 },
    { id: "m009", subject: "Math", platform: "Khan Academy", title: "Decimals — Understanding", description: "Decimal place value, reading and writing decimals", estMin: 25, level: "4th grade", seq: 9 },
    { id: "m010", subject: "Math", platform: "Khan Academy", title: "Decimals — Operations", description: "Add, subtract, multiply, divide decimals", estMin: 30, level: "5th grade", seq: 10 },
    { id: "m011", subject: "Math", platform: "Khan Academy", title: "Percentages — Introduction", description: "What percentages mean, convert between fractions/decimals/percents", estMin: 30, level: "5th grade", seq: 11 },
    { id: "m012", subject: "Math", platform: "Khan Academy", title: "Basic Geometry — Shapes & Angles", description: "Classify triangles, quadrilaterals, measure angles", estMin: 25, level: "5th grade", seq: 12 },
  ],
  Reading: [
    { id: "r001", subject: "Reading", platform: "Free Choice", title: "Independent Reading — Week 1", description: "Read any book of your choice for 20-30 minutes. Graphic novels count!", estMin: 25, level: "Any", seq: 1 },
    { id: "r002", subject: "Reading", platform: "Free Choice", title: "Independent Reading — Week 2", description: "Continue your current book. Try to read a little longer today.", estMin: 25, level: "Any", seq: 2 },
    { id: "r003", subject: "Reading", platform: "Khan Academy", title: "Reading Comprehension — Main Idea", description: "Practice identifying the main idea and key details in a passage", estMin: 20, level: "5th grade", seq: 3 },
    { id: "r004", subject: "Reading", platform: "Free Choice", title: "Independent Reading — Week 3", description: "Read for 25-30 minutes. Notice: who are the characters? What do they want?", estMin: 25, level: "Any", seq: 4 },
    { id: "r005", subject: "Reading", platform: "Khan Academy", title: "Reading Comprehension — Inference", description: "Practice making inferences — figuring out what the author implies", estMin: 20, level: "5th grade", seq: 5 },
  ],
  Writing: [
    { id: "w001", subject: "Writing", platform: "Easy Peasy", title: "Sentences vs. Fragments", description: "Identify complete sentences, fix fragments and run-ons", estMin: 20, level: "5th grade", seq: 1 },
    { id: "w002", subject: "Writing", platform: "Easy Peasy", title: "Paragraph Structure", description: "Topic sentence, supporting details, concluding sentence", estMin: 25, level: "5th grade", seq: 2 },
    { id: "w003", subject: "Writing", platform: "Brave Writer", title: "Free Write — What I Love", description: "Write freely for 10 minutes about something you love. No rules, just write.", estMin: 15, level: "Any", seq: 3 },
    { id: "w004", subject: "Writing", platform: "Easy Peasy", title: "Descriptive Writing", description: "Use sensory details to describe a place you know well", estMin: 25, level: "6th grade", seq: 4 },
  ],
  Science: [
    { id: "s001", subject: "Science", platform: "Khan Academy", title: "The Scientific Method", description: "Observation, hypothesis, experiment, conclusion", estMin: 25, level: "5th grade", seq: 1 },
    { id: "s002", subject: "Science", platform: "Khan Academy", title: "Matter — Solids, Liquids, Gases", description: "Properties of the three states of matter and how they change", estMin: 25, level: "5th grade", seq: 2 },
    { id: "s003", subject: "Science", platform: "Khan Academy", title: "Ecosystems & Food Chains", description: "Producers, consumers, decomposers, energy flow", estMin: 25, level: "5th grade", seq: 3 },
    { id: "s004", subject: "Science", platform: "Khan Academy", title: "The Solar System", description: "Planets, moons, orbits, scale of the solar system", estMin: 25, level: "5th grade", seq: 4 },
  ],
  History: [
    { id: "h001", subject: "History", platform: "Easy Peasy", title: "Early Civilizations — Mesopotamia", description: "First cities, writing, farming in ancient Mesopotamia", estMin: 25, level: "6th grade", seq: 1 },
    { id: "h002", subject: "History", platform: "Easy Peasy", title: "Ancient Egypt", description: "Pharaohs, pyramids, the Nile, and daily life in ancient Egypt", estMin: 25, level: "6th grade", seq: 2 },
    { id: "h003", subject: "History", platform: "Easy Peasy", title: "Ancient Greece", description: "City-states, democracy, mythology, and lasting contributions", estMin: 25, level: "6th grade", seq: 3 },
    { id: "h004", subject: "History", platform: "Easy Peasy", title: "The American Revolution — Causes", description: "Why colonists broke from Britain: taxes, representation, key events", estMin: 25, level: "5th grade", seq: 4 },
  ],
  Civics: [
    { id: "c001", subject: "Civics", platform: "Easy Peasy", title: "Three Branches of Government", description: "Legislative, executive, judicial — what each does and why", estMin: 20, level: "5th grade", seq: 1 },
    { id: "c002", subject: "Civics", platform: "Easy Peasy", title: "How Laws Are Made", description: "How a bill becomes a law, from idea to signature", estMin: 20, level: "5th grade", seq: 2 },
    { id: "c003", subject: "Civics", platform: "Easy Peasy", title: "Your Rights as a Citizen", description: "The Bill of Rights — first 10 amendments in plain English", estMin: 25, level: "6th grade", seq: 3 },
  ],
  Literature: [
    { id: "l001", subject: "Literature", platform: "Easy Peasy", title: "Story Elements — Plot", description: "Exposition, rising action, climax, falling action, resolution", estMin: 20, level: "5th grade", seq: 1 },
    { id: "l002", subject: "Literature", platform: "Easy Peasy", title: "Character Analysis", description: "How authors develop characters through actions, dialogue, description", estMin: 20, level: "5th grade", seq: 2 },
    { id: "l003", subject: "Literature", platform: "Easy Peasy", title: "Theme vs. Topic", description: "The difference between what a story is about vs. what it means", estMin: 20, level: "6th grade", seq: 3 },
  ],
  Constitution: [
    { id: "co001", subject: "Constitution", platform: "Easy Peasy", title: "Why the Constitution Exists", description: "Problems with the Articles of Confederation, Constitutional Convention", estMin: 20, level: "5th grade", seq: 1 },
    { id: "co002", subject: "Constitution", platform: "Easy Peasy", title: "The Preamble — In Plain English", description: "Read and understand the Preamble's 6 goals for the country", estMin: 15, level: "5th grade", seq: 2 },
    { id: "co003", subject: "Constitution", platform: "Easy Peasy", title: "The Bill of Rights", description: "First 10 amendments — what they protect and why they were added", estMin: 20, level: "6th grade", seq: 3 },
    { id: "co004", subject: "Constitution", platform: "Easy Peasy", title: "Amendments 11–27 Overview", description: "Major later amendments: Civil War amendments, women's vote, more", estMin: 20, level: "6th grade", seq: 4 },
  ],
  Speaking: [],
};

// Colorado's required subject list. These can't be deleted from Courses & Subjects,
// only edited — Speaking is activity-based (job site conversations, presentations,
// field trip discussion) so it's fine for it to have zero fixed lessons.
const REQUIRED_SUBJECTS = ["Math", "Reading", "Writing", "Speaking", "Science", "History", "Civics", "Literature", "Constitution"];

const INITIAL_LIFE_SKILLS = {
  "Kitchen & Home": [
    { id: "ls001", title: "Basic knife skills and kitchen safety" },
    { id: "ls002", title: "Cook 5 meals from scratch" },
    { id: "ls003", title: "Meal plan a week on a budget" },
    { id: "ls004", title: "Grocery shop with a list and budget" },
    { id: "ls005", title: "Food storage and expiration dates" },
    { id: "ls006", title: "Unclog a drain" },
    { id: "ls007", title: "Change an air filter" },
    { id: "ls008", title: "Do a load of laundry start to finish" },
  ],
  "Financial Literacy": [
    { id: "ls009", title: "Read a bank statement" },
    { id: "ls010", title: "Build and manage a personal budget" },
    { id: "ls011", title: "Understand gross vs. net pay" },
    { id: "ls012", title: "How credit cards and interest work" },
    { id: "ls013", title: "What a credit score is" },
    { id: "ls014", title: "Understand a utility bill" },
    { id: "ls015", title: "Open a savings account" },
  ],
  "Auto & Mechanical": [
    { id: "ls016", title: "Check and add oil" },
    { id: "ls017", title: "Check tire pressure and inflate" },
    { id: "ls018", title: "Check coolant and brake fluid" },
    { id: "ls019", title: "Change a flat tire" },
    { id: "ls020", title: "Jump a dead battery" },
    { id: "ls021", title: "Read dashboard warning lights" },
  ],
  "Trade & Handyman": [
    { id: "ls022", title: "Name and use 10 common tools" },
    { id: "ls023", title: "Measure accurately with a tape measure" },
    { id: "ls024", title: "Use a level and a square" },
    { id: "ls025", title: "Safe tool handling on a job site" },
    { id: "ls026", title: "Assist with a real repair job" },
    { id: "ls027", title: "Understand how a quote becomes an invoice" },
    { id: "ls028", title: "Professional client interaction" },
  ],
  "Health & Wellness": [
    { id: "ls029", title: "Basic first aid — cuts, burns, sprains" },
    { id: "ls030", title: "When to use ER vs urgent care vs doctor" },
    { id: "ls031", title: "Understand a health insurance card" },
    { id: "ls032", title: "Read a prescription label" },
    { id: "ls033", title: "Recognize signs of stress and anxiety" },
  ],
  "Digital & Life Admin": [
    { id: "ls034", title: "Write a professional email" },
    { id: "ls035", title: "Organize digital and paper files" },
    { id: "ls036", title: "Recognize online scams" },
    { id: "ls037", title: "Fill out a job application" },
    { id: "ls038", title: "Understand a basic contract or lease" },
    { id: "ls039", title: "Navigate DMV and government websites" },
  ],
};

// ─── STORAGE HELPERS ─────────────────────────────────────────────────────────

const STORAGE_KEYS = {
  semesters: "hs_semesters",
  assignments: "hs_assignments",
  schedule: "hs_schedule",
  overrides: "hs_overrides",
  pattern: "hs_pattern",
  log: "hs_log",
  grades: "hs_grades",
  missed: "hs_missed",
  skills: "hs_skills",
  skillsCatalog: "hs_skills_catalog",
  fieldTrips: "hs_field_trips",
  extracurriculars: "hs_extracurriculars",
  activeSemester: "hs_active_semester",
  evaluation: "hs_evaluation",
  alerts: "hs_alerts",
  alertSettings: "hs_alert_settings",
  auth: "hs_auth",
};

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  scheduleAutoSaveWrite();
  scheduleServerPush();
}

// ─── AUTO-SAVE TO FILE (File System Access API, Chrome/Edge) ──────────────────
// Lets Joshua connect one real file on disk once; every localStorage change is
// silently mirrored into that same file (overwritten, not re-downloaded), so it
// never piles up dated copies. If the file lives in a Drive/OneDrive-synced
// folder, that also becomes automatic offsite backup with zero extra setup.

const AUTOSAVE_DB = "hs_autosave_db";
const AUTOSAVE_STORE = "handles";
const AUTOSAVE_KEY = "backupFile";
let _autoSaveHandle = null;
let _autoSaveTimer = null;
let _autoSaveListeners = [];

function onAutoSaveStatusChange(fn) { _autoSaveListeners.push(fn); return () => { _autoSaveListeners = _autoSaveListeners.filter(f => f !== fn); }; }
function emitAutoSaveStatus(status) { _autoSaveListeners.forEach(fn => fn(status)); }

function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(AUTOSAVE_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(AUTOSAVE_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, val) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readwrite");
    tx.objectStore(AUTOSAVE_STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUTOSAVE_STORE, "readonly");
    const req = tx.objectStore(AUTOSAVE_STORE).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

function collectBackupSnapshot() {
  const snapshot = { exportedAt: new Date().toISOString() };
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    if (name === "auth") return; // never export PINs
    snapshot[name] = load(key, null);
  });
  return snapshot;
}

async function connectAutoSaveFile() {
  if (!("showSaveFilePicker" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: "liora-academy-backup.json",
      types: [{ description: "JSON backup", accept: { "application/json": [".json"] } }],
    });
    _autoSaveHandle = handle;
    await idbSet(AUTOSAVE_KEY, handle);
    await writeAutoSaveNow();
    emitAutoSaveStatus({ connected: true, fileName: handle.name });
    return { ok: true };
  } catch (err) {
    if (err.name === "AbortError") return { ok: false, reason: "cancelled" };
    return { ok: false, reason: "error" };
  }
}

async function tryReconnectAutoSaveFile() {
  if (!("indexedDB" in window) || !("showSaveFilePicker" in window)) return;
  try {
    const handle = await idbGet(AUTOSAVE_KEY);
    if (!handle) return;
    const perm = await handle.queryPermission({ mode: "readwrite" });
    if (perm === "granted") {
      _autoSaveHandle = handle;
      emitAutoSaveStatus({ connected: true, fileName: handle.name });
    } else {
      // Known but needs a click to re-grant permission — surface as "reconnect needed"
      emitAutoSaveStatus({ connected: false, fileName: handle.name, needsPermission: true });
    }
  } catch {}
}

async function writeAutoSaveNow() {
  if (!_autoSaveHandle) return;
  try {
    const writable = await _autoSaveHandle.createWritable();
    await writable.write(JSON.stringify(collectBackupSnapshot(), null, 2));
    await writable.close();
    emitAutoSaveStatus({ connected: true, fileName: _autoSaveHandle.name, savedAt: new Date().toISOString() });
  } catch {
    emitAutoSaveStatus({ connected: false, error: true });
  }
}

function scheduleAutoSaveWrite() {
  if (!_autoSaveHandle) return;
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(writeAutoSaveNow, 1200);
}

function downloadBackupNow() {
  const blob = new Blob([JSON.stringify(collectBackupSnapshot(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `liora-academy-backup-${today()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function restoreBackupSnapshot(snapshot) {
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    if (name === "auth") return;
    if (snapshot[name] !== undefined && snapshot[name] !== null) save(key, snapshot[name]);
  });
}

// ─── SHARED SERVER SYNC ─────────────────────────────────────────────────────
//
// The single source of truth is one JSON file living on the server
// (server/api.php + data/state.json). Every device — PC, phone, Apollosign —
// reads and writes through this same endpoint, instead of each device
// keeping its own isolated localStorage copy. localStorage is still used as
// a fast local cache so the UI paints instantly, but the server is what's
// actually authoritative.
//
// SETUP: change API_KEY here to match the one set in server/api.php, and
// change API_URL if the app isn't hosted at school.theflairhub.com.

const API_URL = "https://school.theflairhub.com/server/api.php";
const API_KEY = "xLyCJQWLs3d1mO1nO-Trsl9N5cypncdw4gQaRWI_81Q";
const SERVER_POLL_MS = 25000; // how often devices check for changes made elsewhere
const SERVER_PUSH_DEBOUNCE_MS = 1200;

let _serverPushTimer = null;
let _serverSyncListeners = [];
let _lastServerSavedAt = null; // guards against a poll clobbering a save that's still in flight

function onServerSyncStatusChange(fn) { _serverSyncListeners.push(fn); return () => { _serverSyncListeners = _serverSyncListeners.filter(f => f !== fn); }; }
function emitServerSyncStatus(status) { _serverSyncListeners.forEach(fn => fn(status)); }

async function fetchServerState() {
  try {
    const res = await fetch(`${API_URL}?key=${encodeURIComponent(API_KEY)}`, { headers: { "X-Api-Key": API_KEY } });
    if (!res.ok) { emitServerSyncStatus({ online: false, error: `HTTP ${res.status}` }); return null; }
    const data = await res.json();
    if (data.exists === false) { emitServerSyncStatus({ online: true, empty: true }); return null; }
    emitServerSyncStatus({ online: true, lastSyncedAt: new Date().toISOString(), serverSavedAt: data._serverSavedAt });
    return data;
  } catch (err) {
    emitServerSyncStatus({ online: false, error: "Network error" });
    return null;
  }
}

async function pushServerState(snapshot) {
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": API_KEY },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) { emitServerSyncStatus({ online: false, error: `HTTP ${res.status}` }); return false; }
    const data = await res.json();
    _lastServerSavedAt = data.savedAt;
    emitServerSyncStatus({ online: true, lastSyncedAt: new Date().toISOString(), serverSavedAt: data.savedAt });
    return true;
  } catch (err) {
    emitServerSyncStatus({ online: false, error: "Network error" });
    return false;
  }
}

function scheduleServerPush() {
  clearTimeout(_serverPushTimer);
  _serverPushTimer = setTimeout(() => pushServerState(collectBackupSnapshot()), SERVER_PUSH_DEBOUNCE_MS);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getDayOfWeek() {
  return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

// ─── GENERATE SCHEDULE (recurring weekly pattern + per-day overrides) ────────
//
// `pattern` = [{ subject, days: [0-6] }, ...] — any day of the week, weekends
// included, since the family's schedule is intentionally non-standard.
// `overrides` = { "YYYY-MM-DD": [assignment, ...] | "SKIP" } — a manual edit
// for one specific day. Regenerating from the pattern never touches a date
// that has an override, so hand edits survive a "regenerate" click.

const DEFAULT_PATTERN = [
  { subject: "Math", days: [1, 3, 5] },
  { subject: "Reading", days: [0, 1, 2, 3, 4, 5, 6] },
  { subject: "Writing", days: [2, 4] },
  { subject: "Speaking", days: [2, 4] },
  { subject: "Science", days: [2, 4] },
  { subject: "History", days: [1] },
  { subject: "Civics", days: [3] },
  { subject: "Literature", days: [5] },
  { subject: "Constitution", days: [1] },
];

function generateSchedule(semester, assignments, pattern, overrides = {}, existingSchedule = {}, startDate = null, subjectFilter = null, rescheduleMissed = false, allLog = {}) {
  const semStart = new Date(semester.startDate + "T12:00:00");
  const end = new Date(semester.endDate + "T12:00:00");
  let genStart = startDate ? new Date(startDate + "T12:00:00") : semStart;
  if (genStart < semStart) genStart = semStart;

  const schedule = {};
  // Items pulled out of past, incomplete days to be rescheduled forward, grouped
  // by subject and kept in their original order.
  const recoveredBySubject = {};
  let preservedDays = 0;

  // Preserve every day before the generation start date. If rescheduleMissed
  // is on, pull out anything not done (and matching the subject filter, if
  // any) instead of just copying it forward untouched.
  Object.entries(existingSchedule).forEach(([dateKey, items]) => {
    if (new Date(dateKey + "T12:00:00") >= genStart) return;
    if (!rescheduleMissed) {
      schedule[dateKey] = items;
      preservedDays++;
      return;
    }
    const keep = [];
    items.forEach(a => {
      const isDone = !!allLog[dateKey]?.[a.id]; // truthy for both completed and "skipped" — only truly untouched items get pulled
      const matchesFilter = !subjectFilter || a.subject === subjectFilter;
      if (!isDone && matchesFilter) {
        if (!recoveredBySubject[a.subject]) recoveredBySubject[a.subject] = [];
        recoveredBySubject[a.subject].push(a);
      } else {
        keep.push(a);
      }
    });
    if (keep.length) { schedule[dateKey] = keep; preservedDays++; }
  });

  const recoveredCount = Object.values(recoveredBySubject).reduce((n, arr) => n + arr.length, 0);

  const usedIds = new Set();
  Object.values(schedule).forEach(items => items.forEach(a => usedIds.add(a.id)));
  Object.values(recoveredBySubject).forEach(items => items.forEach(a => usedIds.add(a.id)));

  // Single-subject mode: every OTHER subject's items within the regenerated
  // range get preserved per day too, so regenerating just "Reading" doesn't
  // wipe that day's Math or Science.
  const keptFutureBySubject = {};
  if (subjectFilter) {
    Object.entries(existingSchedule).forEach(([dateKey, items]) => {
      if (new Date(dateKey + "T12:00:00") < genStart) return; // already handled above
      const keep = items.filter(a => a.subject !== subjectFilter);
      if (keep.length) {
        keptFutureBySubject[dateKey] = keep;
        keep.forEach(a => usedIds.add(a.id));
      }
    });
  }

  const subjectsToGenerate = subjectFilter ? [subjectFilter] : Object.keys(assignments);
  const subjectQueues = {};
  subjectsToGenerate.forEach(sub => {
    const recovered = recoveredBySubject[sub] || [];
    const fresh = [...(assignments[sub] || [])]
      .filter(a => !usedIds.has(a.id))
      .sort((a, b) => (a.seq || 0) - (b.seq || 0));
    // Recovered (missed) items go first, in their original order, then continue with unused catalog items.
    subjectQueues[sub] = [...recovered, ...fresh];
  });

  // Hard safety cap — a semester should never realistically span more than a
  // couple of years of days. This guarantees the loop below can never hang
  // indefinitely even if a date somehow ends up malformed.
  const MAX_ITERATIONS = 3000;
  let iterations = 0;
  let newlyFilledDays = 0;
  let hitSafetyCap = false;

  let current = new Date(genStart);
  while (current <= end) {
    iterations++;
    if (iterations > MAX_ITERATIONS) { hitSafetyCap = true; break; }
    const dateKey = current.toISOString().split("T")[0];

    if (overrides[dateKey] !== undefined) {
      // Manual override wins outright — "SKIP" means an intentionally empty day
      if (overrides[dateKey] !== "SKIP") { schedule[dateKey] = overrides[dateKey]; newlyFilledDays++; }
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dow = current.getDay();
    const dayAssignments = subjectFilter ? [...(keptFutureBySubject[dateKey] || [])] : [];
    pattern.forEach(p => {
      if (!p.days.includes(dow)) return;
      if (subjectFilter && p.subject !== subjectFilter) return;
      const queue = subjectQueues[p.subject];
      if (queue && queue.length > 0) dayAssignments.push({ ...queue.shift(), date: dateKey });
    });

    if (dayAssignments.length > 0) { schedule[dateKey] = dayAssignments; newlyFilledDays++; }
    current.setDate(current.getDate() + 1);
  }

  return {
    schedule,
    stats: {
      preservedDays, recoveredCount, newlyFilledDays, hitSafetyCap,
      subjectsRecovered: Object.keys(recoveredBySubject),
    },
  };
}

// A day "counts" for attendance if 1+ scheduled item was completed, OR a field
// trip that day is flagged to count. This is deliberately looser than "every
// item done" (which is still tracked separately as a "fully done" day).
function isAttendedDay(dateKey, schedule, allLog, fieldTrips) {
  const scheduled = schedule[dateKey] || [];
  const anyCompleted = scheduled.some(a => allLog[dateKey]?.[a.id] === true);
  const tripCounts = fieldTrips.some(t => t.date === dateKey && t.countsAttendance);
  return anyCompleted || tripCounts;
}

// ─── ICONS ───────────────────────────────────────────────────────────────────

const Icon = ({ name, size = 20 }) => {
  const icons = {
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    home: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    book: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
    star: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
    tool: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    calendar: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    alert: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
    settings: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    user: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    display: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
    logout: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    skip: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>,
    archive: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>,
  };
  return icons[name] || null;
};

// ─── SUBJECT COLORS ──────────────────────────────────────────────────────────

const SUBJECT_META = {
  Math:         { color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  emoji: "🔢" },
  Reading:      { color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  emoji: "📖" },
  Writing:      { color: "#a78bfa", bg: "rgba(167,139,250,0.15)", emoji: "✏️" },
  Science:      { color: "#34d399", bg: "rgba(52,211,153,0.15)",  emoji: "🔬" },
  History:      { color: "#fb923c", bg: "rgba(251,146,60,0.15)",  emoji: "🏺" },
  Civics:       { color: "#38bdf8", bg: "rgba(56,189,248,0.15)",  emoji: "🏛️" },
  Literature:   { color: "#f472b6", bg: "rgba(244,114,182,0.15)", emoji: "📚" },
  Speaking:     { color: "#2dd4bf", bg: "rgba(45,212,191,0.15)",  emoji: "🗣️" },
  Constitution: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  emoji: "📜" },
};

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }) {
  const [role, setRole] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const PINS = { liora: "1234", admin: "9999" };

  function handleSubmit() {
    if (pin === PINS[role]) {
      onLogin(role);
    } else {
      setError("Incorrect PIN. Try again.");
      setPin("");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Georgia', serif",
    }}>
      <div style={{ textAlign: "center", maxWidth: 420, width: "90%", padding: "0 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🌊</div>
        <h1 style={{ color: "#f59e0b", fontSize: 32, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          Liora's Academy
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 40px", fontStyle: "italic" }}>
          Home School Portal
        </p>

        {!role ? (
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {[
              { key: "liora", label: "Liora", icon: "⭐", desc: "Student" },
              { key: "admin", label: "Joshua", icon: "🔧", desc: "Admin" },
            ].map(r => (
              <button key={r.key} onClick={() => r.key === "liora" ? onLogin("liora") : setRole(r.key)} style={{
                background: "rgba(255,255,255,0.05)", border: "2px solid rgba(245,158,11,0.3)",
                borderRadius: 16, padding: "24px 32px", cursor: "pointer", color: "#f1f5f9",
                transition: "all 0.2s", flex: 1,
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "#f59e0b"; e.currentTarget.style.background = "rgba(245,158,11,0.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
              >
                <div style={{ fontSize: 32 }}>{r.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 18, margin: "8px 0 4px" }}>{r.label}</div>
                <div style={{ color: "#94a3b8", fontSize: 13 }}>{r.desc}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <p style={{ color: "#94a3b8", marginBottom: 16 }}>Enter PIN for <strong style={{ color: "#f59e0b" }}>Joshua</strong></p>
            <input
              type="password" value={pin} onChange={e => { setPin(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="Enter PIN" maxLength={6}
              style={{
                width: "100%", padding: "14px 20px", fontSize: 24, textAlign: "center",
                background: "rgba(255,255,255,0.08)", border: "2px solid rgba(245,158,11,0.4)",
                borderRadius: 12, color: "#f1f5f9", outline: "none", letterSpacing: 8,
                boxSizing: "border-box", marginBottom: 8,
              }}
              autoFocus
            />
            {error && <p style={{ color: "#f87171", fontSize: 13, margin: "4px 0 12px" }}>{error}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button onClick={() => { setRole(null); setPin(""); setError(""); }} style={{
                flex: 1, padding: "12px", background: "transparent", border: "2px solid rgba(148,163,184,0.3)",
                borderRadius: 10, color: "#94a3b8", cursor: "pointer", fontSize: 14,
              }}>Back</button>
              <button onClick={handleSubmit} style={{
                flex: 2, padding: "12px", background: "linear-gradient(135deg, #f59e0b, #d97706)",
                border: "none", borderRadius: 10, color: "#0f172a", cursor: "pointer", fontSize: 16,
                fontWeight: 700,
              }}>Enter</button>
            </div>
            <p style={{ color: "#475569", fontSize: 12, marginTop: 16 }}>
              Default PIN: 9999 — change in Admin settings
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

function ProgressBar({ value, max, color = "#f59e0b", height = 8, showLabel = true }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, height, overflow: "hidden" }}>
        <div style={{
          width: `${pct}%`, height: "100%", background: color, borderRadius: 999,
          transition: "width 0.6s ease",
        }} />
      </div>
      {showLabel && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span style={{ color: "#64748b", fontSize: 12 }}>{value} of {max}</span>
        <span style={{ color, fontSize: 12, fontWeight: 600 }}>{pct}%</span>
      </div>}
    </div>
  );
}

// ─── ASSIGNMENT CARD ──────────────────────────────────────────────────────────

function AssignmentCard({ assignment, completed, onToggle, showDate = false, grade }) {
  const meta = SUBJECT_META[assignment.subject] || { color: "#94a3b8", bg: "rgba(148,163,184,0.15)", emoji: "📝" };
  return (
    <div onClick={onToggle} style={{
      background: completed ? "rgba(34,197,94,0.08)" : meta.bg,
      border: `2px solid ${completed ? "rgba(34,197,94,0.4)" : meta.color + "44"}`,
      borderRadius: 14, padding: "16px 18px", cursor: "pointer",
      transition: "all 0.2s", opacity: completed ? 0.7 : 1,
      display: "flex", alignItems: "flex-start", gap: 14,
    }}
      onMouseEnter={e => !completed && (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{
        width: 28, height: 28, borderRadius: 8, border: `2px solid ${completed ? "#22c55e" : meta.color}`,
        background: completed ? "#22c55e" : "transparent", color: "#ffffff",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2,
        transition: "all 0.2s",
      }}>
        {completed && <Icon name="check" size={18} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13 }}>{meta.emoji}</span>
          <span style={{
            background: meta.color + "33", color: meta.color,
            fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, letterSpacing: 0.5,
          }}>{assignment.subject.toUpperCase()}</span>
          <span style={{ color: "#64748b", fontSize: 11 }}>{assignment.platform}</span>
          {grade && (
            <span style={{
              background: grade.type === "pass_fail" ? (grade.value === "pass" ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)") : "rgba(96,165,250,0.18)",
              color: grade.type === "pass_fail" ? (grade.value === "pass" ? "#34d399" : "#f87171") : "#60a5fa",
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            }}>
              {grade.type === "pass_fail" ? grade.value.toUpperCase() : `${grade.value}/${grade.max}`}
            </span>
          )}
          {showDate && <span style={{ color: "#475569", fontSize: 11, marginLeft: "auto" }}>{assignment.date}</span>}
        </div>
        <div style={{ color: completed ? "#6b7280" : "#f1f5f9", fontWeight: 600, fontSize: 15, marginBottom: 4, textDecoration: completed ? "line-through" : "none" }}>
          {assignment.title}
        </div>
        <div style={{ color: "#94a3b8", fontSize: 13 }}>{assignment.description}</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>⏱ ~{assignment.estMin} min</div>
      </div>
    </div>
  );
}

// ─── DAILY DASHBOARD (STUDENT) ────────────────────────────────────────────────

function DailyDashboard({ schedule, log, onToggle, semester, allLog, skills, skillsCatalog, grades, onSetGrade, fieldTrips }) {
  const todayKey = today();
  const todayAssignments = schedule[todayKey] || [];
  const completedToday = todayAssignments.filter(a => log[a.id]);
  const allDone = todayAssignments.length > 0 && completedToday.length === todayAssignments.length;
  const [gradingAssignment, setGradingAssignment] = useState(null);

  function handleToggleClick(assignment) {
    const isDone = !!log[assignment.id];
    if (!isDone && assignment.gradingType && assignment.gradingType !== "none") {
      setGradingAssignment(assignment);
    } else {
      onToggle(todayKey, assignment.id);
    }
  }

  // Count attended school days (1+ item completed that day, or a counted field trip)
  const completedDays = Object.keys({ ...schedule, ...Object.fromEntries((fieldTrips || []).map(t => [t.date, true])) })
    .filter(d => isAttendedDay(d, schedule, allLog, fieldTrips || [])).length;

  // Life skills total
  const allSkillIds = Object.values(skillsCatalog).flat().map(s => s.id);
  const totalSkills = allSkillIds.length;
  const completedSkills = allSkillIds.filter(id => skills[id]).length;

  // Streak
  let streak = 0;
  let checkDate = new Date(todayKey);
  checkDate.setDate(checkDate.getDate() - 1);
  while (true) {
    const dk = checkDate.toISOString().split("T")[0];
    const sched = schedule[dk] || [];
    if (sched.length === 0) { checkDate.setDate(checkDate.getDate() - 1); continue; }
    if (sched.every(a => allLog[dk]?.[a.id])) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
    else break;
    if (streak > 30) break;
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 4 }}>
          {getDayOfWeek()} · {formatDate(todayKey)}
        </div>
        <h2 style={{ color: "#f1f5f9", fontSize: 28, fontWeight: 700, margin: 0 }}>
          {allDone ? "🎉 All done today!" : `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, Liora!`}
        </h2>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Days Attended", value: completedDays, max: semester.targetDays, color: "#f59e0b", icon: "📅" },
          { label: "Skills Learned", value: completedSkills, max: totalSkills, color: "#34d399", icon: "⭐" },
          { label: "Day Streak", value: streak, max: 10, color: "#a78bfa", icon: "🔥", noMax: true },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "14px 16px",
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.value}{s.noMax ? "" : ""}</div>
            <div style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>{s.label}</div>
            {!s.noMax && <ProgressBar value={s.value} max={s.max} color={s.color} height={4} showLabel={false} />}
          </div>
        ))}
      </div>

      {/* Today's assignments */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Today's Work
        </h3>
        {todayAssignments.length === 0 ? (
          <div style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: 24, textAlign: "center", color: "#64748b",
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌤</div>
            <div>No assignments scheduled today. Enjoy the day!</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {todayAssignments.map(a => (
              <AssignmentCard
                key={a.id}
                assignment={a}
                completed={!!log[a.id]}
                grade={grades[todayKey]?.[a.id]}
                onToggle={() => handleToggleClick(a)}
              />
            ))}
          </div>
        )}
      </div>

      {allDone && todayAssignments.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(52,211,153,0.1))",
          border: "2px solid rgba(34,197,94,0.4)", borderRadius: 16, padding: 20, textAlign: "center",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
          <div style={{ color: "#34d399", fontWeight: 700, fontSize: 18 }}>Today's work is done!</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>Great job. Go do something fun.</div>
        </div>
      )}

      {gradingAssignment && (
        <GradeEntryModal
          assignment={gradingAssignment}
          onSubmit={grade => {
            onToggle(todayKey, gradingAssignment.id);
            onSetGrade(todayKey, gradingAssignment.id, grade);
            setGradingAssignment(null);
          }}
          onSkip={() => {
            onToggle(todayKey, gradingAssignment.id);
            setGradingAssignment(null);
          }}
          onClose={() => setGradingAssignment(null)}
        />
      )}
    </div>
  );
}

// ─── LIFE SKILLS BOARD ─────────────────────────────────────────────────────────

function LifeSkillsBoard({ skills, onToggle, catalog }) {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 20px" }}>
      <h2 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, marginBottom: 6 }}>Life Skills</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
        The stuff school doesn't teach. Check them off as you learn them.
      </p>

      {Object.entries(catalog).map(([category, items]) => {
        const done = items.filter(i => skills[i.id]).length;
        const catColors = {
          "Kitchen & Home": "#f59e0b",
          "Financial Literacy": "#34d399",
          "Auto & Mechanical": "#60a5fa",
          "Trade & Handyman": "#fb923c",
          "Health & Wellness": "#f472b6",
          "Digital & Life Admin": "#a78bfa",
        };
        const color = catColors[category] || "#94a3b8";
        return (
          <div key={category} style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <h3 style={{ color, fontSize: 15, fontWeight: 700, margin: 0 }}>{category}</h3>
              <span style={{ color: "#475569", fontSize: 13 }}>{done}/{items.length}</span>
              <div style={{ flex: 1 }}>
                <ProgressBar value={done} max={items.length} color={color} height={4} showLabel={false} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {items.map(item => (
                <div key={item.id} onClick={() => onToggle(item.id)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                  background: skills[item.id] ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${skills[item.id] ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                  borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${skills[item.id] ? "#22c55e" : color + "66"}`,
                    background: skills[item.id] ? "#22c55e" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {skills[item.id] && <Icon name="check" size={13} />}
                  </div>
                  <span style={{
                    color: skills[item.id] ? "#6b7280" : "#d1d5db", fontSize: 14,
                    textDecoration: skills[item.id] ? "line-through" : "none",
                  }}>{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── WEEKLY ROUNDUP ───────────────────────────────────────────────────────────

function WeeklyRoundup({ schedule, allLog, fieldTrips, skills, skillsCatalog }) {
  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay();
  const startOfWeek = new Date(todayDate);
  startOfWeek.setDate(todayDate.getDate() - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const weekAssignments = weekDays.flatMap(d => (schedule[d] || []).map(a => ({ ...a, date: d })));
  const completed = weekAssignments.filter(a => allLog[a.date]?.[a.id]);
  const missed = weekAssignments.filter(a => !allLog[a.date]?.[a.id] && a.date < today());
  const weekTrips = fieldTrips.filter(t => weekDays.includes(t.date));
  const weekSkills = Object.values(skillsCatalog).flat().filter(s => skills[s.id] && skills[s.id + "_date"] && weekDays.includes(skills[s.id + "_date"]));

  const bySubject = {};
  completed.forEach(a => { bySubject[a.subject] = (bySubject[a.subject] || 0) + 1; });

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
      <h2 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Weekly Roundup</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
        Week of {formatDate(weekDays[0])}
      </p>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Assignments Done", value: completed.length, total: weekAssignments.length, color: "#34d399", icon: "✅" },
          { label: "Missed", value: missed.length, color: "#f87171", icon: "⚠️" },
          { label: "Field Trips", value: weekTrips.length, color: "#60a5fa", icon: "🚌" },
          { label: "Skills Checked Off", value: weekSkills.length, color: "#f59e0b", icon: "⭐" },
        ].map(s => (
          <div key={s.label} style={{
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "16px 18px",
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 700 }}>
              {s.value}{s.total !== undefined ? <span style={{ color: "#475569", fontSize: 16, fontWeight: 400 }}>/{s.total}</span> : ""}
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* By subject */}
      {Object.keys(bySubject).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            Completed by Subject
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(bySubject).map(([sub, count]) => {
              const meta = SUBJECT_META[sub] || { color: "#94a3b8", emoji: "📝" };
              return (
                <div key={sub} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                  background: meta.bg || "rgba(255,255,255,0.04)", borderRadius: 10,
                }}>
                  <span>{meta.emoji}</span>
                  <span style={{ color: "#d1d5db", flex: 1, fontSize: 14 }}>{sub}</span>
                  <span style={{ color: meta.color, fontWeight: 700 }}>{count} done</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Field trips */}
      {weekTrips.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: "#94a3b8", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            Field Trips
          </h3>
          {weekTrips.map((t, i) => (
            <div key={i} style={{
              background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 8,
            }}>
              <div style={{ color: "#60a5fa", fontWeight: 600, fontSize: 14 }}>🚌 {t.place}</div>
              <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{t.subjects}</div>
              <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>{t.date}</div>
            </div>
          ))}
        </div>
      )}

      {missed.length > 0 && (
        <div>
          <h3 style={{ color: "#f87171", fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
            Missed This Week
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {missed.map(a => (
              <div key={a.id + a.date} style={{
                display: "flex", gap: 12, padding: "10px 14px",
                background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.2)",
                borderRadius: 10,
              }}>
                <span style={{ color: "#f87171", fontSize: 13, flex: 1 }}>{a.subject} — {a.title}</span>
                <span style={{ color: "#475569", fontSize: 12 }}>{a.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MISSED QUEUE ─────────────────────────────────────────────────────────────

function MissedQueue({ schedule, allLog, onReschedule, onComplete, onSkip }) {
  const todayKey = today();
  const [actionDates, setActionDates] = useState({});
  const [confirmComplete, setConfirmComplete] = useState(null); // { assignment, date }

  const missed = [];
  Object.entries(schedule).forEach(([date, assignments]) => {
    if (date >= todayKey) return;
    assignments.forEach(a => {
      if (!allLog[date]?.[a.id]) missed.push({ ...a, originalDate: date });
    });
  });

  function getActionDate(a) {
    return actionDates[a.id + a.originalDate] || todayKey;
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
      <h2 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Missed Queue</h2>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 24 }}>
        {missed.length === 0 ? "All caught up!" : `${missed.length} item${missed.length !== 1 ? "s" : ""} to review`}
      </p>

      {/* Mark Complete confirmation dialog */}
      {confirmComplete && (
        <div onClick={e => e.target === e.currentTarget && setConfirmComplete(null)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 300,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div style={{
            background: "#1e293b", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 16, padding: 28, maxWidth: 400, width: "100%",
          }}>
            <div style={{ fontSize: 28, marginBottom: 12, textAlign: "center" }}>✅</div>
            <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 17, marginBottom: 8, textAlign: "center" }}>
              Mark as Completed?
            </div>
            <div style={{ color: "#94a3b8", fontSize: 14, marginBottom: 6, textAlign: "center" }}>
              <strong style={{ color: "#f1f5f9" }}>{confirmComplete.assignment.title}</strong>
            </div>
            <div style={{
              color: "#64748b", fontSize: 13, textAlign: "center", marginBottom: 20,
              background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 12px",
            }}>
              This will be recorded as completed on{" "}
              <strong style={{ color: "#34d399" }}>{confirmComplete.date}</strong>.
              It will be removed from the missed queue and counted toward attendance.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmComplete(null)} style={{
                flex: 1, padding: "10px", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                color: "#94a3b8", cursor: "pointer", fontSize: 14,
              }}>Cancel</button>
              <button onClick={() => { onComplete(confirmComplete.assignment, confirmComplete.date); setConfirmComplete(null); }} style={{
                flex: 1, padding: "10px", background: "rgba(52,211,153,0.15)",
                border: "1px solid rgba(52,211,153,0.35)", borderRadius: 8,
                color: "#34d399", cursor: "pointer", fontSize: 14, fontWeight: 700,
              }}>Yes, Mark Complete</button>
            </div>
          </div>
        </div>
      )}

      {missed.length === 0 ? (
        <div style={{
          background: "rgba(34,197,94,0.08)", border: "2px solid rgba(34,197,94,0.3)",
          borderRadius: 16, padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <div style={{ color: "#34d399", fontWeight: 700, fontSize: 18 }}>All caught up!</div>
          <div style={{ color: "#6b7280", fontSize: 14, marginTop: 4 }}>Nothing in the missed queue.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {missed.map(a => {
            const meta = SUBJECT_META[a.subject] || { color: "#94a3b8", bg: "rgba(148,163,184,0.15)" };
            const actionDate = getActionDate(a);
            return (
              <div key={a.id + a.originalDate} style={{
                background: meta.bg, border: `1px solid ${meta.color}44`,
                borderRadius: 14, padding: "16px 18px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 15 }}>{a.title}</div>
                  <div style={{ color: "#f87171", fontSize: 12 }}>Missed {a.originalDate}</div>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 12 }}>{a.subject} · {a.platform}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    type="date"
                    value={actionDate}
                    onChange={e => setActionDates({ ...actionDates, [a.id + a.originalDate]: e.target.value })}
                    style={{
                      padding: "8px 10px", background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8,
                      color: "#f1f5f9", fontSize: 13, outline: "none",
                    }}
                  />
                  <button onClick={() => onReschedule(a, actionDate)} style={{
                    flex: 1, minWidth: 90, padding: "8px", background: meta.color + "22",
                    border: `1px solid ${meta.color}44`, borderRadius: 8,
                    color: meta.color, cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }}>📅 Reassign</button>
                  <button onClick={() => setConfirmComplete({ assignment: a, date: actionDate })} style={{
                    flex: 1, minWidth: 90, padding: "8px", background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.3)", borderRadius: 8,
                    color: "#34d399", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  }}>✅ Complete</button>
                  <button onClick={() => onSkip(a)} style={{
                    padding: "8px 14px", background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.2)", borderRadius: 8,
                    color: "#f87171", cursor: "pointer", fontSize: 13,
                  }}>Skip</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SHARED ADMIN UI PIECES ───────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      backdropFilter: "blur(2px)",
    }}>
      <div style={{
        background: "#0f1729", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16,
        padding: 22, width: "100%", maxWidth: 440, maxHeight: "85vh", overflowY: "auto",
      }}>
        <h3 style={{ fontSize: 17, margin: "0 0 4px", color: "#f1f5f9" }}>{title}</h3>
        {subtitle && <p style={{ color: "#64748b", fontSize: 12, margin: "0 0 14px" }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.14)", borderRadius: 8, color: "#f1f5f9",
  fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

function AdminBtn({ children, onClick, variant = "amber", style = {}, disabled }) {
  const variants = {
    amber: { background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#0f172a", fontWeight: 700 },
    ghost: { background: "rgba(255,255,255,0.06)", color: "#94a3b8" },
    outline: { background: "transparent", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.15)" },
    danger: { background: "rgba(248,113,113,0.12)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1, ...variants[variant], ...style,
    }}>{children}</button>
  );
}

// ─── REQUIRED SUBJECT COVERAGE WIDGET ─────────────────────────────────────────

function RequiredCoverageWidget({ schedule, allLog }) {
  const allScheduled = Object.values(schedule).flat();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {REQUIRED_SUBJECTS.map(sub => {
        const items = allScheduled.filter(a => a.subject === sub);
        const done = items.filter(a => allLog[a.date]?.[a.id]).length;
        const scheduled = items.length;
        const ok = done > 0;
        const noneQueued = scheduled === 0;
        const color = ok ? "#34d399" : noneQueued ? "#f87171" : "#f59e0b";
        const bg = ok ? "rgba(52,211,153,0.15)" : noneQueued ? "rgba(248,113,113,0.12)" : "rgba(245,158,11,0.12)";
        return (
          <span key={sub} style={{
            background: bg, color, padding: "6px 11px", borderRadius: 999, fontSize: 11.5,
            display: "inline-flex", gap: 6, alignItems: "center",
          }}>
            <strong>{sub}</strong>
            <span style={{ opacity: 0.85 }}>{done} done · {scheduled} on calendar</span>
          </span>
        );
      })}
    </div>
  );
}

// ─── EVALUATION REMINDER BANNER (persistent, date-gated) ──────────────────────

function EvaluationBanner({ evaluation, onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  if (!evaluation || evaluation.status === "completed") return null;

  const showFrom = new Date(evaluation.showFrom + "T00:00:00");
  const now = new Date();
  if (now < showFrom) return null;

  return (
    <>
      <div style={{
        background: "rgba(244,114,182,0.1)", borderBottom: "1px solid rgba(244,114,182,0.35)",
        padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>📌</span>
          <span style={{ fontSize: 13, color: "#f472b6" }}>
            <strong>{evaluation.label || "Required Evaluation"}</strong> — due by {evaluation.dueDate}. Stays pinned until marked scheduled or complete.
          </span>
        </div>
        <AdminBtn variant="outline" style={{ borderColor: "rgba(244,114,182,0.4)", color: "#f472b6", flexShrink: 0 }} onClick={() => setShowModal(true)}>
          Mark scheduled / complete
        </AdminBtn>
      </div>
      {showModal && (
        <Modal title={evaluation.label || "Required Evaluation"} onClose={() => setShowModal(false)}>
          <Field label="Status">
            <select defaultValue={evaluation.status} id="evalStatusSelect" style={inputStyle}>
              <option value="pending">Not yet scheduled</option>
              <option value="scheduled">Scheduled — evaluator/test date set</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <AdminBtn variant="ghost" onClick={() => setShowModal(false)}>Cancel</AdminBtn>
            <AdminBtn onClick={() => {
              const status = document.getElementById("evalStatusSelect").value;
              onUpdate({ ...evaluation, status });
              setShowModal(false);
            }}>Save</AdminBtn>
          </div>
        </Modal>
      )}
    </>
  );
}

// ─── PATTERN EDITOR (recurring weekly schedule) ───────────────────────────────

const DOW_LETTER = ["S", "M", "T", "W", "T", "F", "S"];
const DOW_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function PatternEditor({ pattern, onUpdatePattern, coursesCatalog }) {
  function toggleDay(subject, day) {
    const next = pattern.map(p => {
      if (p.subject !== subject) return p;
      const days = p.days.includes(day) ? p.days.filter(d => d !== day) : [...p.days, day];
      return { ...p, days };
    });
    onUpdatePattern(next);
  }
  function addSubjectRow() {
    const unused = Object.keys(coursesCatalog).find(s => !pattern.some(p => p.subject === s));
    if (!unused) return;
    onUpdatePattern([...pattern, { subject: unused, days: [] }]);
  }
  function removeRow(subject) {
    onUpdatePattern(pattern.filter(p => p.subject !== subject));
  }

  return (
    <div>
      {pattern.map(p => {
        const meta = SUBJECT_META[p.subject] || { color: "#94a3b8" };
        return (
          <div key={p.subject} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", gap: 10, flexWrap: "wrap",
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: meta.color, minWidth: 90 }}>{p.subject}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[0, 1, 2, 3, 4, 5, 6].map(d => (
                <div key={d} onClick={() => toggleDay(p.subject, d)} style={{
                  width: 30, height: 30, borderRadius: 8, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700,
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: p.days.includes(d) ? "#f59e0b" : "rgba(255,255,255,0.04)",
                  color: p.days.includes(d) ? "#0f172a" : "#94a3b8",
                }}>{DOW_LETTER[d]}</div>
              ))}
            </div>
            <button onClick={() => removeRow(p.subject)} style={{
              width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer", fontSize: 12,
            }}>✕</button>
          </div>
        );
      })}
      <AdminBtn variant="ghost" style={{ marginTop: 10 }} onClick={addSubjectRow}>+ Add subject to pattern</AdminBtn>
    </div>
  );
}

// ─── SCHEDULE CALENDAR (Month / Week / Day) ───────────────────────────────────

function ScheduleCalendar({ schedule, overrides, onDayClick, allLog }) {
  const [calView, setCalView] = useState("month");
  const [anchor, setAnchor] = useState(new Date());
  const todayKey = today();

  function nav(dir) {
    const d = new Date(anchor);
    if (calView === "month") d.setMonth(d.getMonth() + dir);
    else if (calView === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setAnchor(d);
  }
  function dateKeyOf(d) { return d.toISOString().split("T")[0]; }
  function itemsFor(dateKey) { return schedule[dateKey] || []; }

  // Returns completion state for a past day: "all" | "partial" | "missed" | null (future/no items)
  function dayState(dk, items) {
    if (!items.length || dk > todayKey) return null;
    const log = allLog?.[dk] || {};
    const doneCount = items.filter(a => log[a.id] === true).length;
    if (doneCount === items.length) return "all";
    if (doneCount > 0) return "partial";
    return "missed";
  }

  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>
          {calView === "month" && `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`}
          {calView === "week" && `Week of ${MONTHS[anchor.getMonth()]} ${anchor.getDate() - anchor.getDay()}`}
          {calView === "day" && `${DOW_FULL[anchor.getDay()]}, ${MONTHS[anchor.getMonth()]} ${anchor.getDate()}`}
          <span style={{ color: "#64748b", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>— click a day to edit</span>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["month", "week", "day"].map(v => (
            <button key={v} onClick={() => setCalView(v)} style={{
              padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
              background: calView === v ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.06)",
              color: calView === v ? "#0f172a" : "#94a3b8", fontWeight: calView === v ? 700 : 400,
            }}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
          <button onClick={() => nav(-1)} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>‹</button>
          <button onClick={() => nav(1)} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>›</button>
        </div>
      </div>

      {calView === "month" && (() => {
        const y = anchor.getFullYear(), m = anchor.getMonth();
        const firstDow = new Date(y, m, 1).getDay();
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        const cells = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {DOW_LETTER.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#475569", paddingBottom: 4 }}>{d}</div>)}
            {cells.map((day, i) => {
              if (!day) return <div key={i} style={{ visibility: "hidden" }} />;
              const dk = dateKeyOf(new Date(y, m, day));
              const items = itemsFor(dk);
              const isOverride = overrides[dk] !== undefined;
              const isToday = dk === todayKey;
              const state = dayState(dk, items);

              // Background and border based on completion state
              let bg = "rgba(255,255,255,0.03)";
              let borderColor = isOverride ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.06)";
              if (isToday) borderColor = "rgba(245,158,11,0.7)";
              if (state === "all") bg = "rgba(52,211,153,0.10)";
              else if (state === "partial") bg = "rgba(245,158,11,0.08)";
              else if (state === "missed") borderColor = isOverride ? "rgba(167,139,250,0.6)" : "rgba(248,113,113,0.65)";

              return (
                <div key={i} onClick={() => onDayClick(dk)} style={{
                  aspectRatio: "1", borderRadius: 8, cursor: "pointer",
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  fontSize: 12,
                  color: state === "all" ? "#34d399" : state === "missed" ? "#f87171" : "#94a3b8",
                  position: "relative",
                }}>
                  <span style={{ fontWeight: isToday ? 700 : 400 }}>{day}</span>
                  {items.length > 0 && (
                    <span style={{ display: "flex", gap: 3, flexWrap: "wrap", justifyContent: "center", maxWidth: "80%" }}>
                      {items.slice(0, 5).map((it, idx) => {
                        const color = (SUBJECT_META[it.subject] || {}).color || "#94a3b8";
                        const done = allLog?.[dk]?.[it.id] === true;
                        return (
                          <span key={idx} style={{
                            width: 12, height: 12, borderRadius: 3,
                            background: done ? color : color + "55",
                            border: `1px solid ${color}`,
                            opacity: done ? 1 : 0.75,
                          }} />
                        );
                      })}
                    </span>
                  )}
                  {state === "missed" && (
                    <span style={{ position: "absolute", top: 2, right: 3, fontSize: 8, color: "#f87171" }}>✕</span>
                  )}
                  {state === "all" && (
                    <span style={{ position: "absolute", top: 2, right: 3, fontSize: 8, color: "#34d399" }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {calView === "week" && (() => {
        const start = new Date(anchor);
        start.setDate(start.getDate() - start.getDay());
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date(start); d.setDate(start.getDate() + i);
              const dk = dateKeyOf(d);
              const items = itemsFor(dk);
              const isToday = dk === todayKey;
              const state = dayState(dk, items);
              let borderColor = isToday ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.06)";
              if (state === "missed") borderColor = "rgba(248,113,113,0.5)";
              let bg = isToday ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)";
              if (state === "all") bg = "rgba(52,211,153,0.07)";
              else if (state === "partial") bg = "rgba(245,158,11,0.06)";
              return (
                <div key={i} onClick={() => onDayClick(dk)} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                  background: bg, border: `1px solid ${borderColor}`,
                }}>
                  <div style={{ width: 64, flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: "#64748b" }}>{DOW_FULL[i].toUpperCase()}</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: state === "all" ? "#34d399" : state === "missed" ? "#f87171" : "#f1f5f9" }}>{d.getDate()}</div>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {items.length ? items.map((it, idx) => {
                      const meta = SUBJECT_META[it.subject] || { color: "#94a3b8" };
                      const done = allLog?.[dk]?.[it.id] === true;
                      return (
                        <span key={idx} style={{
                          background: done ? meta.color + "33" : meta.color + "15",
                          color: done ? meta.color : meta.color + "bb",
                          fontSize: 11, padding: "3px 8px", borderRadius: 999,
                          textDecoration: done ? "line-through" : "none",
                          opacity: done ? 0.8 : 1,
                        }}>{done ? "✓ " : ""}{it.subject}</span>
                      );
                    }) : <span style={{ color: "#475569", fontSize: 12 }}>Open day</span>}
                  </div>
                  {state === "all" && <span style={{ color: "#34d399", fontSize: 12, flexShrink: 0 }}>✓ Done</span>}
                  {state === "missed" && <span style={{ color: "#f87171", fontSize: 11, flexShrink: 0 }}>Missed</span>}
                  {state === "partial" && <span style={{ color: "#f59e0b", fontSize: 11, flexShrink: 0 }}>Partial</span>}
                </div>
              );
            })}
          </div>
        );
      })()}

      {calView === "day" && (() => {
        const dk = dateKeyOf(anchor);
        const items = itemsFor(dk);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.length ? items.map((it, idx) => {
              const meta = SUBJECT_META[it.subject] || { color: "#94a3b8" };
              const done = allLog?.[dk]?.[it.id] === true;
              return (
                <div key={idx} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                  background: done ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${done ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 10, opacity: done ? 0.75 : 1,
                }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: done ? meta.color : meta.color + "55", border: `1px solid ${meta.color}`, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, flex: 1, textDecoration: done ? "line-through" : "none", color: done ? "#64748b" : "#f1f5f9" }}>{it.subject} — {it.title}</span>
                  {done && <span style={{ color: "#34d399", fontSize: 12 }}>✓</span>}
                </div>
              );
            }) : (
              <div style={{ textAlign: "center", padding: 24, color: "#64748b", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>Nothing scheduled — open day</div>
            )}
            <AdminBtn variant="ghost" style={{ alignSelf: "flex-start" }} onClick={() => onDayClick(dk)}>+ Edit this day</AdminBtn>
          </div>
        );
      })()}
    </div>
  );
}

// ─── DAY OVERRIDE EDITOR ───────────────────────────────────────────────────────

function DayOverrideModal({ dateKey, schedule, coursesCatalog, onSetOverride, onClose }) {
  const current = schedule[dateKey] || [];
  const [items, setItems] = useState(current);
  const [addSubject, setAddSubject] = useState(Object.keys(coursesCatalog)[0] || "");
  const [addLessonId, setAddLessonId] = useState("");

  function addItem() {
    const lesson = (coursesCatalog[addSubject] || []).find(l => l.id === addLessonId);
    if (!lesson) return;
    setItems([...items, { ...lesson, date: dateKey }]);
  }
  function removeItem(idx) { setItems(items.filter((_, i) => i !== idx)); }
  function save() { onSetOverride(dateKey, items.length ? items : "SKIP"); onClose(); }

  const d = new Date(dateKey + "T12:00:00");
  const label = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <Modal title={label} subtitle="Add, remove, or replace items just for this day — the recurring pattern stays untouched." onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        {items.length === 0 && <div style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>No items for this day.</div>}
        {items.map((it, idx) => {
          const meta = SUBJECT_META[it.subject] || { color: "#94a3b8" };
          return (
            <div key={idx} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "8px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 8, marginBottom: 6,
            }}>
              <span style={{ fontSize: 13, color: meta.color }}>{it.subject}: {it.title}</span>
              <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 13 }}>✕</button>
            </div>
          );
        })}
      </div>
      <Field label="Add a lesson to this day">
        <select value={addSubject} onChange={e => { setAddSubject(e.target.value); setAddLessonId(""); }} style={{ ...inputStyle, marginBottom: 8 }}>
          {Object.keys(coursesCatalog).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={addLessonId} onChange={e => setAddLessonId(e.target.value)} style={inputStyle}>
          <option value="">Choose a lesson...</option>
          {(coursesCatalog[addSubject] || []).map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      </Field>
      <AdminBtn variant="ghost" style={{ marginBottom: 16 }} onClick={addItem} disabled={!addLessonId}>+ Add to day</AdminBtn>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <AdminBtn variant="ghost" onClick={onClose}>Cancel</AdminBtn>
        <AdminBtn variant="danger" onClick={() => { onSetOverride(dateKey, "SKIP"); onClose(); }}>Clear day</AdminBtn>
        <AdminBtn onClick={save}>Save</AdminBtn>
      </div>
    </Modal>
  );
}

// ─── COURSE MANAGER (Courses & Subjects) ──────────────────────────────────────

function CourseManager({ coursesCatalog, onUpdateCatalog, onRemoveFromSchedule, schedule, allLog }) {
  const [openSubject, setOpenSubject] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [sortBy, setSortBy] = useState("seq");
  const [editing, setEditing] = useState(null); // { subject, id } or { subject, id: null } for new
  const [showImport, setShowImport] = useState(false);
  const todayKey = today();

  // For each lesson ID, derive its best status across all schedule dates
  // Priority: completed > assigned (future) > missed (past, not done) > unassigned
  function getLessonStatus(lessonId) {
    let bestStatus = "unassigned";
    let bestDate = null;
    Object.entries(schedule || {}).forEach(([date, assignments]) => {
      if (!assignments.some(a => a.id === lessonId)) return;
      const done = allLog?.[date]?.[lessonId] === true;
      if (done) {
        bestStatus = "completed"; bestDate = date;
      } else if (bestStatus !== "completed") {
        if (date >= todayKey) {
          if (bestStatus !== "assigned") { bestStatus = "assigned"; bestDate = date; }
          else if (date < bestDate) bestDate = date; // show earliest future date
        } else {
          if (bestStatus === "unassigned") { bestStatus = "missed"; bestDate = date; }
        }
      }
    });
    return { status: bestStatus, date: bestDate };
  }

  function addSubject() {
    const name = prompt("New elective subject name:");
    if (!name || coursesCatalog[name]) return;
    onUpdateCatalog({ ...coursesCatalog, [name]: [] });
  }
  function saveLesson(subject, id, data) {
    const next = { ...coursesCatalog };
    if (id) next[subject] = next[subject].map(l => l.id === id ? { ...l, ...data } : l);
    else next[subject] = [...next[subject], { id: "c" + Date.now(), subject, seq: next[subject].length + 1, ...data }];
    onUpdateCatalog(next);
    setEditing(null);
  }
  function deleteLesson(subject, id) {
    onUpdateCatalog({ ...coursesCatalog, [subject]: coursesCatalog[subject].filter(l => l.id !== id) });
    onRemoveFromSchedule(subject, id);
  }
  function removeDuplicates() {
    const next = { ...coursesCatalog };
    let removedCount = 0;
    const removedIds = []; // { subject, id }
    Object.keys(next).forEach(subject => {
      const seen = new Set();
      const kept = [];
      (next[subject] || []).forEach(l => {
        const key = `${(l.title || "").trim().toLowerCase()}|${(l.platform || "").trim().toLowerCase()}`;
        if (seen.has(key)) {
          removedCount++;
          removedIds.push({ subject, id: l.id });
        } else {
          seen.add(key);
          kept.push(l);
        }
      });
      next[subject] = kept.map((l, i) => ({ ...l, seq: i + 1 }));
    });
    if (removedCount === 0) {
      alert("No duplicate lessons found — nothing to clean up.");
      return;
    }
    if (!confirm(`Found ${removedCount} duplicate lesson${removedCount !== 1 ? "s" : ""} (same title + platform within a subject). Remove them and re-sequence? This also clears them from any day they're already scheduled on.`)) return;
    onUpdateCatalog(next);
    removedIds.forEach(({ subject, id }) => onRemoveFromSchedule(subject, id));
    alert(`Removed ${removedCount} duplicate lesson${removedCount !== 1 ? "s" : ""}.`);
  }
  function importRows(rows) {
    const next = { ...coursesCatalog };
    let count = 0;
    let skipped = 0;
    // Seed a "seen" set per subject from lessons already in the catalog (title+platform,
    // case-insensitive) so re-uploading the same file — or a file that overlaps with
    // existing lessons — doesn't create duplicates.
    const seen = {};
    Object.keys(next).forEach(subject => {
      seen[subject] = new Set(
        (next[subject] || []).map(l => `${(l.title || "").trim().toLowerCase()}|${(l.platform || "").trim().toLowerCase()}`)
      );
    });
    rows.forEach(r => {
      const subject = (r.subject || r.Subject || "").trim();
      const title = (r.title || r.Title || "").trim();
      if (!subject || !title) return;
      const platform = (r.platform || r.Platform || "").trim();
      const key = `${title.toLowerCase()}|${platform.toLowerCase()}`;
      if (!seen[subject]) seen[subject] = new Set();
      if (seen[subject].has(key)) { skipped++; return; }
      seen[subject].add(key);
      if (!next[subject]) next[subject] = [];
      next[subject] = [...next[subject], {
        id: "c" + Date.now() + Math.random().toString(36).slice(2, 6),
        subject, title,
        platform,
        description: (r.description || r.Description || "").trim(),
        level: (r.level || r.Level || r["grade level"] || r["Grade Level"] || "").trim(),
        estMin: Number(r.minutes || r.Minutes || r["est. minutes"] || r["Est. Minutes"] || 20) || 20,
        seq: next[subject].length + 1,
      }];
      count++;
    });
    onUpdateCatalog(next);
    return { count, skipped };
  }

  if (openSubject) {
    let items = [...(coursesCatalog[openSubject] || [])];
    if (filterText) items = items.filter(i => i.title.toLowerCase().includes(filterText.toLowerCase()));
    if (sortBy === "title") items.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "level") items.sort((a, b) => (a.level || "").localeCompare(b.level || ""));
    const meta = SUBJECT_META[openSubject] || { color: "#94a3b8", emoji: "📘" };
    return (
      <div>
        <div onClick={() => setOpenSubject(null)} style={{ color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 14 }}>← Courses & Subjects</div>
        <h3 style={{ color: meta.color, fontSize: 20, marginBottom: 4 }}>{meta.emoji} {openSubject}</h3>
        <p style={{ color: "#64748b", fontSize: 13, marginBottom: 14 }}>{coursesCatalog[openSubject].length} lessons</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <input placeholder="Search lessons..." value={filterText} onChange={e => setFilterText(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="seq">Sort: Sequence</option>
            <option value="title">Sort: Title A–Z</option>
            <option value="level">Sort: Grade level</option>
          </select>
          <AdminBtn onClick={() => setEditing({ subject: openSubject, id: null })}>+ Add lesson</AdminBtn>
        </div>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#64748b" }}>No lessons match.</div>
        ) : items.map(item => {
          const { status, date } = getLessonStatus(item.id);
          const statusConfig = {
            completed: { label: "✅ Completed", color: "#34d399", bg: "rgba(52,211,153,0.12)" },
            assigned:  { label: "📅 Assigned",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
            missed:    { label: "⚠️ Missed",    color: "#f87171", bg: "rgba(248,113,113,0.12)" },
            unassigned:{ label: "— Not assigned", color: "#475569", bg: "rgba(255,255,255,0.04)" },
          };
          const sc = statusConfig[status];
          return (
            <div key={item.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
              padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, marginBottom: 6,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{item.platform} · {item.level} · ~{item.estMin} min</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                  background: sc.bg, color: sc.color, whiteSpace: "nowrap",
                }}>
                  {sc.label}{date ? ` · ${date}` : ""}
                </span>
                <button onClick={() => setEditing({ subject: openSubject, id: item.id })} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✎</button>
                <button onClick={() => deleteLesson(openSubject, item.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✕</button>
              </div>
            </div>
          );
        })}
        {editing && (
          <LessonEditModal
            subject={editing.subject}
            lesson={editing.id ? coursesCatalog[editing.subject].find(l => l.id === editing.id) : null}
            onSave={data => saveLesson(editing.subject, editing.id, data)}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 20, marginBottom: 4 }}>Courses & Subjects</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{Object.keys(coursesCatalog).length} subjects · all 9 Colorado-required subjects are pre-loaded · click one to manage its lessons</p>
      {Object.entries(coursesCatalog).map(([subject, items]) => {
        const meta = SUBJECT_META[subject] || { color: "#94a3b8", emoji: "📘" };
        const required = REQUIRED_SUBJECTS.includes(subject);
        const isSpeaking = subject === "Speaking";
        return (
          <div key={subject} onClick={() => setOpenSubject(subject)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 14, padding: "16px 18px", marginBottom: 8, cursor: "pointer",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 24 }}>{meta.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: meta.color, display: "flex", alignItems: "center", gap: 6 }}>
                  {subject}
                  {required && <span style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 10, padding: "2px 7px", borderRadius: 999 }}>REQUIRED</span>}
                </div>
                <div style={{ color: "#64748b", fontSize: 12 }}>{isSpeaking ? "Activity-based — no fixed lessons needed" : `${items.length} lessons loaded`}</div>
              </div>
            </div>
            <span style={{ color: "#475569" }}>›</span>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <AdminBtn variant="ghost" onClick={addSubject}>+ Add elective subject</AdminBtn>
        <AdminBtn onClick={() => setShowImport(true)}>⬆ Bulk import from spreadsheet</AdminBtn>
        <AdminBtn variant="outline" onClick={removeDuplicates}>🧹 Remove duplicate lessons</AdminBtn>
      </div>
      {showImport && <BulkImportModal onImport={importRows} onClose={() => setShowImport(false)} />}
    </div>
  );
}

function LessonEditModal({ subject, lesson, onSave, onClose }) {
  const [form, setForm] = useState(lesson || { title: "", platform: "", description: "", level: "", estMin: 20, gradingType: "none", gradeMax: 100 });
  return (
    <Modal title={lesson ? "Edit lesson" : "Add lesson"} subtitle={subject} onClose={onClose}>
      <Field label="Title"><input style={inputStyle} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="Platform"><input style={inputStyle} value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} /></Field>
      <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Field>
      <Field label="Grade level"><input style={inputStyle} value={form.level} onChange={e => setForm({ ...form, level: e.target.value })} /></Field>
      <Field label="Est. minutes"><input type="number" style={inputStyle} value={form.estMin} onChange={e => setForm({ ...form, estMin: Number(e.target.value) })} /></Field>
      <Field label="Grading">
        <select style={inputStyle} value={form.gradingType || "none"} onChange={e => setForm({ ...form, gradingType: e.target.value })}>
          <option value="none">None — just completion</option>
          <option value="pass_fail">Pass / Fail</option>
          <option value="score">Score</option>
        </select>
      </Field>
      {form.gradingType === "score" && (
        <Field label="Score out of">
          <input type="number" style={inputStyle} value={form.gradeMax ?? 100} onChange={e => setForm({ ...form, gradeMax: Number(e.target.value) })} />
        </Field>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <AdminBtn variant="ghost" onClick={onClose}>Cancel</AdminBtn>
        <AdminBtn onClick={() => { if (form.title.trim()) onSave(form); }}>{lesson ? "Save" : "Add"}</AdminBtn>
      </div>
    </Modal>
  );
}

function GradeEntryModal({ assignment, onSubmit, onSkip, onClose }) {
  const [passFail, setPassFail] = useState("pass");
  const [score, setScore] = useState("");
  const maxScore = assignment.gradeMax || 100;

  function submit() {
    if (assignment.gradingType === "pass_fail") onSubmit({ type: "pass_fail", value: passFail });
    else if (assignment.gradingType === "score") {
      const n = Number(score);
      if (score === "" || isNaN(n)) return;
      onSubmit({ type: "score", value: n, max: maxScore });
    }
  }

  return (
    <Modal title="Record grade" subtitle={`${assignment.subject} — ${assignment.title}`} onClose={onClose}>
      {assignment.gradingType === "pass_fail" && (
        <Field label="Result">
          <select style={inputStyle} value={passFail} onChange={e => setPassFail(e.target.value)}>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
          </select>
        </Field>
      )}
      {assignment.gradingType === "score" && (
        <Field label={`Score (out of ${maxScore})`}>
          <input type="number" style={inputStyle} value={score} onChange={e => setScore(e.target.value)} autoFocus />
        </Field>
      )}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <AdminBtn variant="ghost" onClick={onSkip}>Skip grading</AdminBtn>
        <AdminBtn onClick={submit}>Mark done & save grade</AdminBtn>
      </div>
    </Modal>
  );
}

// Splits one CSV line into cells, respecting double-quoted fields (so a
// quoted field containing a comma — e.g. a lesson description — doesn't get
// sliced apart) and "" as an escaped quote inside a quoted field.
function splitCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur.trim());
  return cells;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = cells[i] || ""; });
    return row;
  });
}

function BulkImportModal({ onImport, onClose }) {
  const [result, setResult] = useState(null);
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const rows = parseCsv(ev.target.result);
      const { count, skipped } = onImport(rows);
      const parts = [`Imported ${count} lesson${count !== 1 ? "s" : ""}.`];
      if (skipped) parts.push(`Skipped ${skipped} duplicate${skipped !== 1 ? "s" : ""} (already in the catalog or repeated in the file).`);
      setResult(parts.join(" "));
    };
    reader.readAsText(file);
  }
  function downloadTemplate() {
    const csv = "Subject,Title,Platform,Description,Level,Minutes\nMath,Example Lesson,Khan Academy,Short description,5th grade,25\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "curriculum-import-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <Modal title="Bulk import lessons" subtitle="Columns: Subject, Title, Platform, Description, Level, Minutes. Rows sort into the right subject automatically. Matching Title+Platform already in the catalog (or repeated in the file) are skipped — safe to re-upload the same file." onClose={onClose}>
      <AdminBtn variant="outline" style={{ width: "100%", justifyContent: "center", marginBottom: 12 }} onClick={downloadTemplate}>⬇ Download CSV template</AdminBtn>
      <Field label="Upload your filled-in CSV"><input type="file" accept=".csv" onChange={handleFile} style={inputStyle} /></Field>
      {result && <div style={{ color: "#34d399", fontSize: 13, marginTop: 8 }}>{result}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
        <AdminBtn variant="ghost" onClick={onClose}>Close</AdminBtn>
      </div>
    </Modal>
  );
}

// ─── SKILLS MANAGER (Life Skills) ──────────────────────────────────────────────

function SkillsManager({ skillsCatalog, onUpdateCatalog }) {
  const [openCat, setOpenCat] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [editing, setEditing] = useState(null);

  function addCategory() {
    const name = prompt("New category name:");
    if (!name || skillsCatalog[name]) return;
    onUpdateCatalog({ ...skillsCatalog, [name]: [] });
  }
  function saveItem(cat, id, title) {
    const next = { ...skillsCatalog };
    if (id) next[cat] = next[cat].map(i => i.id === id ? { ...i, title } : i);
    else next[cat] = [...next[cat], { id: "ls" + Date.now(), title }];
    onUpdateCatalog(next);
    setEditing(null);
  }
  function deleteItem(cat, id) {
    onUpdateCatalog({ ...skillsCatalog, [cat]: skillsCatalog[cat].filter(i => i.id !== id) });
  }

  if (openCat) {
    let items = [...(skillsCatalog[openCat] || [])];
    if (filterText) items = items.filter(i => i.title.toLowerCase().includes(filterText.toLowerCase()));
    return (
      <div>
        <div onClick={() => setOpenCat(null)} style={{ color: "#64748b", fontSize: 13, cursor: "pointer", marginBottom: 14 }}>← Life Skills</div>
        <h3 style={{ fontSize: 20, marginBottom: 14 }}>⭐ {openCat}</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input placeholder="Search..." value={filterText} onChange={e => setFilterText(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <AdminBtn onClick={() => setEditing({ cat: openCat, id: null })}>+ Add item</AdminBtn>
        </div>
        {items.map(item => (
          <div key={item.id} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
            padding: "10px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 10, marginBottom: 6,
          }}>
            <span style={{ fontSize: 13 }}>{item.title}</span>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button onClick={() => setEditing({ cat: openCat, id: item.id })} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✎</button>
              <button onClick={() => deleteItem(openCat, item.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✕</button>
            </div>
          </div>
        ))}
        {editing && (
          <Modal title={editing.id ? "Edit item" : "Add item"} subtitle={openCat} onClose={() => setEditing(null)}>
            <SkillItemForm
              initial={editing.id ? skillsCatalog[openCat].find(i => i.id === editing.id).title : ""}
              onSave={title => saveItem(openCat, editing.id, title)}
              onClose={() => setEditing(null)}
            />
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: 20, marginBottom: 4 }}>Life Skills</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>{Object.keys(skillsCatalog).length} categories · click one to manage its checklist</p>
      {Object.entries(skillsCatalog).map(([cat, items]) => (
        <div key={cat} onClick={() => setOpenCat(cat)} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: "16px 18px", marginBottom: 8, cursor: "pointer",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 24 }}>⭐</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{cat}</div>
              <div style={{ color: "#64748b", fontSize: 12 }}>{items.length} items</div>
            </div>
          </div>
          <span style={{ color: "#475569" }}>›</span>
        </div>
      ))}
      <AdminBtn variant="ghost" onClick={addCategory}>+ Add new category</AdminBtn>
    </div>
  );
}

function SkillItemForm({ initial, onSave, onClose }) {
  const [title, setTitle] = useState(initial);
  return (
    <div>
      <Field label="Description"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <AdminBtn variant="ghost" onClick={onClose}>Cancel</AdminBtn>
        <AdminBtn onClick={() => title.trim() && onSave(title)}>Save</AdminBtn>
      </div>
    </div>
  );
}

// ─── FIELD TRIPS ────────────────────────────────────────────────────────────────

function FieldTripsManager({ fieldTrips, onUpdate }) {
  const [editing, setEditing] = useState(null);
  function save(id, data) {
    if (id) onUpdate(fieldTrips.map(t => t.id === id ? { ...t, ...data } : t));
    else onUpdate([...fieldTrips, { id: "ft" + Date.now(), ...data }]);
    setEditing(null);
  }
  function del(id) { onUpdate(fieldTrips.filter(t => t.id !== id)); }

  return (
    <div>
      <h3 style={{ fontSize: 20, marginBottom: 4 }}>Field Trips</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Educational outings — each can count as a valid school day, tied into the Attendance record.</p>
      {[...fieldTrips].sort((a, b) => a.date.localeCompare(b.date)).map(trip => (
        <div key={trip.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🚌 {trip.place}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{formatDate(trip.date)}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditing(trip.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✎</button>
              <button onClick={() => del(trip.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✕</button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {trip.subjects.split(",").map(s => s.trim()).filter(Boolean).map(s => (
              <span key={s} style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", fontSize: 11, padding: "3px 9px", borderRadius: 999 }}>{s}</span>
            ))}
            {trip.countsAttendance && <span style={{ background: "rgba(52,211,153,0.15)", color: "#34d399", fontSize: 11, padding: "3px 9px", borderRadius: 999 }}>Counts as school day</span>}
          </div>
          {trip.notes && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 10 }}>{trip.notes}</div>}
        </div>
      ))}
      <AdminBtn onClick={() => setEditing("new")}>+ Add field trip</AdminBtn>
      {editing && (
        <TripEditModal
          trip={editing === "new" ? null : fieldTrips.find(t => t.id === editing)}
          onSave={data => save(editing === "new" ? null : editing, data)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TripEditModal({ trip, onSave, onClose }) {
  const [form, setForm] = useState(trip || { date: today(), place: "", subjects: "", notes: "", countsAttendance: true });
  return (
    <Modal title={trip ? "Edit field trip" : "Add field trip"} onClose={onClose}>
      <Field label="Date"><input type="date" style={inputStyle} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></Field>
      <Field label="Place"><input style={inputStyle} value={form.place} onChange={e => setForm({ ...form, place: e.target.value })} placeholder="e.g. Denver Museum of Nature & Science" /></Field>
      <Field label="Subjects / educational value"><input style={inputStyle} value={form.subjects} onChange={e => setForm({ ...form, subjects: e.target.value })} placeholder="e.g. Science, History" /></Field>
      <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <input type="checkbox" checked={form.countsAttendance} onChange={e => setForm({ ...form, countsAttendance: e.target.checked })} />
        <span style={{ color: "#94a3b8", fontSize: 13 }}>Counts toward attendance</span>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <AdminBtn variant="ghost" onClick={onClose}>Cancel</AdminBtn>
        <AdminBtn onClick={() => form.place.trim() && onSave(form)}>{trip ? "Save" : "Add"}</AdminBtn>
      </div>
    </Modal>
  );
}

// ─── EXTRACURRICULAR ACTIVITIES ────────────────────────────────────────────────

function ExtracurricularManager({ extracurriculars, onUpdate }) {
  const [editing, setEditing] = useState(null);
  function save(id, data) {
    if (id) onUpdate(extracurriculars.map(e => e.id === id ? { ...e, ...data } : e));
    else onUpdate([...extracurriculars, { id: "ec" + Date.now(), ...data }]);
    setEditing(null);
  }
  function del(id) { onUpdate(extracurriculars.filter(e => e.id !== id)); }

  return (
    <div>
      <h3 style={{ fontSize: 20, marginBottom: 4 }}>Extracurricular Activities</h3>
      <p style={{ color: "#64748b", fontSize: 13, marginBottom: 16 }}>Sports, clubs, lessons — recurring or one-off. Doesn't count toward academic attendance.</p>
      {extracurriculars.map(ec => (
        <div key={ec.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "16px 18px", marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>🥋 {ec.name} <span style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa", fontSize: 10, padding: "2px 8px", borderRadius: 999 }}>{ec.type}</span></div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{ec.days.map(d => DOW_FULL[d]).join(" / ")} · {ec.time} · {ec.location}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditing(ec.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✎</button>
              <button onClick={() => del(ec.id)} style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>✕</button>
            </div>
          </div>
          {ec.notes && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 10 }}>{ec.notes}</div>}
        </div>
      ))}
      <AdminBtn onClick={() => setEditing("new")}>+ Add activity</AdminBtn>
      {editing && (
        <EcEditModal
          ec={editing === "new" ? null : extracurriculars.find(e => e.id === editing)}
          onSave={data => save(editing === "new" ? null : editing, data)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EcEditModal({ ec, onSave, onClose }) {
  const [form, setForm] = useState(ec || { name: "", type: "Sport", days: [], time: "", location: "", notes: "" });
  function toggleDay(d) {
    setForm({ ...form, days: form.days.includes(d) ? form.days.filter(x => x !== d) : [...form.days, d] });
  }
  return (
    <Modal title={ec ? "Edit activity" : "Add activity"} onClose={onClose}>
      <Field label="Name"><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Jiu Jitsu" /></Field>
      <Field label="Type">
        <select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          {["Sport", "Club", "Lesson", "Other"].map(t => <option key={t}>{t}</option>)}
        </select>
      </Field>
      <Field label="Days">
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2, 3, 4, 5, 6].map(d => (
            <div key={d} onClick={() => toggleDay(d)} style={{
              width: 32, height: 32, borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, border: "1px solid rgba(255,255,255,0.14)",
              background: form.days.includes(d) ? "#f59e0b" : "rgba(255,255,255,0.04)",
              color: form.days.includes(d) ? "#0f172a" : "#94a3b8",
            }}>{DOW_LETTER[d]}</div>
          ))}
        </div>
      </Field>
      <Field label="Time"><input style={inputStyle} value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} placeholder="e.g. 5:30 PM" /></Field>
      <Field label="Location"><input style={inputStyle} value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} /></Field>
      <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <AdminBtn variant="ghost" onClick={onClose}>Cancel</AdminBtn>
        <AdminBtn onClick={() => form.name.trim() && onSave(form)}>{ec ? "Save" : "Add"}</AdminBtn>
      </div>
    </Modal>
  );
}

// ─── ATTENDANCE TAB ─────────────────────────────────────────────────────────────

function AttendanceTab({ schedule, allLog, fieldTrips, activeSemester, grades }) {
  const [anchor, setAnchor] = useState(new Date());
  const [viewMode, setViewMode] = useState("calendar"); // "calendar" | "list"
  const [selectedDay, setSelectedDay] = useState(null);
  const y = anchor.getFullYear(), m = anchor.getMonth();
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const todayKey = today();

  const attendedDates = Object.keys({ ...schedule, ...Object.fromEntries(fieldTrips.map(t => [t.date, true])) })
    .filter(dk => isAttendedDay(dk, schedule, allLog, fieldTrips));

  // Every date worth showing in the list view: anything scheduled, logged, or with a field trip
  const allRelevantDates = Array.from(new Set([
    ...Object.keys(schedule).filter(dk => (schedule[dk] || []).length > 0),
    ...Object.keys(allLog).filter(dk => Object.keys(allLog[dk] || {}).length > 0),
    ...fieldTrips.map(t => t.date),
  ])).sort((a, b) => b.localeCompare(a));

  function dayInfo(dk) {
    const scheduledItems = schedule[dk] || [];
    const log = allLog[dk] || {};
    const trip = fieldTrips.find(t => t.date === dk);
    const attended = isAttendedDay(dk, schedule, allLog, fieldTrips);
    const doneCount = scheduledItems.filter(a => log[a.id]).length;
    return { scheduledItems, log, trip, attended, doneCount };
  }

  function exportRecord() {
    const rows = [["Date", "Attended", "Reason", "Items Completed"]];
    attendedDates.sort().forEach(dk => {
      const { trip, scheduledItems, doneCount } = dayInfo(dk);
      const countedTrip = trip && trip.countsAttendance;
      rows.push([dk, "Yes", countedTrip ? `Field trip: ${trip.place}` : "Assignment(s) completed", `${doneCount}/${scheduledItems.length}`]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance-record-${today()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "#34d399", fontSize: 20, fontWeight: 700 }}>{attendedDates.length}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Days Attended (1+ item or trip)</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
          <div style={{ color: "#f59e0b", fontSize: 20, fontWeight: 700 }}>{activeSemester?.targetDays || "—"}</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>Target Days — {activeSemester?.name}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["calendar", "list"].map(v => (
          <button key={v} onClick={() => setViewMode(v)} style={{
            padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12,
            background: viewMode === v ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.06)",
            color: viewMode === v ? "#0f172a" : "#94a3b8", fontWeight: viewMode === v ? 700 : 400,
          }}>{v === "calendar" ? "📅 Calendar" : "📋 List"}</button>
        ))}
        <span style={{ color: "#475569", fontSize: 12, alignSelf: "center", marginLeft: 4 }}>— click a day to see what happened</span>
      </div>

      {viewMode === "calendar" && (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{MONTHS[m]} {y}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setAnchor(new Date(y, m - 1, 1))} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>‹</button>
              <button onClick={() => setAnchor(new Date(y, m + 1, 1))} style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#94a3b8", cursor: "pointer" }}>›</button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5 }}>
            {DOW_LETTER.map((d, i) => <div key={i} style={{ textAlign: "center", fontSize: 10, color: "#475569" }}>{d}</div>)}
            {[...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)].map((day, i) => {
              if (!day) return <div key={i} />;
              const dk = new Date(y, m, day).toISOString().split("T")[0];
              const attended = attendedDates.includes(dk);
              const hasTrip = fieldTrips.some(t => t.date === dk);
              const isToday = dk === todayKey;
              const hasAnything = (schedule[dk] || []).length > 0 || hasTrip;
              return (
                <div key={i} onClick={() => hasAnything && setSelectedDay(dk)} style={{
                  aspectRatio: "1", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "#94a3b8", background: attended ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${isToday ? "rgba(245,158,11,0.6)" : attended ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.06)"}`,
                  cursor: hasAnything ? "pointer" : "default",
                }}>
                  <span>{day}</span>
                  {attended && <span style={{ fontSize: 9, color: "#34d399" }}>✓</span>}
                  {!attended && hasTrip && <span style={{ fontSize: 9, color: "#60a5fa" }}>🚌</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === "list" && (
        <div style={{ marginBottom: 16 }}>
          {allRelevantDates.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "#64748b", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>Nothing logged yet.</div>
          ) : allRelevantDates.map(dk => {
            const { scheduledItems, trip, attended, doneCount } = dayInfo(dk);
            return (
              <div key={dk} onClick={() => setSelectedDay(dk)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 6,
                background: attended ? "rgba(52,211,153,0.06)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${attended ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}`,
              }}>
                <div style={{ width: 90, flexShrink: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(dk)}</div>
                </div>
                <div style={{ flex: 1, fontSize: 12, color: "#94a3b8" }}>
                  {scheduledItems.length > 0 ? `${doneCount}/${scheduledItems.length} items completed` : "No lessons scheduled"}
                  {trip && <span style={{ color: "#60a5fa" }}> · 🚌 {trip.place}{trip.countsAttendance ? "" : " (not attendance)"}</span>}
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999,
                  background: attended ? "rgba(52,211,153,0.15)" : "rgba(148,163,184,0.12)",
                  color: attended ? "#34d399" : "#64748b",
                }}>{attended ? "Attended" : "Not attended"}</span>
              </div>
            );
          })}
        </div>
      )}

      <AdminBtn onClick={exportRecord}>⬇ Export attendance record (.csv)</AdminBtn>

      {selectedDay && (() => {
        const { scheduledItems, log, trip, attended } = dayInfo(selectedDay);
        return (
          <Modal
            title={formatDate(selectedDay)}
            subtitle={attended ? "✅ Counts as attended" : "Not attended — nothing completed and no counted field trip"}
            onClose={() => setSelectedDay(null)}
          >
            {trip && (
              <div style={{
                background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)",
                borderRadius: 10, padding: "10px 14px", marginBottom: 12,
              }}>
                <div style={{ color: "#60a5fa", fontWeight: 600, fontSize: 13 }}>🚌 Field trip: {trip.place}</div>
                {trip.subjects && <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>{trip.subjects}</div>}
                <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                  {trip.countsAttendance ? "Counts toward attendance" : "Does not count toward attendance"}
                </div>
              </div>
            )}
            {scheduledItems.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 13, padding: "8px 0" }}>No lessons were scheduled this day.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {scheduledItems.map(item => {
                  const done = !!log[item.id];
                  const grade = grades?.[selectedDay]?.[item.id];
                  const meta = SUBJECT_META[item.subject] || { color: "#94a3b8" };
                  return (
                    <div key={item.id} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8,
                    }}>
                      <span style={{ color: done ? "#34d399" : "#475569", fontSize: 15 }}>{done ? "✓" : "○"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: done ? "#f1f5f9" : "#94a3b8" }}>{item.title}</div>
                        <div style={{ fontSize: 11, color: meta.color }}>{item.subject}</div>
                      </div>
                      {grade && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                          background: grade.type === "pass_fail" ? (grade.value === "pass" ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)") : "rgba(167,139,250,0.18)",
                          color: grade.type === "pass_fail" ? (grade.value === "pass" ? "#34d399" : "#f87171") : "#a78bfa",
                        }}>
                          {grade.type === "pass_fail" ? grade.value.toUpperCase() : `${grade.value}/${grade.max}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <AdminBtn variant="ghost" onClick={() => setSelectedDay(null)}>Close</AdminBtn>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

// ─── ALERTS TAB ─────────────────────────────────────────────────────────────────

function AlertsTab({ schedule, alerts, onUpdateAlerts, alertSettings, onUpdateAlertSettings }) {
  const todayKey = today();
  const todayItems = schedule[todayKey] || [];

  function setAlert(id, time) {
    const key = todayKey + ":" + id;
    if (!time) { const { [key]: _, ...rest } = alerts; onUpdateAlerts(rest); }
    else onUpdateAlerts({ ...alerts, [key]: time });
  }

  return (
    <div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Where alerts should show up</div>
        {[
          { key: "browser", label: "Browser notification", desc: "Pops up while the portal tab is open" },
          { key: "apollo", label: "Apollosign display flag", desc: "Shows a highlighted banner next time the display refreshes" },
        ].map(row => (
          <div key={row.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div>
              <div style={{ fontSize: 13 }}>{row.label}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>{row.desc}</div>
            </div>
            <div onClick={() => onUpdateAlertSettings({ ...alertSettings, [row.key]: !alertSettings[row.key] })} style={{
              width: 42, height: 24, borderRadius: 999, cursor: "pointer", position: "relative",
              background: alertSettings[row.key] ? "#f59e0b" : "rgba(255,255,255,0.12)", transition: "background 0.15s",
            }}>
              <div style={{
                position: "absolute", top: 3, left: alertSettings[row.key] ? 21 : 3, width: 18, height: 18,
                borderRadius: "50%", background: "#fff", transition: "left 0.15s",
              }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Per-assignment alerts — today</div>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>Set a time to be reminded about a specific task today.</p>
        {todayItems.length === 0 && <div style={{ color: "#64748b", fontSize: 13 }}>Nothing scheduled today.</div>}
        {todayItems.map(item => {
          const key = todayKey + ":" + item.id;
          const time = alerts[key] || "";
          return (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 10, marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13 }}>{item.subject} — {item.title}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{time ? `Alert set for ${time}` : "No alert set"}</div>
              </div>
              <input type="time" value={time} onChange={e => setAlert(item.id, e.target.value)} style={{ ...inputStyle, width: 110 }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BACKUP TAB ─────────────────────────────────────────────────────────────────

function SettingsTab({ alertSettings, onUpdateAlertSettings }) {
  const [status, setStatus] = useState({ connected: false });
  const [serverStatus, setServerStatus] = useState({ online: null });
  useEffect(() => {
    const off = onAutoSaveStatusChange(setStatus);
    const offServer = onServerSyncStatusChange(setServerStatus);
    tryReconnectAutoSaveFile();
    fetchServerState().then(data => { if (data) setServerStatus({ online: true, lastSyncedAt: new Date().toISOString() }); });
    return () => { off(); offServer(); };
  }, []);

  async function handleConnect() {
    const res = await connectAutoSaveFile();
    if (!res.ok && res.reason === "unsupported") {
      alert("Auto-save to file needs Chrome or Edge. Use manual export/import below instead.");
    }
  }
  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const snapshot = JSON.parse(ev.target.result);
        if (confirm("This will overwrite current data on this device AND push it to the shared server copy. Continue?")) {
          restoreBackupSnapshot(snapshot);
          pushServerState(collectBackupSnapshot());
          alert("Restored. Reloading...");
          window.location.reload();
        }
      } catch { alert("That file doesn't look like a valid backup."); }
    };
    reader.readAsText(file);
  }

  const serverLabel = serverStatus.online === null ? "Checking..."
    : serverStatus.online ? `Connected — synced ${serverStatus.lastSyncedAt ? "just now" : ""}`
    : `Offline${serverStatus.error ? ` (${serverStatus.error})` : ""}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Default PINs */}
      <div style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📋 Default PINs</div>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>These are the login PINs for each profile. Liora uses hers to access the student dashboard; Joshua (Admin) uses his to access this panel.</p>
        <div style={{ color: "#94a3b8", fontSize: 13 }}>Liora: <strong style={{ color: "#f1f5f9" }}>1234</strong> &nbsp;·&nbsp; Joshua (Admin): <strong style={{ color: "#f1f5f9" }}>9999</strong></div>
        <div style={{ color: "#475569", fontSize: 12, marginTop: 4 }}>PIN editing will be added in a future update.</div>
      </div>

      {/* Alert channel toggles */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>🔔 Alert Channels</div>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 14 }}>Per-item reminder times are set in the Schedule → Schedule Builder calendar (click any day). These toggles control where those reminders are sent.</p>
        {[
          { key: "browser", label: "Browser notifications", desc: "Shows a pop-up notification on this device when a scheduled item's reminder time arrives." },
          { key: "apollo", label: "Apollosign flag banner", desc: "Highlights overdue items on the Apollosign display with a banner at the top of the screen." },
        ].map(ch => {
          const enabled = alertSettings?.[ch.key] !== false;
          return (
            <div key={ch.key} style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
              <div onClick={() => onUpdateAlertSettings({ ...alertSettings, [ch.key]: !enabled })} style={{
                width: 42, height: 24, borderRadius: 999, cursor: "pointer", position: "relative", flexShrink: 0, marginTop: 2,
                background: enabled ? "#f59e0b" : "rgba(255,255,255,0.12)", transition: "background 0.15s",
              }}>
                <div style={{ position: "absolute", top: 3, left: enabled ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{ch.label}</div>
                <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{ch.desc}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Server sync */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Shared Server Sync</div>
          <span style={{ fontSize: 11, color: serverStatus.online ? "#34d399" : serverStatus.online === false ? "#f87171" : "#64748b" }}>{serverLabel}</span>
        </div>
        <p style={{ color: "#64748b", fontSize: 12 }}>
          This is the real source of truth — every device (this PC, phones, the Apollosign) reads and writes the same file on the server. Checking something off anywhere shows up everywhere else within about {Math.round(SERVER_POLL_MS / 1000)} seconds.
        </p>
      </div>

      {/* Local backup */}
      <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Local Backup (extra safety net)</div>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            {status.connected ? `Connected — ${status.fileName}${status.savedAt ? ", saved just now" : ""}` : status.needsPermission ? "Needs reconnect (click below)" : "Not connected"}
          </span>
        </div>
        <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>Even with the server holding the real data, it's worth mirroring a copy to a real file on this device — protects against the server itself having a bad day.</p>
        <div style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#34d399" }}>Auto-save to file</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, marginBottom: 10 }}>Pick one file once — every change silently overwrites it. Put it in a Drive/OneDrive-synced folder for automatic offsite backup.</div>
          <AdminBtn onClick={handleConnect}>🔗 {status.connected ? "Reconnect / change file" : "Choose backup file location"}</AdminBtn>
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>Or, manual fallback (works in any browser):</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <AdminBtn variant="outline" onClick={downloadBackupNow}>⬇ Export backup now (.json)</AdminBtn>
          <label style={{ display: "inline-block" }}>
            <span style={{
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "8px 14px", fontSize: 13,
              cursor: "pointer", color: "#94a3b8", display: "inline-block",
            }}>⬆ Import backup</span>
            <input type="file" accept=".json" onChange={handleImportFile} style={{ display: "none" }} />
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PANEL ──────────────────────────────────────────────────────────────

function AdminPanel({
  semesters, activeSemesterId, onSetActive, onGenerateSchedule, schedule, allLog,
  pattern, onUpdatePattern, overrides, onSetOverride,
  coursesCatalog, onUpdateCoursesCatalog, onRemoveFromSchedule, skillsCatalog, onUpdateSkillsCatalog,
  fieldTrips, onUpdateFieldTrips, extracurriculars, onUpdateExtracurriculars,
  evaluation, onUpdateEvaluation, alerts, onUpdateAlerts, alertSettings, onUpdateAlertSettings, grades,
}) {
  const [tab, setTab] = useState("semesters");
  const [overrideDay, setOverrideDay] = useState(null);
  const [regenFrom, setRegenFrom] = useState(today());
  const [regenSubject, setRegenSubject] = useState("");
  const [rescheduleMissed, setRescheduleMissed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const activeSemester = semesters[activeSemesterId];

  function handleRegenClick() {
    setRegenerating(true);
    // Yield to the browser so it can paint the "Generating..." state and stay
    // responsive before the (bounded, but synchronous) generation work runs.
    setTimeout(() => {
      const stats = onGenerateSchedule(regenFrom, regenSubject || null, rescheduleMissed);
      setRegenerating(false);
      if (!stats) { alert("Nothing generated — is a semester active?"); return; }
      const lines = [];
      if (rescheduleMissed) {
        lines.push(stats.recoveredCount > 0
          ? `Rescheduled ${stats.recoveredCount} missed item${stats.recoveredCount !== 1 ? "s" : ""} across ${stats.subjectsRecovered.join(", ") || "—"}.`
          : "No missed items found to reschedule.");
      }
      lines.push(`${stats.newlyFilledDays} day${stats.newlyFilledDays !== 1 ? "s" : ""} filled from ${regenFrom} forward.`);
      lines.push(`${stats.preservedDays} earlier day${stats.preservedDays !== 1 ? "s" : ""} left untouched.`);
      if (stats.hitSafetyCap) lines.push("⚠️ Hit a safety limit partway through — this semester's date range may be misconfigured. Tell Claude if you see this.");
      alert(lines.join("\n"));
    }, 50);
  }

  const totalScheduled = Object.values(schedule).flat().length;
  const totalCompleted = Object.entries(allLog).reduce((acc, [date, logs]) => {
    const scheduled = schedule[date] || [];
    return acc + scheduled.filter(a => logs[a.id]).length;
  }, 0);

  const completedDays = Object.keys({ ...schedule, ...Object.fromEntries(fieldTrips.map(t => [t.date, true])) })
    .filter(d => isAttendedDay(d, schedule, allLog, fieldTrips)).length;

  const [scheduleSub, setScheduleSub] = useState("builder");
  const [curriculumSub, setCurriculumSub] = useState("courses");

  const TABS = [
    { key: "semesters", label: "Semesters" },
    { key: "schedule", label: "Schedule" },
    { key: "attendance", label: "Attendance" },
    { key: "alerts", label: "Alerts" },
    { key: "backup", label: "Settings" },
  ];

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px" }}>
      <h2 style={{ color: "#f1f5f9", fontSize: 24, fontWeight: 700, marginBottom: 20 }}>Admin Panel</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13,
            background: tab === t.key ? "linear-gradient(135deg, #f59e0b, #d97706)" : "rgba(255,255,255,0.06)",
            color: tab === t.key ? "#0f172a" : "#94a3b8", fontWeight: tab === t.key ? 700 : 400,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "semesters" && (
        <div>
          {/* Overview stats merged into Semesters — at-a-glance without needing a separate tab */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
            {[
              { label: "Active Semester", value: activeSemester?.name || "None", color: "#f59e0b" },
              { label: "Semester Mode", value: activeSemester?.mode?.toUpperCase() || "—", color: "#a78bfa" },
              { label: "Days Attended", value: `${completedDays} / ${activeSemester?.targetDays || 0}`, color: "#34d399" },
              { label: "Assignments Done", value: `${totalCompleted} / ${totalScheduled}`, color: "#60a5fa" },
            ].map(s => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16 }}>
                <div style={{ color: s.color, fontSize: 20, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Required Subject Coverage — {activeSemester?.name}</div>
            <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>All 9 Colorado-required subjects, and whether each has been touched. Since the schedule's fully flexible, this is the safety net that nothing quietly falls off.</p>
            <RequiredCoverageWidget schedule={schedule} allLog={allLog} />
          </div>
          <p style={{ color: "#64748b", fontSize: 14, marginBottom: 12 }}>Select which semester is active. Past semesters become read-only archives.</p>
          {Object.values(semesters).map(sem => (
            <div key={sem.id} style={{
              background: sem.id === activeSemesterId ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
              border: `2px solid ${sem.id === activeSemesterId ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 14, padding: "18px 20px", marginBottom: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>{sem.name}</div>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{sem.startDate} → {sem.endDate} · {sem.mode.toUpperCase()} · {sem.targetDays} days</div>
                <div style={{ color: "#475569", fontSize: 12, marginTop: 2 }}>Subjects: {sem.subjects.join(", ")}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {sem.id === activeSemesterId
                  ? <span style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>ACTIVE</span>
                  : <AdminBtn variant="outline" onClick={() => onSetActive(sem.id)}>Set Active</AdminBtn>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "schedule" && (
        <div>
          {/* Schedule sub-nav: Schedule Builder | Curriculum */}
          <div style={{ display: "flex", gap: 6, marginBottom: 20, background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: 4, width: "fit-content" }}>
            {[{ key: "builder", label: "📅 Schedule Builder" }, { key: "curriculum", label: "📚 Curriculum" }].map(s => (
              <button key={s.key} onClick={() => setScheduleSub(s.key)} style={{
                padding: "7px 16px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13,
                background: scheduleSub === s.key ? "linear-gradient(135deg, #f59e0b, #d97706)" : "transparent",
                color: scheduleSub === s.key ? "#0f172a" : "#94a3b8", fontWeight: scheduleSub === s.key ? 700 : 400,
                transition: "all 0.15s",
              }}>{s.label}</button>
            ))}
          </div>

          {scheduleSub === "builder" && (
            <div>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18, marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Recurring weekly pattern</div>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12 }}>Assign subjects to any day, weekends included. This generates the baseline schedule — override any single day below without disturbing the pattern.</p>
                <PatternEditor pattern={pattern} onUpdatePattern={onUpdatePattern} coursesCatalog={coursesCatalog} />
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4 }}>Regenerate starting from</label>
                    <input type="date" value={regenFrom} onChange={e => setRegenFrom(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "#64748b", marginBottom: 4 }}>Subject</label>
                    <select value={regenSubject} onChange={e => setRegenSubject(e.target.value)} style={inputStyle}>
                      <option value="">All subjects</option>
                      {Object.keys(coursesCatalog).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <AdminBtn style={{ alignSelf: "flex-end" }} disabled={regenerating} onClick={handleRegenClick}>{regenerating ? "Generating..." : "Save pattern & regenerate"}</AdminBtn>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                  <div onClick={() => setRescheduleMissed(!rescheduleMissed)} style={{
                    width: 42, height: 24, borderRadius: 999, cursor: "pointer", position: "relative",
                    background: rescheduleMissed ? "#f59e0b" : "rgba(255,255,255,0.12)", transition: "background 0.15s", flexShrink: 0,
                  }}>
                    <div style={{ position: "absolute", top: 3, left: rescheduleMissed ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                  </div>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>Reschedule missed items too</span>
                </div>
                <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 8 }}>⚠️ Everything before this date that's already completed or skipped is left exactly as-is. With the toggle off, anything else before this date is also left untouched — regenerating only fills forward from here. With it on, anything incomplete before this date gets pulled out and lined back up starting from here, in its original order. Picking a subject only touches that subject's slots; every other subject's items on those days stay put. Any day you've manually overridden below is also left untouched regardless.</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 18 }}>
                <ScheduleCalendar schedule={schedule} overrides={overrides} onDayClick={setOverrideDay} allLog={allLog} />
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, fontSize: 11, color: "#64748b", alignItems: "center" }}>
                  {Object.entries(SUBJECT_META).slice(0, 6).map(([s, m]) => (
                    <span key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: m.color }} />{s}
                    </span>
                  ))}
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: "rgba(52,211,153,0.15)", border: "1px solid #34d399" }} />All done
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, border: "1px solid rgba(248,113,113,0.65)" }} />Missed
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, border: "1px solid rgba(167,139,250,0.6)" }} />Overridden
                  </span>
                </div>
              </div>
              {overrideDay && (
                <DayOverrideModal
                  dateKey={overrideDay}
                  schedule={schedule}
                  coursesCatalog={coursesCatalog}
                  onSetOverride={onSetOverride}
                  onClose={() => setOverrideDay(null)}
                />
              )}
            </div>
          )}

          {scheduleSub === "curriculum" && (
            <div>
              {/* Curriculum sub-nav */}
              <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  { key: "courses", label: "Courses & Subjects" },
                  { key: "skills", label: "Life Skills" },
                  { key: "trips", label: "Field Trips" },
                  { key: "extracurricular", label: "Extracurricular" },
                ].map(s => (
                  <button key={s.key} onClick={() => setCurriculumSub(s.key)} style={{
                    padding: "6px 14px", borderRadius: 8, border: `1px solid ${curriculumSub === s.key ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
                    cursor: "pointer", fontSize: 12,
                    background: curriculumSub === s.key ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.04)",
                    color: curriculumSub === s.key ? "#f59e0b" : "#94a3b8", fontWeight: curriculumSub === s.key ? 600 : 400,
                  }}>{s.label}</button>
                ))}
              </div>
              {curriculumSub === "courses" && <CourseManager coursesCatalog={coursesCatalog} onUpdateCatalog={onUpdateCoursesCatalog} onRemoveFromSchedule={onRemoveFromSchedule} schedule={schedule} allLog={allLog} />}
              {curriculumSub === "skills" && <SkillsManager skillsCatalog={skillsCatalog} onUpdateCatalog={onUpdateSkillsCatalog} />}
              {curriculumSub === "trips" && <FieldTripsManager fieldTrips={fieldTrips} onUpdate={onUpdateFieldTrips} />}
              {curriculumSub === "extracurricular" && <ExtracurricularManager extracurriculars={extracurriculars} onUpdate={onUpdateExtracurriculars} />}
            </div>
          )}
        </div>
      )}
      {tab === "attendance" && <AttendanceTab schedule={schedule} allLog={allLog} fieldTrips={fieldTrips} activeSemester={activeSemester} grades={grades} />}
      {tab === "alerts" && <AlertsTab schedule={schedule} alerts={alerts} onUpdateAlerts={onUpdateAlerts} alertSettings={alertSettings} onUpdateAlertSettings={onUpdateAlertSettings} />}
      {tab === "backup" && <SettingsTab alertSettings={alertSettings} onUpdateAlertSettings={onUpdateAlertSettings} />}
    </div>
  );
}

// ─── APOLLOSIGN DISPLAY ──────────────────────────────────────────────────────

function ApolloSignDisplay({ schedule, log, semester, allLog, onToggle, alerts, alertSettings, grades, onSetGrade, fieldTrips }) {
  const todayKey = today();
  const todayAssignments = schedule[todayKey] || [];
  const completed = todayAssignments.filter(a => log[a.id]);
  const allDone = todayAssignments.length > 0 && completed.length === todayAssignments.length;
  const [gradingAssignment, setGradingAssignment] = useState(null);

  function handleToggleClick(a) {
    const isDone = !!log[a.id];
    if (!isDone && a.gradingType && a.gradingType !== "none") setGradingAssignment(a);
    else onToggle(todayKey, a.id);
  }

  // Active alert flags: today's alert time has passed and the item isn't done yet
  const nowStr = (() => { const n = new Date(); return `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`; })();
  const activeFlags = alertSettings?.apollo
    ? todayAssignments.filter(a => {
        const t = alerts?.[todayKey + ":" + a.id];
        return t && t <= nowStr && !log[a.id];
      })
    : [];

  const completedDays = Object.keys({ ...schedule, ...Object.fromEntries((fieldTrips || []).map(t => [t.date, true])) })
    .filter(d => isAttendedDay(d, schedule, allLog, fieldTrips || [])).length;

  const pct = semester ? Math.round((completedDays / semester.targetDays) * 100) : 0;

  return (
    <div style={{
      width: "100vw", minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0f1e 0%, #0f172a 40%, #1a1035 100%)",
      fontFamily: "'Georgia', serif", padding: "40px 36px", boxSizing: "border-box",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ color: "#475569", fontSize: 16, marginBottom: 6, letterSpacing: 1 }}>
          {getDayOfWeek().toUpperCase()} · {formatDate(todayKey).toUpperCase()}
        </div>
        <div style={{ color: "#f59e0b", fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>
          Liora's Academy
        </div>
        {semester && (
          <div style={{ color: "#475569", fontSize: 14, marginTop: 4 }}>{semester.name}</div>
        )}
      </div>

      {/* Active alert flags */}
      {activeFlags.length > 0 && (
        <div style={{
          background: "rgba(245,158,11,0.15)", border: "2px solid rgba(245,158,11,0.5)",
          borderRadius: 16, padding: "16px 20px", marginBottom: 20,
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ fontSize: 28 }}>⏰</div>
          <div>
            <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 16 }}>Reminder</div>
            <div style={{ color: "#f1f5f9", fontSize: 15 }}>
              {activeFlags.map(a => `${a.subject} — ${a.title}`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20, padding: "20px 24px", marginBottom: 28,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: "#94a3b8", fontSize: 16 }}>Semester Progress</span>
          <span style={{ color: "#f59e0b", fontSize: 24, fontWeight: 700 }}>{completedDays} days</span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 999, height: 12, overflow: "hidden" }}>
          <div style={{
            width: `${pct}%`, height: "100%",
            background: "linear-gradient(90deg, #f59e0b, #fbbf24)", borderRadius: 999,
          }} />
        </div>
        <div style={{ color: "#475569", fontSize: 13, marginTop: 8 }}>
          {semester?.targetDays - completedDays} days remaining · {pct}% complete
        </div>
      </div>

      {/* Today's assignments */}
      <div style={{ flex: 1 }}>
        <div style={{ color: "#94a3b8", fontSize: 14, letterSpacing: 2, marginBottom: 16, fontWeight: 600 }}>
          TODAY'S WORK — {completed.length}/{todayAssignments.length} DONE
        </div>

        {allDone && todayAssignments.length > 0 ? (
          <div style={{
            background: "rgba(34,197,94,0.1)", border: "2px solid rgba(34,197,94,0.4)",
            borderRadius: 20, padding: "32px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 64, marginBottom: 12 }}>🏆</div>
            <div style={{ color: "#34d399", fontSize: 32, fontWeight: 700 }}>All Done!</div>
            <div style={{ color: "#6b7280", fontSize: 18, marginTop: 8 }}>Great work today, Liora.</div>
          </div>
        ) : todayAssignments.length === 0 ? (
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 20, padding: "32px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🌤</div>
            <div style={{ color: "#94a3b8", fontSize: 20 }}>No assignments today</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {todayAssignments.map(a => {
              const meta = SUBJECT_META[a.subject] || { color: "#94a3b8", bg: "rgba(148,163,184,0.15)", emoji: "📝" };
              const done = !!log[a.id];
              return (
                <div key={a.id} onClick={() => handleToggleClick(a)} style={{
                  background: done ? "rgba(34,197,94,0.08)" : meta.bg,
                  border: `2px solid ${done ? "rgba(34,197,94,0.5)" : meta.color + "55"}`,
                  borderRadius: 18, padding: "20px 24px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 18, opacity: done ? 0.6 : 1,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    border: `3px solid ${done ? "#22c55e" : meta.color}`,
                    background: done ? "#22c55e" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {done && <Icon name="check" size={20} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                      <span style={{ color: meta.color, fontWeight: 700, fontSize: 16 }}>{a.subject}</span>
                      {grades[todayKey]?.[a.id] && (
                        <span style={{
                          background: grades[todayKey][a.id].type === "pass_fail"
                            ? (grades[todayKey][a.id].value === "pass" ? "rgba(52,211,153,0.18)" : "rgba(248,113,113,0.18)")
                            : "rgba(96,165,250,0.18)",
                          color: grades[todayKey][a.id].type === "pass_fail"
                            ? (grades[todayKey][a.id].value === "pass" ? "#34d399" : "#f87171")
                            : "#60a5fa",
                          fontSize: 13, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
                        }}>
                          {grades[todayKey][a.id].type === "pass_fail" ? grades[todayKey][a.id].value.toUpperCase() : `${grades[todayKey][a.id].value}/${grades[todayKey][a.id].max}`}
                        </span>
                      )}
                    </div>
                    <div style={{
                      color: done ? "#6b7280" : "#f1f5f9", fontSize: 22, fontWeight: 600,
                      textDecoration: done ? "line-through" : "none",
                    }}>{a.title}</div>
                    <div style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>⏱ ~{a.estMin} min</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {gradingAssignment && (
        <GradeEntryModal
          assignment={gradingAssignment}
          onSubmit={grade => {
            onToggle(todayKey, gradingAssignment.id);
            onSetGrade(todayKey, gradingAssignment.id, grade);
            setGradingAssignment(null);
          }}
          onSkip={() => {
            onToggle(todayKey, gradingAssignment.id);
            setGradingAssignment(null);
          }}
          onClose={() => setGradingAssignment(null)}
        />
      )}

      {/* Footer */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "#1e3a5f", fontSize: 13 }}>school.theflairhub.com</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[...Array(Math.min(5, todayAssignments.length))].map((_, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: "50%",
              background: i < completed.length ? "#f59e0b" : "rgba(255,255,255,0.1)",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

const DEFAULT_EVALUATION = {
  label: "7th Grade Evaluation Assessment",
  status: "pending", // pending | scheduled | completed
  dueDate: "2027-04-30",
  showFrom: "2027-03-01",
};

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [displayMode, setDisplayMode] = useState(false);

  const [semesters, setSemesters] = useState(() => load(STORAGE_KEYS.semesters, INITIAL_SEMESTERS));
  const [activeSemesterId, setActiveSemesterId] = useState(() => load(STORAGE_KEYS.activeSemester, "2026-summer"));
  const [schedule, setSchedule] = useState(() => load(STORAGE_KEYS.schedule, {}));
  const [overrides, setOverrides] = useState(() => load(STORAGE_KEYS.overrides, {}));
  const [pattern, setPattern] = useState(() => load(STORAGE_KEYS.pattern, DEFAULT_PATTERN));
  const [allLog, setAllLog] = useState(() => load(STORAGE_KEYS.log, {}));
  const [grades, setGrades] = useState(() => load(STORAGE_KEYS.grades, {}));
  const [skills, setSkills] = useState(() => load(STORAGE_KEYS.skills, {}));
  const [coursesCatalog, setCoursesCatalog] = useState(() => load(STORAGE_KEYS.assignments, INITIAL_ASSIGNMENTS));
  const [skillsCatalog, setSkillsCatalog] = useState(() => load(STORAGE_KEYS.skillsCatalog, INITIAL_LIFE_SKILLS));
  const [fieldTrips, setFieldTrips] = useState(() => load(STORAGE_KEYS.fieldTrips, []));
  const [extracurriculars, setExtracurriculars] = useState(() => load(STORAGE_KEYS.extracurriculars, []));
  const [evaluation, setEvaluation] = useState(() => load(STORAGE_KEYS.evaluation, DEFAULT_EVALUATION));
  const [alerts, setAlerts] = useState(() => load(STORAGE_KEYS.alerts, {}));
  const [alertSettings, setAlertSettings] = useState(() => load(STORAGE_KEYS.alertSettings, { browser: true, apollo: true }));
  const [firedAlerts, setFiredAlerts] = useState({});

  const activeSemester = semesters[activeSemesterId];
  const todayKey = today();
  const todayLog = allLog[todayKey] || {};

  // Pushes a freshly-fetched server snapshot into live React state (not just
  // localStorage) so every device actually re-renders with the shared data —
  // this is what makes "check something off on Apollosign, see it on the PC"
  // actually work.
  function hydrateFromSnapshot(snapshot) {
    if (snapshot.semesters) setSemesters(snapshot.semesters);
    if (snapshot.activeSemester) setActiveSemesterId(snapshot.activeSemester);
    if (snapshot.schedule) setSchedule(snapshot.schedule);
    if (snapshot.overrides) setOverrides(snapshot.overrides);
    if (snapshot.pattern) setPattern(snapshot.pattern);
    if (snapshot.log) setAllLog(snapshot.log);
    if (snapshot.grades) setGrades(snapshot.grades);
    if (snapshot.skills) setSkills(snapshot.skills);
    if (snapshot.assignments) setCoursesCatalog(snapshot.assignments);
    if (snapshot.skillsCatalog) setSkillsCatalog(snapshot.skillsCatalog);
    if (snapshot.fieldTrips) setFieldTrips(snapshot.fieldTrips);
    if (snapshot.extracurriculars) setExtracurriculars(snapshot.extracurriculars);
    if (snapshot.evaluation) setEvaluation(snapshot.evaluation);
    if (snapshot.alerts) setAlerts(snapshot.alerts);
    if (snapshot.alertSettings) setAlertSettings(snapshot.alertSettings);
    // Mirror into localStorage too, so this device has an instant-paint cache
    // next time it loads, even before the next server fetch completes.
    Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
      if (name === "auth") return;
      if (snapshot[name] !== undefined && snapshot[name] !== null) {
        try { localStorage.setItem(key, JSON.stringify(snapshot[name])); } catch {}
      }
    });
  }

  // On first load: try to pull the shared server state. If the server has
  // nothing yet (first run), fall back to generating a schedule locally and
  // push it up to initialize the shared copy.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const serverData = await fetchServerState();
      if (cancelled) return;
      if (serverData) {
        hydrateFromSnapshot(serverData);
      } else if (Object.keys(schedule).length === 0 && activeSemester) {
        const { schedule: generated } = generateSchedule(activeSemester, coursesCatalog, pattern, overrides);
        setSchedule(generated);
        save(STORAGE_KEYS.schedule, generated);
      } else {
        pushServerState(collectBackupSnapshot());
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Poll for changes made on other devices while this tab stays open
  useEffect(() => {
    const interval = setInterval(async () => {
      const serverData = await fetchServerState();
      if (serverData) hydrateFromSnapshot(serverData);
    }, SERVER_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  // Try to silently reconnect a previously-granted auto-save file handle
  useEffect(() => { tryReconnectAutoSaveFile(); }, []);

  // Check for due alerts every 30s (today's items only, browser tab must be open)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!alertSettings.browser) return;
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const nowStr = `${hh}:${mm}`;
      Object.entries(alerts).forEach(([key, time]) => {
        if (!key.startsWith(todayKey + ":")) return;
        if (time !== nowStr) return;
        if (firedAlerts[key]) return;
        const assignmentId = key.split(":")[1];
        const item = (schedule[todayKey] || []).find(a => a.id === assignmentId);
        if (!item) return;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Liora's Academy", { body: `${item.subject} — ${item.title} is due. Time to focus in!` });
        }
        setFiredAlerts(prev => ({ ...prev, [key]: true }));
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [alerts, alertSettings, schedule, firedAlerts, todayKey]);

  function handleToggleAssignment(date, assignmentId) {
    const updated = { ...allLog, [date]: { ...(allLog[date] || {}), [assignmentId]: !allLog[date]?.[assignmentId] } };
    setAllLog(updated);
    save(STORAGE_KEYS.log, updated);
  }

  function handleSetGrade(date, assignmentId, gradeObj) {
    const updated = { ...grades, [date]: { ...(grades[date] || {}), [assignmentId]: gradeObj } };
    setGrades(updated);
    save(STORAGE_KEYS.grades, updated);
  }

  function handleToggleSkill(skillId) {
    const nowDone = !skills[skillId];
    const updated = { ...skills, [skillId]: nowDone };
    if (nowDone) updated[skillId + "_date"] = today();
    else delete updated[skillId + "_date"];
    setSkills(updated);
    save(STORAGE_KEYS.skills, updated);
  }

  function handleReschedule(assignment, targetDate) {
    const dest = targetDate || todayKey;
    const updatedSchedule = { ...schedule, [dest]: [...(schedule[dest] || []), { ...assignment, date: dest }] };
    setSchedule(updatedSchedule);
    save(STORAGE_KEYS.schedule, updatedSchedule);
    // If that destination day has been individually overridden before, keep the override in sync too
    if (overrides[dest] !== undefined) {
      const updatedOverrides = { ...overrides, [dest]: updatedSchedule[dest] };
      setOverrides(updatedOverrides);
      save(STORAGE_KEYS.overrides, updatedOverrides);
    }
  }

  function handleSkip(assignment) {
    const updatedLog = { ...allLog, [assignment.originalDate]: { ...(allLog[assignment.originalDate] || {}), [assignment.id]: "skipped" } };
    setAllLog(updatedLog);
    save(STORAGE_KEYS.log, updatedLog);
  }

  function handleComplete(assignment, completionDate) {
    // Marks the missed assignment as done on the chosen date (past or today).
    // Removes it from the missed queue and counts toward attendance on that date.
    const updatedLog = {
      ...allLog,
      [completionDate]: { ...(allLog[completionDate] || {}), [assignment.id]: true },
    };
    setAllLog(updatedLog);
    save(STORAGE_KEYS.log, updatedLog);
  }

  function handleGenerateSchedule(startDate, subjectFilter, rescheduleMissed) {
    if (!activeSemester) return null;
    const { schedule: generated, stats } = generateSchedule(activeSemester, coursesCatalog, pattern, overrides, schedule, startDate, subjectFilter, rescheduleMissed, allLog);
    setSchedule(generated);
    save(STORAGE_KEYS.schedule, generated);
    return stats;
  }

  function handleSetActiveSemester(id) {
    const updatedSemesters = Object.fromEntries(
      Object.entries(semesters).map(([k, v]) => [k, { ...v, active: k === id }])
    );
    setSemesters(updatedSemesters);
    setActiveSemesterId(id);
    save(STORAGE_KEYS.semesters, updatedSemesters);
    save(STORAGE_KEYS.activeSemester, id);
    const { schedule: generated } = generateSchedule(semesters[id], coursesCatalog, pattern, overrides);
    setSchedule(generated);
    save(STORAGE_KEYS.schedule, generated);
  }

  function handleUpdatePattern(next) { setPattern(next); save(STORAGE_KEYS.pattern, next); }

  function handleSetOverride(dateKey, itemsOrSkip) {
    const updated = { ...overrides, [dateKey]: itemsOrSkip };
    setOverrides(updated);
    save(STORAGE_KEYS.overrides, updated);
    const updatedSchedule = { ...schedule };
    if (itemsOrSkip === "SKIP") delete updatedSchedule[dateKey];
    else updatedSchedule[dateKey] = itemsOrSkip;
    setSchedule(updatedSchedule);
    save(STORAGE_KEYS.schedule, updatedSchedule);
  }

  function handleUpdateCoursesCatalog(next) { setCoursesCatalog(next); save(STORAGE_KEYS.assignments, next); }
  // Strips any already-scheduled calendar entries for a lesson that no longer
  // exists in the catalog (e.g. after deleteLesson). Without this, deleting a
  // lesson leaves orphaned copies sitting on whatever days it was scheduled.
  function handleRemoveFromSchedule(subject, lessonId) {
    const next = {};
    for (const [dateKey, items] of Object.entries(schedule)) {
      const filtered = items.filter(a => !(a.subject === subject && a.id === lessonId));
      if (filtered.length > 0) next[dateKey] = filtered;
    }
    setSchedule(next);
    save(STORAGE_KEYS.schedule, next);
  }
  function handleUpdateSkillsCatalog(next) { setSkillsCatalog(next); save(STORAGE_KEYS.skillsCatalog, next); }
  function handleUpdateFieldTrips(next) { setFieldTrips(next); save(STORAGE_KEYS.fieldTrips, next); }
  function handleUpdateExtracurriculars(next) { setExtracurriculars(next); save(STORAGE_KEYS.extracurriculars, next); }
  function handleUpdateEvaluation(next) { setEvaluation(next); save(STORAGE_KEYS.evaluation, next); }
  function handleUpdateAlerts(next) { setAlerts(next); save(STORAGE_KEYS.alerts, next); }
  function handleUpdateAlertSettings(next) { setAlertSettings(next); save(STORAGE_KEYS.alertSettings, next); }

  if (!user) return <LoginScreen onLogin={role => { setUser(role); setView("dashboard"); }} />;

  if (displayMode) {
    return (
      <div>
        <button onClick={() => setDisplayMode(false)} style={{
          position: "fixed", top: 16, right: 16, zIndex: 100,
          background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: 8, color: "#94a3b8", padding: "8px 12px", cursor: "pointer", fontSize: 13,
        }}>Exit Display</button>
        <ApolloSignDisplay
          schedule={schedule}
          log={todayLog}
          semester={activeSemester}
          allLog={allLog}
          onToggle={handleToggleAssignment}
          alerts={alerts}
          alertSettings={alertSettings}
          grades={grades}
          onSetGrade={handleSetGrade}
          fieldTrips={fieldTrips}
        />
      </div>
    );
  }

  // Nav items per role
  const navItems = user === "admin"
    ? [
        { key: "dashboard", label: "Today", icon: "home" },
        { key: "skills", label: "Skills", icon: "star" },
        { key: "missed", label: "Missed", icon: "alert" },
        { key: "weekly", label: "Weekly", icon: "calendar" },
        { key: "admin", label: "Admin", icon: "settings" },
      ]
    : [
        { key: "dashboard", label: "Today", icon: "home" },
        { key: "skills", label: "Skills", icon: "star" },
        { key: "weekly", label: "Weekly", icon: "calendar" },
      ];

  // Missed count badge
  const missedCount = Object.entries(schedule).filter(([date, assignments]) => {
    return date < todayKey && assignments.some(a => !allLog[date]?.[a.id]);
  }).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0f1e 0%, #0f172a 60%, #1a1035 100%)",
      fontFamily: "'Georgia', serif", color: "#f1f5f9",
    }}>
      {/* Top bar */}
      <div style={{
        background: "rgba(15,23,42,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(10px)", height: 56,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🌊</span>
          <span style={{ color: "#f59e0b", fontWeight: 700, fontSize: 16 }}>Liora's Academy</span>
          {activeSemester && (
            <span style={{
              background: "rgba(245,158,11,0.15)", color: "#f59e0b",
              fontSize: 11, padding: "2px 8px", borderRadius: 999, fontWeight: 600,
            }}>{activeSemester.name}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user === "admin" && (
            <button onClick={() => setDisplayMode(true)} style={{
              background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: 8, padding: "6px 12px", color: "#f59e0b", cursor: "pointer", fontSize: 13,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Icon name="display" size={14} /> Display
            </button>
          )}
          <button onClick={() => setUser(null)} style={{
            background: "transparent", border: "none", color: "#475569", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4, fontSize: 13, padding: "6px 8px",
          }}>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>

      {/* Persistent evaluation reminder — date-gated, visible on every screen */}
      {user === "admin" && (
        <EvaluationBanner evaluation={evaluation} onUpdate={handleUpdateEvaluation} />
      )}

      {/* Content */}
      <div style={{ paddingBottom: 80 }}>
        {view === "dashboard" && (
          <DailyDashboard
            schedule={schedule}
            log={todayLog}
            onToggle={handleToggleAssignment}
            semester={activeSemester}
            allLog={allLog}
            skills={skills}
            skillsCatalog={skillsCatalog}
            grades={grades}
            onSetGrade={handleSetGrade}
            fieldTrips={fieldTrips}
          />
        )}
        {view === "skills" && <LifeSkillsBoard skills={skills} onToggle={handleToggleSkill} catalog={skillsCatalog} />}
        {view === "weekly" && <WeeklyRoundup schedule={schedule} allLog={allLog} fieldTrips={fieldTrips} skills={skills} skillsCatalog={skillsCatalog} />}
        {view === "missed" && <MissedQueue schedule={schedule} allLog={allLog} onReschedule={handleReschedule} onComplete={handleComplete} onSkip={handleSkip} />}
        {view === "admin" && (
          <AdminPanel
            semesters={semesters}
            activeSemesterId={activeSemesterId}
            onSetActive={handleSetActiveSemester}
            onGenerateSchedule={handleGenerateSchedule}
            schedule={schedule}
            allLog={allLog}
            pattern={pattern}
            onUpdatePattern={handleUpdatePattern}
            overrides={overrides}
            onSetOverride={handleSetOverride}
            coursesCatalog={coursesCatalog}
            onUpdateCoursesCatalog={handleUpdateCoursesCatalog}
            onRemoveFromSchedule={handleRemoveFromSchedule}
            skillsCatalog={skillsCatalog}
            onUpdateSkillsCatalog={handleUpdateSkillsCatalog}
            fieldTrips={fieldTrips}
            onUpdateFieldTrips={handleUpdateFieldTrips}
            extracurriculars={extracurriculars}
            onUpdateExtracurriculars={handleUpdateExtracurriculars}
            evaluation={evaluation}
            onUpdateEvaluation={handleUpdateEvaluation}
            alerts={alerts}
            onUpdateAlerts={handleUpdateAlerts}
            alertSettings={alertSettings}
            onUpdateAlertSettings={handleUpdateAlertSettings}
            grades={grades}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(10,15,30,0.95)", borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(10px)", display: "flex", justifyContent: "space-around",
        padding: "10px 0 14px",
      }}>
        {navItems.map(item => {
          const isActive = view === item.key;
          const hasBadge = item.key === "missed" && missedCount > 0;
          return (
            <button key={item.key} onClick={() => setView(item.key)} style={{
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: isActive ? "#f59e0b" : "#475569", padding: "0 12px",
              transition: "color 0.15s", position: "relative",
            }}>
              <Icon name={item.icon} size={22} />
              <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              {hasBadge && (
                <div style={{
                  position: "absolute", top: -2, right: 6,
                  background: "#f87171", borderRadius: "50%",
                  width: 16, height: 16, fontSize: 10, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
                }}>{missedCount}</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
