# REME Crochet — ERP

Panel operativo de REME: pedidos, gastos, facturación, clientes, catálogo,
inventario y resultados. Backend Express + PostgreSQL con autenticación JWT
(`backend/`), frontend React + Vite (`frontend/`).

## Desarrollo local

Cada subproyecto se corre por separado — ver `backend/README.md` y
`frontend/README.md` para el detalle de cada uno.

```bash
cd backend  && npm install && cp .env.example .env   # completar PGPASSWORD y JWT_SECRET
npm run db:setup && npm run dev                        # http://localhost:3001

cd frontend && npm install && npm run dev               # http://localhost:5173
```

`start-dev.bat` levanta ambos a la vez en Windows.

## Con Docker

```bash
cp .env.example .env   # completar POSTGRES_PASSWORD y JWT_SECRET
docker compose up --build
```

Levanta Postgres, backend (`:3001`) y frontend (`:5173`) — migraciones y seed
corren solos al arrancar el backend.

## CI

`.github/workflows/ci.yml` corre los tests de cada subproyecto (con un
Postgres de servicio para el backend) y el build del frontend en cada push y
pull request contra `master`.
