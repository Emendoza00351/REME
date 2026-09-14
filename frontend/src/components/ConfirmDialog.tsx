import { AlertTriangle, X } from 'lucide-react'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', danger = false, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="reme-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="reme-dialog" role="dialog" aria-modal="true" aria-labelledby="reme-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="reme-dialog-close" type="button" onClick={onCancel} aria-label="Cerrar"><X size={16} /></button>
        <div className={`reme-dialog-icon ${danger ? 'reme-dialog-icon--danger' : ''}`}><AlertTriangle size={20} /></div>
        <h2 id="reme-dialog-title">{title}</h2>
        <p>{message}</p>
        <div className="reme-dialog-actions"><button className="reme-dialog-cancel" type="button" onClick={onCancel}>Cancelar</button><button className={`reme-dialog-confirm ${danger ? 'reme-dialog-confirm--danger' : ''}`} type="button" onClick={onConfirm}>{confirmLabel}</button></div>
      </section>
    </div>
  )
}
