// School-day keys are "YYYY-MM-DD" in the browser's local time. Date.toISOString()
// gives the UTC date, which rolls to tomorrow in the evening in the Americas, so
// build keys from local parts instead. Real timestamps (exportedAt, savedAt) stay UTC.

export function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Noon local, so adding or subtracting days stays on the right date across daylight-saving changes.
export function dateFromKey(key) {
  return new Date(key + "T12:00:00");
}
