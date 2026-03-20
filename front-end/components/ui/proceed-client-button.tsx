import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ProceedClientButtonProps = {
  text?: string
  className?: string
  onClick?: () => void
}

export function ProceedClientButton({
  text = "Proceder a registrar datos del cliente",
  className,
  onClick,
}: ProceedClientButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={cn("rounded-full bg-violet-600 px-5 py-2 text-white hover:bg-violet-700", className)}
    >
      <ArrowLeft className="h-4 w-4" />
      <span>{text}</span>
    </Button>
  )
}

export default ProceedClientButton
