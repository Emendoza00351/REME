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

/* Revocación de sesión al hacer logout. El JWT es stateless por diseño (el
   backend no guarda sesiones), así que un logout no puede "borrar" el token
   — lo que sí puede hacer es llevar, en memoria, un contador de versión por
   usuario que se graba dentro del propio token al firmarlo. Un logout
   incrementa el contador: cualquier token firmado con una versión anterior
   deja de servir en el acto, aunque su firma y expiración sigan siendo
   válidas, mientras que un login inmediatamente posterior firma con la
   versión ya incrementada y sigue funcionando. Usar un contador en vez de
   comparar contra la hora del logout evita la carrera de "login y logout en
   el mismo segundo" que un `iat` con granularidad de segundos no podría
   distinguir. Igual que la caché de permisos, esto vive solo en memoria: un
   reinicio del backend la limpia (aceptable acá, el token igual expira solo
   a las 12h). */
const version = new Map(); // id_usuario -> número de versión

const versionActual = (idUsuario) => version.get(idUsuario) ?? 0;

export function revocarSesionesDe(idUsuario) {
  if (idUsuario != null) version.set(idUsuario, versionActual(idUsuario) + 1);
}

export function signToken({ id_usuario, id_rol }) {
  return jwt.sign({ id_usuario, id_rol, v: versionActual(id_usuario) }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    const payload = jwt.verify(token, SECRET);
    if (!Number.isFinite(Number(payload.id_rol))) return null;
    const idUsuario = Number.isFinite(Number(payload.id_usuario)) ? Number(payload.id_usuario) : null;

    if (idUsuario != null && Number(payload.v ?? 0) !== versionActual(idUsuario)) return null;

    return { id_usuario: idUsuario, id_rol: Number(payload.id_rol) };
  } catch {
    return null;
  }
}
