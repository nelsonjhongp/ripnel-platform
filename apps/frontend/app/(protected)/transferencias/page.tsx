import { redirect } from "next/navigation"
import { buildTransferModuleRoute, transferRouteSlugs } from "@/lib/routes"

export default function TransfersPage() {
  redirect(buildTransferModuleRoute(transferRouteSlugs.list))
}
