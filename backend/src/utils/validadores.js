/**
 * Helpers de validación repetidos en casi todas las rutas — antes cada
 * archivo tenía su propia copia de `texto`/`CORREO_RE`/`ESTADOS`, y ya se
 * habían desincronizado una vez entre módulos.
 */
export const texto = (v) => String(v ?? '').trim();

export const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ESTADOS = ['Activo', 'Inactivo'];
