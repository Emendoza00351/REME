import { leerSesion } from './session'

/**
 * En dev, Vite hace proxy de /api hacia el backend (mismo origen, ver
 * vite.config.ts). En producción, frontend y backend son dos servicios de
 * Railway con dominios distintos, así que hace falta la URL absoluta del
 * backend — se inyecta en build time vía VITE_API_URL.
 */
const API_BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * fetch() que identifica al usuario logueado ante el backend (headers
 * x-usuario-id / x-rol-id). Sin esto el backend no sabe quién hace cada
 * petición y la bitácora quedaría con "Desconocido" en todo.
 */
export function apiFetch(input: string, init: RequestInit = {}) {
  const sesion = leerSesion()
  const headers = new Headers(init.headers)
  if (sesion?.id_usuario) headers.set('x-usuario-id', String(sesion.id_usuario))
  if (sesion?.id_rol) headers.set('x-rol-id', String(sesion.id_rol))
  const url = input.startsWith('/') ? `${API_BASE}${input}` : input
  return fetch(url, { ...init, headers })
}
