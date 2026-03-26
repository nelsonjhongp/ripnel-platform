import { AlertTriangle, ReceiptText } from "lucide-react"

import { cn } from "@/lib/utils"

export function CashRegisterStatus({
  totalItems = 0,
  subtotal = 0,
  onClear,
  reminderText = "En el siguiente paso se captura la informacion del cliente y luego el metodo de pago.",
  className,
}) {
  return (
    <article
      className={cn(
        "space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6",
        className
      )}
    >
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-slate-800">
        <ReceiptText className="h-4 w-4 text-violet-600" />
        Estado de caja
      </h2>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Items en orden</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</p>
      </div>

      <div className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Subtotal</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">S/. {subtotal.toFixed(2)}</p>
      </div>

      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          Recordatorio de flujo
        </p>
        <p className="mt-1">{reminderText}</p>
      </div>

      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Limpiar orden actual
        </button>
      )}
    </article>
  )
}

export default CashRegisterStatus
