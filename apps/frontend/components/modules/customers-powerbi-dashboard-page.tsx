import Link from "next/link";
import { ExternalLink } from "lucide-react";

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
    <section className="flex flex-col gap-4 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clientes - Dashboards BI</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Vista ejecutiva para seguimiento comercial y operativo de clientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/clientes"
            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            Volver a clientes
          </Link>
          {powerBiEmbedUrl ? (
            <a
              href={powerBiEmbedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100"
            >
              Abrir en Power BI
              <ExternalLink size={14} />
            </a>
          ) : null}
        </div>
      </header>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        {powerBiEmbedUrl ? (
          <iframe
            title="Dashboard de clientes en Power BI"
            src={powerBiEmbedUrl}
            className="h-[68vh] w-full rounded-md border border-gray-200"
            loading="lazy"
            allowFullScreen
          />
        ) : (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Configura NEXT_PUBLIC_CUSTOMERS_POWERBI_
            EMBED_URL en apps/frontend/.env.local 
            para incrustar el dashboard real.
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {DASHBOARD_ITEMS.map((item) => (
          <article key={item.title} className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-gray-900">{item.title}</h2>
            <p className="mt-1 text-sm text-gray-600">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
