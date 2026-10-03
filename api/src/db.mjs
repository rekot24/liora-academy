// A tiny database wrapper: query() for one-off statements, tx(fn) for a transaction.
// Every write endpoint runs inside tx(), so a request either applies completely or not at all.

export function pgAdapter(pool) {
  return {
    query: (text, params) => pool.query(text, params),
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (err) {
        try { await client.query("ROLLBACK"); } catch { /* connection already gone */ }
        throw err;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
}

// For tests: PGlite is a single in-process connection, so requests take turns.
export function pgliteAdapter(pglite) {
  let chain = Promise.resolve();
  const exclusive = (fn) => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };
  return {
    query: (text, params) => exclusive(() => pglite.query(text, params)),
    tx: (fn) =>
      exclusive(async () => {
        await pglite.exec("BEGIN");
        try {
          const result = await fn({ query: (t, p) => pglite.query(t, p) });
          await pglite.exec("COMMIT");
          return result;
        } catch (err) {
          try { await pglite.exec("ROLLBACK"); } catch { /* nothing open */ }
          throw err;
        }
      }),
    end: async () => {},
  };
}
