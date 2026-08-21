import type { Sesion } from '../components/Login'

export const SESION_KEY = 'reme_sesion'

export function leerSesion(): Sesion | null {
  try {
    const raw = localStorage.getItem(SESION_KEY)
    return raw ? (JSON.parse(raw) as Sesion) : null
  } catch {
    return null
  }
}
