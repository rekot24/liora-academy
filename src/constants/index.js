// Named values used across the app. No magic numbers or strings in components or lib files:
// add the value here, with a comment saying what it is and why it has that value.

// ─── Server sync (see src/lib/syncClient.js) ─────────────────────────────────

/** Base path of the homeschool API. Same origin as the portal; Nginx forwards /api/ to the API container. */
export const API_BASE_PATH = "/api/v1";

/** How often an open tab asks the server whether another device changed anything. */
export const SYNC_POLL_MS = 25000;

/** Wait this long after the last edit before sending, so a burst of edits becomes one request. */
export const SYNC_DEBOUNCE_MS = 800;

/** Retry delays after a network failure (ms). The last value repeats until it succeeds. */
export const SYNC_RETRY_DELAYS_MS = [2000, 5000, 15000, 30000];

/** localStorage key holding edits that were queued but not yet sent (survives a page reload). */
export const STORAGE_KEY_SYNC_PENDING = "hs_sync_pending";

/** localStorage key remembering which student this device shows. */
export const STORAGE_KEY_STUDENT_ID = "hs_student_id";

/** App stores that stay on this device only: PINs, and the derived "missed" list. */
export const LOCAL_ONLY_STORES = ["auth", "missed"];

/**
 * The order stores are sent to the server in. Lessons must exist before they are scheduled,
 * a semester must exist before it can be made active, and so on.
 */
export const SYNC_WRITE_ORDER = [
  "assignments", "skillsCatalog", "semesters", "activeSemester", "pattern", "schedule", "overrides",
  "log", "grades", "skills", "fieldTrips", "extracurriculars", "evaluation", "alerts", "alertSettings",
];
