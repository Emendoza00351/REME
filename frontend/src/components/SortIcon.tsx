import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'

export default function SortIcon({ activo, direccion }: { activo: boolean; direccion: 'asc' | 'desc' }) {
  if (!activo) return <ChevronsUpDown size={11} className="opacity-30" />
  return direccion === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
}

export function ThOrdenable<T extends Record<string, unknown>>({
  label,
  campo,
  columna,
  direccion,
  onClick,
  className = '',
}: {
  label: string
  campo: keyof T
  columna: keyof T | null
  direccion: 'asc' | 'desc'
  onClick: (campo: keyof T) => void
  className?: string
}) {
  const activo = columna === campo
  return (
    <th
      onClick={() => onClick(campo)}
      className={`cursor-pointer select-none px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.03em] text-[#7A6656] hover:bg-black/5 ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon activo={activo} direccion={direccion} />
      </span>
    </th>
  )
}
