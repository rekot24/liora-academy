// WHO IS CALLING? — the single place identity is decided.
//
// Today the portal is used by one family, from the home network or through Cloudflare Access,
// so every request is treated as the owner of that one household. When other families, or
// per-person logins, arrive, this is the only function to change:
//   * Cloudflare Access sends the verified email in the `Cf-Access-Authenticated-User-Email`
//     header (trust it only for requests that really came through the tunnel).
//   * Look that email up in `household_members` to find the household, role and, for
//     role 'student', which student they are.
// Everything else in the API only ever asks for `caller.householdId`, so nothing else changes.

import { HttpError } from "./errors.mjs";

export function makeResolveCaller(db, { householdId: fixedId = null } = {}) {
  let cached = fixedId;
  return async function resolveCaller(request) {
    if (!cached) {
      const { rows } = await db.query("SELECT id FROM households WHERE archived_at IS NULL ORDER BY created_at");
      if (rows.length === 0) throw new HttpError(503, "no household exists yet: run the import first");
      if (rows.length > 1) throw new HttpError(500, "more than one household exists; set HOUSEHOLD_ID or implement per-user lookup in auth.mjs");
      cached = rows[0].id;
    }
    return {
      householdId: cached,
      role: "owner",
      email: request.headers["cf-access-authenticated-user-email"] ?? null,
    };
  };
}
