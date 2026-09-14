import { Component } from 'react'
import type { ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

/* Sin esto, cualquier excepción durante el render (p. ej. un gestor de
   contraseñas del navegador insertando nodos en el formulario de login y
   descolocando el árbol que React espera) tumba toda la app y deja la
   pantalla en blanco, sin ningún mensaje. Con este boundary al menos se
   ve algo recuperable. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '1rem',
          padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif',
        }}>
          <h1 style={{ fontSize: '1.25rem' }}>Algo salió mal</h1>
          <p style={{ color: '#666', maxWidth: '28rem' }}>
            Si tenés un gestor de contraseñas u otra extensión activa en el navegador,
            probá desactivarla para este sitio. Si el problema sigue, recargá la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none',
              background: '#8B5E3C', color: 'white', cursor: 'pointer', fontSize: '0.9rem',
            }}
          >
            Recargar
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
