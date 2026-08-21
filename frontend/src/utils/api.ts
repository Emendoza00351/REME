import { leerSesion } from './session'

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
  return fetch(input, { ...init, headers })
}
