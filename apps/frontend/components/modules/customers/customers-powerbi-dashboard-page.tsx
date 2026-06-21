import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { OpsPageShell } from "@/components/ui/ops-page-shell";
import { PosHeader } from "@/components/ui/purchase-system/PosHeader";

const DASHBOARD_ITEMS = [
  {
    title: "Nuevos vs recurrentes",
    description: "Evolucion mensual para monitorear adquisicion y fidelizacion.",
  },
  {
    title: "Top clientes por venta y margen",
    description: "Ranking comercial para enfocar cuentas clave y rentables.",
  },
  {
    title: "Pareto 80/20",
    description: "Participacion acumulada para identificar concentracion de ingresos.",
  },
  {
    title: "Segmentacion RFM",
    description: "Recencia, frecuencia y monetario para detectar clientes VIP o en riesgo.",
  },
  {
    title: "Cohortes de retencion",
    description: "Retencion por mes de alta para medir calidad de captacion.",
  },
  {
    title: "Dias desde ultima compra",
    description: "Distribucion de inactividad para activar recuperacion comercial.",
  },
];

const powerBiEmbedUrl = process.env.NEXT_PUBLIC_CUSTOMERS_POWERBI_EMBED_URL;

export default function CustomersPowerBiDashboardPage() {
  return (
    <OpsPageShell width="wide">
      <PosHeader
        title="Clientes - Dashboards BI"
        description="Vista ejecutiva para seguimiento comercial y operativo de clientes."
      />

      <div className="flex items-center gap-2">
        <Link
          href="/clientes"
          className="rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] px-3 py-1.5 text-sm text-[var(--ops-text-muted)] transition-colors hover:text-[var(--ops-text)]"
        >
          Volver a clientes
        </Link>
        {powerBiEmbedUrl ? (
          <a
            href={powerBiEmbedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--ops-tone-success-border)] bg-[var(--ops-tone-success-bg)] px-3 py-1.5 text-sm text-[var(--ops-tone-success-text)] transition-colors hover:opacity-90"
          >
            Abrir en Power BI
            <ExternalLink size={14} />
          </a>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
        {powerBiEmbedUrl ? (
          <iframe
            title="Dashboard de clientes en Power BI"
            src={powerBiEmbedUrl}
            className="h-[68vh] w-full rounded-md border border-[var(--ops-border-strong)]"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="rounded-md border border-[var(--ops-tone-warning-border)] bg-[var(--ops-tone-warning-bg)] px-4 py-3 text-sm text-[var(--ops-tone-warning-text)]">
            Configura NEXT_PUBLIC_CUSTOMERS_POWERBI_EMBED_URL en apps/frontend/.env.local para incrustar el dashboard real.
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DASHBOARD_ITEMS.map((item) => (
          <article key={item.title} className="rounded-lg border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] p-4">
            <h2 className="text-sm font-semibold text-[var(--ops-text)]">{item.title}</h2>
            <p className="mt-1 text-sm text-[var(--ops-text-muted)]">{item.description}</p>
          </article>
        ))}
      </div>
    </OpsPageShell>
  );
}