import { Stepper } from "@/components/ui/stepper"
import { cn } from "@/lib/utils"

const DEFAULT_STEPS = [
  { id: "purchase-order", label: "Orden de compra" },
  { id: "customer-data", label: "Datos del cliente" },
  { id: "confirmation", label: "Confirmacion y pago" },
]

export function PosHeader({
  title = "Sistema de compra para cajero",
  subtitle = "Flujo interno de tienda. Los datos del cliente y el tipo de pago se registran en las siguientes pantallas.",
  cashierShift = "Caja activa: Turno manana",
  currentStep = 0,
  steps = DEFAULT_STEPS,
  className,
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-violet-200/80 bg-white/85 p-5 shadow-lg backdrop-blur md:p-7",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Ripnel POS</p>
          <h1 className="text-2xl font-bold text-slate-800 md:text-3xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm text-violet-800">
          {cashierShift}
        </div>
      </div>
      <div className="mt-5">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>
    </section>
  )
}

export default PosHeader
