// Builds the HTTP app. Kept separate from index.mjs so tests can create it with an in-memory
// database and call it with app.inject(), no network needed.

import Fastify from "fastify";
import { exportLegacySnapshot } from "../../db/lib/legacy.mjs";
import { makeResolveCaller } from "./auth.mjs";
import { HttpError, isObj } from "./errors.mjs";
import * as ops from "./ops.mjs";

export async function buildApp({ db, householdId = null, logger = false } = {}) {
  const app = Fastify({ logger, bodyLimit: 5 * 1024 * 1024 });
  const resolveCaller = makeResolveCaller(db, { householdId });

  app.setErrorHandler((err, request, reply) => {
    if (err instanceof HttpError) return reply.status(err.status).send({ error: err.message });
    if (err.validation || err.statusCode === 400 || err.code === "FST_ERR_CTP_INVALID_JSON_BODY") return reply.status(400).send({ error: err.message });
    // Postgres "data exception" class (e.g. an impossible date like 2026-02-31)
    if (typeof err.code === "string" && err.code.startsWith("22")) return reply.status(400).send({ error: `invalid value: ${err.message}` });
    request.log.error(err);
    return reply.status(500).send({ error: "internal error" });
  });

  // A write endpoint: resolves the caller, checks the student belongs to their household,
  // runs the operation in one transaction, returns its result.
  const studentWrite = (method, path, op) =>
    app.route({
      method,
      url: `/api/v1/students/:studentId/${path}`,
      handler: async (request) => {
        const caller = await resolveCaller(request);
        return db.tx(async (tx) => {
          await ops.requireStudent(tx, caller.householdId, request.params.studentId);
          return op(tx, { householdId: caller.householdId, studentId: request.params.studentId }, request.body ?? {});
        });
      },
    });

  const householdWrite = (method, path, op) =>
    app.route({
      method,
      url: `/api/v1/${path}`,
      handler: async (request) => {
        const caller = await resolveCaller(request);
        return db.tx((tx) => op(tx, { householdId: caller.householdId }, request.body ?? {}));
      },
    });

  // ── reads ──
  app.get("/api/v1/health", async () => {
    const { rows } = await db.query("SELECT 1 AS ok");
    return { ok: rows[0].ok === 1 };
  });

  app.get("/api/v1/me", async (request) => {
    const caller = await resolveCaller(request);
    const { rows: h } = await db.query("SELECT id, name FROM households WHERE id = $1", [caller.householdId]);
    const { rows: students } = await db.query(
      "SELECT id, name, grade_label AS \"gradeLabel\" FROM students WHERE household_id = $1 AND archived_at IS NULL ORDER BY sort_order, name",
      [caller.householdId]
    );
    return { household: h[0], role: caller.role, students };
  });

  // Everything the app needs for one student, in the same shape the app already uses.
  app.get("/api/v1/students/:studentId/snapshot", async (request) => {
    const caller = await resolveCaller(request);
    await ops.requireStudent(db, caller.householdId, request.params.studentId);
    const snapshot = await exportLegacySnapshot(db, request.params.studentId);
    return { exportedAt: new Date().toISOString(), ...snapshot };
  });

  // ── per-student writes ──
  studentWrite("PATCH", "log", ops.patchLog);
  studentWrite("PATCH", "grades", ops.patchGrades);
  studentWrite("PATCH", "skills", ops.patchSkills);
  studentWrite("PATCH", "alerts", ops.patchAlerts);
  studentWrite("PATCH", "schedule", ops.patchSchedule);
  studentWrite("PATCH", "overrides", ops.patchOverrides);
  studentWrite("PUT", "pattern", ops.putPattern);
  studentWrite("PUT", "semesters", ops.putSemesters);
  studentWrite("PUT", "field-trips", ops.putFieldTrips);
  studentWrite("PUT", "extracurriculars", ops.putExtracurriculars);
  studentWrite("PUT", "evaluation", ops.putEvaluation);
  studentWrite("PUT", "alert-settings", ops.putAlertSettings);

  // ── household-wide writes ──
  householdWrite("PATCH", "catalog", ops.patchCatalog);
  householdWrite("PUT", "life-skills", ops.putLifeSkills);
  householdWrite("POST", "students", async (tx, ctx, body) => {
    if (!isObj(body)) throw new HttpError(400, "body must be a JSON object");
    return ops.createStudent(tx, ctx, body);
  });

  return app;
}
