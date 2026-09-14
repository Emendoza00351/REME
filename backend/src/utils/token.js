import jwt from 'jsonwebtoken';

/**
 * Sesión real firmada por el servidor. Reemplaza a los headers
 * x-usuario-id/x-rol-id (que el cliente podía poner a cualquier valor para
 * hacerse pasar por ADMIN — ver git history). El secreto sale de
 * JWT_SECRET; sin él el backend no arranca, para no correr nunca con un
 * valor por defecto inseguro.
 */
const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = '12h';

if (!SECRET) {
  throw new Error('Falta JWT_SECRET en las variables de entorno (backend/.env)');
}

export function signToken({ id_usuario, id_rol }) {
  return jwt.sign({ id_usuario, id_rol }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    if (!Number.isFinite(Number(payload.id_rol))) return null;
    return {
      id_usuario: Number.isFinite(Number(payload.id_usuario)) ? Number(payload.id_usuario) : null,
      id_rol: Number(payload.id_rol),
    };
  } catch {
    return null;
  }
}
