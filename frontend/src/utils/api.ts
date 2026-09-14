import { leerSesion } from './session'

/**
 * En dev, Vite hace proxy de /api hacia el backend (mismo origen, ver
 * vite.config.ts). En producción, frontend y backend son dos servicios de
 * Railway con dominios distintos, así que hace falta la URL absoluta del
 * backend — se inyecta en build time vía VITE_API_URL.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? ''

/** Se dispara cuando el backend rechaza el token (expirado o inválido), para
 * que App.tsx cierre la sesión y vuelva a la pantalla de login. */
export const SESION_EXPIRADA_EVENT = 'erp-sesion-expirada'

/**
 * fetch() que identifica al usuario logueado ante el backend con el token
 * firmado que devuelve /api/login (Authorization: Bearer <token>). Antes se
 * mandaban x-usuario-id/x-rol-id sin firmar — cualquiera podía editarlos en
 * el navegador y hacerse pasar por otro usuario o rol.
 */
export function apiFetch(input: string, init: RequestInit = {}) {
  const sesion = leerSesion()
  const headers = new Headers(init.headers)
  if (sesion?.token) headers.set('Authorization', `Bearer ${sesion.token}`)
  const url = input.startsWith('/') ? `${API_BASE}${input}` : input

  return fetch(url, { ...init, headers }).then((res) => {
    if (res.status === 401 && sesion) {
      window.dispatchEvent(new CustomEvent(SESION_EXPIRADA_EVENT))
    }
    return res
  })
}
