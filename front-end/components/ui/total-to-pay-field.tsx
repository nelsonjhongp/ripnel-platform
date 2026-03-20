import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TotalToPayFieldProps = {
  label?: string
  value?: string
  className?: string
}

export function TotalToPayField({
  label = "Total a pagar",
  value = "Precio Final",
  className,
}: TotalToPayFieldProps) {
  return (
    <div className={cn("w-full max-w-xs", className)}>
      <p className="mb-1 text-sm text-slate-500">{label}</p>
      <Input value={value} readOnly className="text-center" />
    </div>
  )
}

export default TotalToPayField
