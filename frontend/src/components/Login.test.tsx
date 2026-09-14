import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Login from './Login'

vi.mock('../utils/api', () => ({
  apiFetch: vi.fn(() => Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ error: 'Usuario o contraseña incorrectos' }),
  })),
}))

describe('Login', () => {
  it('muestra el error del backend cuando las credenciales son inválidas', async () => {
    const onLogin = vi.fn()
    render(<Login onLogin={onLogin} />)

    fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'demo' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mal' } })
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }))

    await waitFor(() => expect(screen.getByText('Usuario o contraseña incorrectos')).toBeInTheDocument())
    expect(onLogin).not.toHaveBeenCalled()
  })
})
