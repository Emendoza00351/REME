import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/index.js';

const waitForServer = (server) => new Promise((resolve) => server.once('listening', resolve));

test('endpoint catalogo disponible', async () => {
  const server = app.listen(0);
  await waitForServer(server);

  const port = server.address().port;
  const res = await fetch(`http://127.0.0.1:${port}/api/productos`);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Array.isArray(data));

  server.close();
});

test('endpoints de pedidos y facturacion disponibles', async () => {
  const server = app.listen(0);
  await waitForServer(server);

  const port = server.address().port;

  const pedidosRes = await fetch(`http://127.0.0.1:${port}/api/pedidos`);
  assert.equal(pedidosRes.status, 200);
  const pedidos = await pedidosRes.json();
  assert.ok(Array.isArray(pedidos));

  const facturacionRes = await fetch(`http://127.0.0.1:${port}/api/facturacion`);
  assert.equal(facturacionRes.status, 200);
  const facturas = await facturacionRes.json();
  assert.ok(Array.isArray(facturas));

  server.close();
});

test('pedido con varios productos calcula total y anticipo del 50%', async () => {
  const server = app.listen(0);
  await waitForServer(server);

  const port = server.address().port;

  const res = await fetch(`http://127.0.0.1:${port}/api/pedidos`, {
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
