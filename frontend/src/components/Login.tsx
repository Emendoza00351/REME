import { useState } from 'react'
import type { FormEvent } from 'react'
import { Eye, EyeOff, KeyRound, Loader2, User } from 'lucide-react'
import type { Permisos } from '../context/PermissionsContext'
import { apiFetch } from '../utils/api'

export type Sesion = {
  id_usuario: number
  usuario: string
  nombre: string
  correo: string
  id_rol: number
  rol: string | null
  empleado: string | null
  permisos: Permisos
  token: string
}

export default function Login({ onLogin }: { onLogin: (sesion: Sesion) => void }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (cargando) return
    setError('')
    setCargando(true)
    try {
      const res = await apiFetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'No se pudo iniciar sesión')
        return
      }
      onLogin(data as Sesion)
    } catch {
      setError('No se pudo conectar con el servidor. ¿Está corriendo el backend?')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-yarn login-yarn--a" />
      <div className="login-yarn login-yarn--b" />

      <svg className="login-motif login-motif--tulip" viewBox="0 0 100 140" fill="none">
        <g stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 12 C42 24 37 33 37 43 C37 53 43 59 50 59 C57 59 63 53 63 43 C63 33 58 24 50 12 Z" />
          <path d="M37 43 C22 39 16 28 21 13 C31 18 37 29 37 43 Z" />
          <path d="M63 43 C78 39 84 28 79 13 C69 18 63 29 63 43 Z" />
          <path d="M50 59 C48 85 46 108 50 132" />
          <path d="M49 88 C34 86 27 93 23 103" />
          <path d="M51 99 C66 97 73 104 77 113" />
        </g>
      </svg>

      <svg className="login-motif login-motif--rose" viewBox="0 0 100 140" fill="none">
        <g stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M50 12 C63 11 71 19 68 29 C65 38 54 40 49 34 C46 30 48 24 54 23.5 C57 23 59 26 56.5 28" />
          <path d="M31 30 C23 43 29 56 48 59" />
          <path d="M69 30 C77 43 71 56 52 59" />
          <path d="M50 59 C48 85 46 108 50 132" />
          <path d="M49 88 C35 85 28 92 24 102 C35 102 45 97 49 88 Z" />
          <path d="M46 74 L40 70" strokeWidth="2.4" />
        </g>
      </svg>

      <svg className="login-motif login-motif--ami" viewBox="0 0 100 140" fill="none">
        <g stroke="#8B5E3C" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="36" cy="26" rx="9" ry="21" transform="rotate(-16 36 26)" />
          <ellipse cx="64" cy="26" rx="9" ry="21" transform="rotate(16 64 26)" />
          <circle cx="50" cy="58" r="21" />
          <ellipse cx="50" cy="103" rx="27" ry="25" />
          <ellipse cx="25" cy="98" rx="7" ry="13" transform="rotate(25 25 98)" />
          <ellipse cx="75" cy="98" rx="7" ry="13" transform="rotate(-25 75 98)" />
          <path d="M40 100 q5 3 10 0" strokeWidth="2" />
          <path d="M55 108 q5 3 10 0" strokeWidth="2" />
          <path d="M35 88 q5 3 10 0" strokeWidth="2" />
          <circle cx="43" cy="55" r="1.6" fill="#8B5E3C" stroke="none" />
          <circle cx="57" cy="55" r="1.6" fill="#8B5E3C" stroke="none" />
        </g>
      </svg>

      <div className="login-card">
        <img src="/reme-logo.png" alt="REME" className="login-logo" />
        <h1 className="login-title">Bienvenida de nuevo</h1>
        <p className="login-sub">Iniciá sesión para entrar al panel de REME</p>

        <form className="login-form" onSubmit={submit}>
          {error && <div className="login-error">{error}</div>}

          <div>
            <label className="login-label" htmlFor="login-usuario">Usuario</label>
            <div className="login-input-wrap">
              <User size={15} />
              <input
                id="login-usuario"
                className="field"
                type="text"
                autoComplete="username"
                placeholder="usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="login-label" htmlFor="login-password">Contraseña</label>
            <div className="login-input-wrap">
              <KeyRound size={15} />
              <input
                id="login-password"
                className="field"
                type={verPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setVerPassword((v) => !v)} tabIndex={-1}>
                {verPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button className="login-submit" type="submit" disabled={cargando}>
            {cargando ? <Loader2 size={16} className="animate-spin" /> : null}
            {cargando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>
        </form>

        {import.meta.env.DEV && (
          <p className="login-demo">
            <strong>Usuario de prueba</strong> mientras no hay altas reales:
            {' '}usuario <code>demo</code> · contraseña <code>reme2026</code>
          </p>
        )}
      </div>
    </div>
  )
}
