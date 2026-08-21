import CrudModule from '../components/CrudModule'
import type { RowRecord } from '../components/CrudModule'
import type { ModuleCommand } from '../types/module'

const DEFAULT_ROWS: RowRecord[] = [
  { id: 1, cp: 1, producto: 'Tulipanes', precioRef: 160, categoria: 'Flores', estado: 'activo' },
  { id: 2, cp: 2, producto: 'Girasoles', precioRef: 200, categoria: 'Flores', estado: 'activo' },
  { id: 3, cp: 68, producto: 'llavero', precioRef: 350, categoria: 'Accesorios', estado: 'activo' },
  { id: 4, cp: 80, producto: 'Personalizado', precioRef: 1100, categoria: 'Custom', estado: 'activo' },
  { id: 5, cp: 83, producto: 'fundas para audifonos de diadema', precioRef: 623.3333333, categoria: 'Accesorios', estado: 'activo' },
]

export default function CodigosModule({ command }: { command: ModuleCommand }) {
  return (
    <CrudModule
      moduleKey="codigos"
      title="Tabla de Codigos"
      subtitle="Catalogo C.P de producto tomado de la hoja VENTAS"
      command={command}
      tableColumns={[
        { label: 'C.P', key: 'cp' },
        { label: 'Producto', key: 'producto' },
        { label: 'Precio referencia', key: 'precioRef' },
        { label: 'Categoria', key: 'categoria' },
        { label: 'Estado', key: 'estado' },
      ]}
      formFields={[
        { key: 'cp', label: 'Codigo de producto (C.P)', type: 'number', required: true },
        { key: 'producto', label: 'Nombre producto', type: 'text', required: true },
        { key: 'precioRef', label: 'Precio referencia', type: 'number', required: true },
        { key: 'categoria', label: 'Categoria', type: 'text', required: false },
        { key: 'estado', label: 'Estado', type: 'select', options: ['activo', 'inactivo'], required: true },
      ]}
      initialRows={DEFAULT_ROWS}
    />
  )
}
