import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { cargarPermisosDesdeDB } from '../src/middleware/permisos.js';

const waitForServer = (server) => new Promise((resolve) => server.once('listening', resolve));

await cargarPermisosDesdeDB();

test('POST /login se bloquea tras demasiados intentos desde la misma IP', async () => {
  const server = app.listen(0);
  await waitForServer(server);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  try {
    let ultima;
    for (let i = 0; i < 11; i += 1) {
      ultima = await fetch(`${base}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: 'demo', password: 'password-equivocado' }),
      });
    }
    assert.equal(ultima.status, 429);
  } finally {
    server.close();
  }
});
