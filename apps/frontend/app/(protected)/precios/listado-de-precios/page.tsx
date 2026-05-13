import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/routes";

export default function LegacyPriceListPage() {
  redirect(appRoutes.prices);
}
