import type { ReactNode } from "react"
import { OpsPageShell } from "@/components/ui/ops-page-shell"

export default function PreciosLayout({ children }: { children: ReactNode }) {
  return <OpsPageShell width="wide">{children}</OpsPageShell>
}
