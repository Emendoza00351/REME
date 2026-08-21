import { useEffect, useState } from 'react'
import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'
import { apiFetch } from '../utils/api'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, usuario: 'admin', nombre: 'REMEDIOS MENDOZA', correo: 'reme@remecrochet.hn', empleado: 'REMEDIOS MENDOZA', rol: 'ADMIN', estado: 'Activo', ultimoAcceso: '' },
  { id: 2, usuario: 'ana', nombre: 'ANA LOPEZ', correo: 'ana@remecrochet.hn', empleado: 'ANA LOPEZ', rol: 'VENDEDOR', estado: 'Activo', ultimoAcceso: '' },
  { id: 3, usuario: 'demo', nombre: 'DEMO', correo: 'demo@remecrochet.hn', empleado: '', rol: 'ADMIN', estado: 'Activo', ultimoAcceso: '' },
]

type Ref = { id: number; nombre: string }
type EmpleadoRef = Ref & { dni: string; correo: string; telefono: string }

export default function UsuariosModule({ command }: { command: ModuleCommand }) {
  const [roles, setRoles] = useState<Ref[]>([])
  const [empleados, setEmpleados] = useState<EmpleadoRef[]>([])

  useEffect(() => {
    apiFetch('/api/roles').then((r) => r.json()).then((rows) => {
      setRoles(Array.isArray(rows) ? rows.map((r) => ({ id: Number(r.id_rol), nombre: r.nombre })) : [])
    }).catch(() => {})

    apiFetch('/api/empleados').then((r) => r.json()).then((rows) => {
      setEmpleados(Array.isArray(rows) ? rows.map((e) => ({
        id: Number(e.id_empleado), nombre: e.nombre, dni: e.dni ?? '', correo: e.correo ?? '', telefono: e.telefono ?? '',
      })) : [])
    }).catch(() => {})
  }, [])

  const normalizeRow = (row: Record<string, any>): RowRecord => ({
    id: Number(row.id ?? row.id_usuario ?? 0),
    usuario: row.usuario ?? '',
    nombre: row.nombre ?? '',
    correo: row.correo ?? '',
    password: '',
    empleado: row.empleado ?? '',
    rol: row.rol ?? '',
    estado: row.estado ?? 'Activo',
    ultimoAcceso: row.ultimo_acceso ?? row.ultimoAcceso ?? '',
  })

  // Al elegir el empleado, Usuario/Correo/Teléfono (solo lectura) se autocompletan con sus datos.
  const deriveForm = (form: Record<string, string>, changedKey: string) => {
    if (changedKey !== 'empleado') return
    const empleado = empleados.find((e) => e.nombre === form.empleado)
    return {
      usuario: empleado?.dni ?? '',
      correo: empleado?.correo ?? '',
      telefono: empleado?.telefono ?? '',
    }
  }

  const serializePayload = (payload: Record<string, string | number>) => {
    const rol = roles.find((r) => r.nombre === payload.rol)
    const empleado = empleados.find((e) => e.nombre === payload.empleado)

    // Nombre/Usuario ya no se escriben a mano: salen del empleado vinculado.
    // Teléfono es solo informativo acá — no existe esa columna en "usuarios".
    const body: Record<string, any> = {
      nombre: empleado?.nombre ?? '',
      correo: payload.correo,
      estado: payload.estado,
      id_rol: rol?.id,
      id_empleado: empleado?.id ?? null,
    }
    if (String(payload.password ?? '').trim()) body.password = payload.password
    return body
  }

  return (
    <CrudModule
      moduleKey="usuarios"
      title="Panel de Usuarios"
      subtitle="Cuentas de acceso al sistema y su rol"
      command={command}
      apiUrl="/api/usuarios"
      normalizeRow={normalizeRow}
      serializePayload={serializePayload}
      deriveForm={deriveForm}
      tableColumns={[
        { label: 'Usuario', key: 'usuario' },
        { label: 'Nombre', key: 'nombre' },
        { label: 'Correo', key: 'correo' },
        { label: 'Empleado', key: 'empleado' },
        { label: 'Rol', key: 'rol' },
        { label: 'Estado', key: 'estado' },
      ]}
      formFields={[
        { key: 'empleado', label: 'Empleado', type: 'select', options: empleados.map((e) => e.nombre), required: true },
        { key: 'usuario', label: 'Usuario (automático, DNI del empleado)', type: 'text', required: true, readOnly: true },
        { key: 'correo', label: 'Correo (automático)', type: 'text', required: true, readOnly: true },
        { key: 'telefono', label: 'Teléfono (automático)', type: 'text', required: false, readOnly: true },
        { key: 'password', label: 'Contraseña (mín. 8 caracteres)', type: 'text', required: false },
        { key: 'rol', label: 'Rol', type: 'select', options: roles.map((r) => r.nombre), required: true },
        { key: 'estado', label: 'Estado', type: 'select', options: ['Activo', 'Inactivo'], required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}
