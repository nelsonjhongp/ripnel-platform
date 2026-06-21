/** @deprecated Legacy route — redirects to /panel. Remove after Q3 2026. */
import { redirect } from "next/navigation"

export default function Page() {
  redirect("/panel")
}
