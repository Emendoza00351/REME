import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Hash de contraseñas con scrypt del core de Node — evita sumar bcrypt como
 * dependencia mientras no hay BD. Formato guardado: "scrypt$<salt>$<hash>".
 */

const KEYLEN = 64;

export function hashPassword(plano) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(plano), salt, KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(plano, guardado) {
  const [algo, salt, hash] = String(guardado || '').split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const calculado = scryptSync(String(plano), salt, KEYLEN);
  const esperado = Buffer.from(hash, 'hex');
  if (calculado.length !== esperado.length) return false;
  return timingSafeEqual(calculado, esperado);
}
