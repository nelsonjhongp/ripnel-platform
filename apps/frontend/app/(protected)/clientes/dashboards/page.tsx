import { redirect } from "next/navigation"
import { appRoutes } from "@/lib/routes"

export default function Page() {
  redirect(`${appRoutes.businessIntelligence}?view=clientes`)
}
