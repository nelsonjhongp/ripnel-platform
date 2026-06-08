import { toast } from "sonner"

const DURATION = 4000

export function showSuccess(message: string, description?: string) {
  return toast.success(message, { description, duration: DURATION })
}

export function showError(message: string, description?: string) {
  return toast.error(message, { description, duration: DURATION })
}

export function showWarning(message: string, description?: string) {
  return toast.warning(message, { description, duration: DURATION })
}

export function showInfo(message: string, description?: string) {
  return toast(message, { description, duration: DURATION })
}

export { toast }
