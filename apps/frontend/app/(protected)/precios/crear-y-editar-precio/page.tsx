/** @deprecated Legacy route — redirects to /precios/crear. Remove after Q3 2026. */
import { redirect } from "next/navigation";
import { appRoutes } from "@/lib/routes";

export default async function LegacyPriceEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ style_id?: string }>;
}) {
  const params = await searchParams;
  const styleId = params.style_id ? String(params.style_id) : "";

  redirect(
    styleId
      ? `${appRoutes.prices}/crear?style_id=${encodeURIComponent(styleId)}`
      : `${appRoutes.prices}/crear`
  );
}
