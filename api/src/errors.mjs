// Small helpers for validating request bodies and reporting problems.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const bad = (message) => new HttpError(400, message);

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^\d{2}:\d{2}$/;

export const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function reqDate(value, what = "date") {
  if (typeof value !== "string" || !DATE_RE.test(value)) throw bad(`${what} must look like YYYY-MM-DD, got ${JSON.stringify(value)}`);
  return value;
}
export function reqString(value, what) {
  if (typeof value !== "string" || value.trim() === "") throw bad(`${what} must be a non-empty string`);
  return value;
}
export function reqObject(value, what) {
  if (!isObj(value)) throw bad(`${what} must be a JSON object`);
  return value;
}
export function reqArray(value, what) {
  if (!Array.isArray(value)) throw bad(`${what} must be a JSON array`);
  return value;
}
export function optInt(value, what) {
  if (value === undefined || value === null) return null;
  if (!Number.isInteger(value)) throw bad(`${what} must be a whole number`);
  return value;
}
export function optString(value, what) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw bad(`${what} must be text`);
  return value;
}
export function dayList(value, what) {
  const arr = reqArray(value ?? [], what);
  for (const d of arr) if (!Number.isInteger(d) || d < 0 || d > 6) throw bad(`${what} must contain day numbers 0-6`);
  return arr;
}
