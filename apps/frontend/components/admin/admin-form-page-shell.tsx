import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"

import { OpsPageShell, OpsSectionDivider } from "@/components/ui/ops-page-shell"
import { Button } from "@/components/ui/button"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"

export function AdminFormPageShell({
  eyebrow,
  title,
  backHref,
  backLabel = "Volver",
  children,
  maxWidth = "max-w-4xl",
}: {
  eyebrow: string
  title: string
  backHref: string
  backLabel?: string
  children: ReactNode
  maxWidth?: string
}) {
  return (
    <OpsPageShell width="default" className={maxWidth}>
      <PosHeader
        eyebrow={eyebrow}
        title={title}
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-lg px-3">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        }
      />

      <OpsSectionDivider>{children}</OpsSectionDivider>
    </OpsPageShell>
  )
}
