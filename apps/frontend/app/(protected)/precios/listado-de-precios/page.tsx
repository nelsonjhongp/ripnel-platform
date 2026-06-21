/** @deprecated Legacy route — redirects to /precios. Remove after Q3 2026. */
import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/routes";

export default function LegacyPriceListPage() {
  redirect(appRoutes.prices);
}
