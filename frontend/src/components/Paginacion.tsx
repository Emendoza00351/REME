type PaginacionProps = {
  pageLimit: number
  onPageLimitChange: (value: number) => void
  paginaActual: number
  totalPaginas: number
  onPrev: () => void
  onNext: () => void
  totalItems: number
  itemsSuffix: string
}

export default function Paginacion({
  pageLimit,
  onPageLimitChange,
  paginaActual,
  totalPaginas,
  onPrev,
  onNext,
  totalItems,
  itemsSuffix,
}: PaginacionProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E4E1] px-3 py-2 text-[12px]">
      <div className="flex items-center gap-2 text-[#7A6656]">
        <span>Mostrar</span>
        <select
          className="field !w-20 !py-1.5"
          value={pageLimit}
          onChange={(e) => onPageLimitChange(Number(e.target.value))}
        >
          {[5, 10, 25, 50].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <span>
          de {totalItems} {itemsSuffix}
        </span>
      </div>

      <div className="flex items-center gap-2 text-[#7A6656]">
        <button className="rounded-md border border-[#D8D8D4] px-2 py-1 hover:bg-[#FFFFFF]" onClick={onPrev}>
          Anterior
        </button>
        <span>
          Pagina {paginaActual} de {totalPaginas}
        </span>
        <button className="rounded-md border border-[#D8D8D4] px-2 py-1 hover:bg-[#FFFFFF]" onClick={onNext}>
          Siguiente
        </button>
      </div>
    </div>
  )
}
