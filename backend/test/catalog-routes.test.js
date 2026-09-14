import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';
import { cargarPermisosDesdeDB } from '../src/middleware/permisos.js';

const waitForServer = (server) => new Promise((resolve) => server.once('listening', resolve));

/* app.listen() no pasa por arrancar() (eso solo corre cuando index.js se
   ejecuta directamente), así que la matriz de permisos en memoria nunca se
   cargaría desde permisos_rol y todas las rutas protegidas devolverían 403
   sin importar el token. Se carga una vez acá para que los tests reflejen
   los permisos reales ya sembrados en la base local. */
await cargarPermisosDesdeDB();

/* Arranca un server efímero y hace login como "demo" para obtener un token
   válido — desde que /login exige credenciales reales (ver permisos.js),
   las rutas protegidas ya no responden sin "Authorization: Bearer <token>". */
async function crearServidorAutenticado() {
  const server = app.listen(0);
  await waitForServer(server);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const loginRes = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'demo', password: 'reme2026' }),
  });
  assert.equal(loginRes.status, 200);
  const sesion = await loginRes.json();

  const authFetch = (path, init = {}) => fetch(`${base}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), Authorization: `Bearer ${sesion.token}` },
  });

  return { server, authFetch };
}

test('sin token no se puede acceder a una ruta protegida', async () => {
  const server = app.listen(0);
  await waitForServer(server);
  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/api/productos`);
  assert.equal(res.status, 401);

  server.close();
});

test('endpoint catalogo disponible', async () => {
  const { server, authFetch } = await crearServidorAutenticado();

  const res = await authFetch('/api/productos');
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Array.isArray(data));

  server.close();
});

test('endpoints de pedidos y facturacion disponibles', async () => {
  const { server, authFetch } = await crearServidorAutenticado();

  const pedidosRes = await authFetch('/api/pedidos');
  assert.equal(pedidosRes.status, 200);
  const pedidos = await pedidosRes.json();
  assert.ok(Array.isArray(pedidos));

  const facturacionRes = await authFetch('/api/facturacion');
  assert.equal(facturacionRes.status, 200);
  const facturas = await facturacionRes.json();
  assert.ok(Array.isArray(facturas));

  server.close();
});

test('pedido con varios productos calcula total y anticipo del 50%', async () => {
  const { server, authFetch } = await crearServidorAutenticado();

  const res = await authFetch('/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cliente: 'Ana',
      producto: 'Tulipa x 2, Rosa x 3',
      cantidad: 5,
      precio_unidad: 160,
      total: 820,
      adelanto: 410,
      fecha_pedido: '2026-08-18',
      fecha_entrega: '2026-08-25',
      app: 'Wapp',
      direccion: 'San Pedro Sula',
      estado: 'pendiente',
      tipo_pago: 'Banco',
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(Number(data.total), 820);
  assert.equal(Number(data.adelanto), 410);
  assert.equal(Number(data.saldo_restante), 410);
  assert.match(String(data.producto), /Tulipa|Rosa/);

  server.close();
});
