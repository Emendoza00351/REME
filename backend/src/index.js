import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import empleadosRoutes from './routes/empleados.js';
import usuariosRoutes from './routes/usuarios.js';
import rolesRoutes from './routes/roles.js';
import productosRoutes from './routes/productos.js';
import clientesRoutes from './routes/clientes.js';
import pedidosRoutes from './routes/pedidos.js';
import facturacionRoutes from './routes/facturacion.js';
import resultadosRoutes from './routes/resultados.js';
import gastosRoutes from './routes/gastos.js';
import inventarioRoutes from './routes/inventario.js';
import auditoriaRoutes from './routes/auditoria.js';
import { pool } from './store/db.js';
import { ejecutarMigracionesPendientes } from './store/migrar.js';
import { empleados, roles, usuarios, seedBaseSiVacio } from './store/seed.js';
import { seedCatalogoSiVacio } from './store/catalogo.js';
import { seedPermisosSiVacio } from './middleware/permisos.js';

export const app = express();
const PORT = Number(process.env.PORT) || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '8mb' }));

/* ── Raíz informativa ── */
app.get('/', (_req, res) => {
  res.json({
    service: 'REME Crochet — Backend ERP',
    status: 'ok',
    persistencia: `PostgreSQL (${process.env.PGDATABASE || 'reme'})`,
    frontend: FRONTEND_URL,
    health: '/api/health',
  });
});

/* ── Health check ── */
app.get('/api/health', async (_req, res, next) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      persistencia: `postgresql:${process.env.PGDATABASE || 'reme'}`,
      registros: {
        empleados: await empleados.count(),
        usuarios: await usuarios.count(),
        roles: await roles.count(),
      },
    });
  } catch (err) { next(err); }
});

/* ── Módulos ── */
app.use('/api', authRoutes);
app.use('/api', empleadosRoutes);
app.use('/api', usuariosRoutes);
app.use('/api', rolesRoutes);
app.use('/api', productosRoutes);
app.use('/api', clientesRoutes);
app.use('/api', pedidosRoutes);
app.use('/api', facturacionRoutes);
app.use('/api', resultadosRoutes);
app.use('/api', gastosRoutes);
app.use('/api', inventarioRoutes);
app.use('/api', auditoriaRoutes);

/* ── 404 de API ── */
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

/* ── Manejador de errores ── */
app.use((err, _req, res, _next) => {
  // JSON mal formado llega hasta acá desde express.json()
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido en el cuerpo de la petición' });
  }
  console.error('[error]', err);
  const mensaje = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : (err?.message || 'Error interno del servidor');
  res.status(500).json({ error: mensaje });
});

async function arrancar() {
  await pool.query('SELECT 1'); // falla rápido y claro si Postgres no está arriba

  await ejecutarMigracionesPendientes();
  await seedBaseSiVacio();
  const admin = await roles.findBy('nombre', 'ADMIN');
  const gerente = await roles.findBy('nombre', 'GERENTE');
  const vendedor = await roles.findBy('nombre', 'VENDEDOR');
  await seedPermisosSiVacio(admin.id_rol, gerente.id_rol, vendedor.id_rol);
  await seedCatalogoSiVacio();

  app.listen(PORT, () => {
    console.log(`REME backend escuchando en http://localhost:${PORT}`);
    console.log(`  persistencia : PostgreSQL (${process.env.PGDATABASE || 'reme'}) en ${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}`);
    console.log(`  frontend     : ${FRONTEND_URL}`);
  });
}

if (isDirectRun) {
  arrancar().catch((err) => {
    console.error('No se pudo arrancar el backend:', err.message);
    console.error('¿Está PostgreSQL corriendo y backend/.env bien configurado? (node scripts/check-db.mjs para probar)');
    process.exit(1);
  });
}
