import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { cargarPermisosDesdeDB } from '../src/middleware/permisos.js';

const waitForServer = (server) => new Promise((resolve) => server.once('listening', resolve));

await cargarPermisosDesdeDB();

async function crearServidor() {
  const server = app.listen(0);
  await waitForServer(server);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  return { server, base };
}

async function login(base, usuario, password) {
  return fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password }),
  });
}

test('contraseña incorrecta no autentica', async () => {
  const { server, base } = await crearServidor();
  try {
    const res = await login(base, 'demo', 'password-equivocado');
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /incorrectos/);
  } finally {
    server.close();
  }
});

test('usuario inexistente responde igual que contraseña incorrecta (sin enumerar usuarios)', async () => {
  const { server, base } = await crearServidor();
  try {
    const res = await login(base, 'no-existe-este-usuario', 'cualquiera');
    assert.equal(res.status, 401);
  } finally {
    server.close();
  }
});

test('usuario inactivo no puede iniciar sesión', async () => {
  const { server, base } = await crearServidor();
  try {
    const { token } = await (await login(base, 'demo', 'reme2026')).json();
    const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fixture propia (DNI/correo aleatorios) en vez de depender de datos
    // sembrados: la base local ya tiene usuarios reales, no solo los de seed.js.
    const sufijo = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const dni = `9999-9999-${sufijo.slice(-5)}`;

    const roles = await (await fetch(`${base}/api/roles`, { headers: authHeaders })).json();
    const idRol = (roles.find((r) => r.nombre === 'VENDEDOR') ?? roles[0]).id_rol;

    const empleado = await (await fetch(`${base}/api/empleados`, {
      method: 'POST', headers: authHeaders,
      body: JSON.stringify({ dni, nombre: 'EMPLEADO DE PRUEBA', correo: `prueba.${sufijo}@test.hn` }),
    })).json();

    try {
      const usuario = await (await fetch(`${base}/api/usuarios`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({
          nombre: 'EMPLEADO DE PRUEBA', correo: `cuenta.${sufijo}@test.hn`,
          password: 'clave-prueba-123', estado: 'Inactivo',
          id_empleado: empleado.id_empleado, id_rol: idRol,
        }),
      })).json();

      try {
        const bloqueado = await login(base, usuario.usuario, 'clave-prueba-123');
        assert.equal(bloqueado.status, 403);
        const data = await bloqueado.json();
        assert.match(data.error, /inactivo/);
      } finally {
        await fetch(`${base}/api/usuarios/${usuario.id_usuario}`, { method: 'DELETE', headers: authHeaders });
      }
    } finally {
      await fetch(`${base}/api/empleados/${empleado.id_empleado}`, { method: 'DELETE', headers: authHeaders });
    }
  } finally {
    server.close();
  }
});

test('logout revoca el token: pedidos con el token viejo pasa a 401', async () => {
  const { server, base } = await crearServidor();
  try {
    const loginRes = await login(base, 'demo', 'reme2026');
    const { token } = await loginRes.json();
    const authFetch = (path, init = {}) => fetch(`${base}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` },
    });

    const antes = await authFetch('/api/productos');
    assert.equal(antes.status, 200);

    const logoutRes = await authFetch('/api/logout', { method: 'POST' });
    assert.equal(logoutRes.status, 200);

    const despues = await authFetch('/api/productos');
    assert.equal(despues.status, 401);
  } finally {
    server.close();
  }
});

test('logout no afecta una sesión nueva del mismo usuario', async () => {
  const { server, base } = await crearServidor();
  try {
    const sesionVieja = await (await login(base, 'demo', 'reme2026')).json();
    await fetch(`${base}/api/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sesionVieja.token}` },
    });

    const sesionNueva = await (await login(base, 'demo', 'reme2026')).json();
    const res = await fetch(`${base}/api/productos`, {
      headers: { Authorization: `Bearer ${sesionNueva.token}` },
    });
    assert.equal(res.status, 200);
  } finally {
    server.close();
  }
});
