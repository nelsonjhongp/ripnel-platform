import Link from "next/link";
import { AlertTriangle, Ban, Home, LoaderCircle, RefreshCcw, SearchX } from "lucide-react";

type StatusTone = "neutral" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "border-slate-200 bg-white text-slate-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

export function StatusPage({
  icon,
  eyebrow,
  title,
  description,
  tone = "neutral",
  primaryAction,
  secondaryAction,
}: {
  icon?: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  tone?: StatusTone;
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
}) {
  return (
    <section className="flex min-h-[calc(100vh-3.5rem)] w-full items-center bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_30%,#f8fafc_65%,#eef2ff_100%)] px-4 py-10 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className={`min-h-[60vh] rounded-[28px] border p-6 shadow-lg md:p-10 ${toneClasses[tone]}`}>
          <div className="flex h-full items-start gap-4 md:gap-5">
            <div className="rounded-2xl bg-slate-900/5 p-3 text-current">{icon}</div>
            <div className="flex min-h-full flex-1 flex-col justify-center space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-current/70">{eyebrow}</p>
              <div>
                <h1 className="text-3xl font-bold md:text-5xl">{title}</h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-current/75">{description}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {primaryAction ? (
                  <Link
                    href={primaryAction.href}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Home className="h-4 w-4" />
                    {primaryAction.label}
                  </Link>
                ) : null}
                {secondaryAction ? (
                  <Link
                    href={secondaryAction.href}
                    className="inline-flex items-center gap-2 rounded-2xl border border-current/15 px-4 py-2.5 text-sm font-semibold text-current/80 transition hover:bg-white/60"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    {secondaryAction.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LoadingPage({
  eyebrow = "Cargando",
  title = "Preparando módulo",
  description = "Estamos cargando la información operativa para mostrar la pantalla actual.",
}: {
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  return (
    <StatusPage
      icon={<LoaderCircle className="h-8 w-8 animate-spin" />}
      eyebrow={eyebrow}
      title={title}
      description={description}
      primaryAction={{ href: "/inicio", label: "Volver al inicio" }}
    />
  );
}

export function NotFoundPage() {
  return (
    <StatusPage
      icon={<SearchX className="h-8 w-8" />}
      eyebrow="404"
      title="La ruta no existe"
      description="La página solicitada no forma parte del flujo actual o fue movida a otra ruta operativa."
      primaryAction={{ href: "/inicio", label: "Ir al inicio" }}
      secondaryAction={{ href: "/purchase-system", label: "Abrir nueva venta" }}
    />
  );
}

export function ForbiddenPage() {
  return (
    <StatusPage
      icon={<Ban className="h-8 w-8" />}
      eyebrow="403"
      title="No tienes permisos para entrar aquí"
      description="Tu sesión está activa, pero el rol actual no tiene acceso operativo a este módulo o ubicación."
      tone="warning"
      primaryAction={{ href: "/inicio", label: "Volver al inicio" }}
      secondaryAction={{ href: "/account", label: "Ver mi cuenta" }}
    />
  );
}

export function ErrorPage({
  title = "Ocurrió un error inesperado",
  description = "La aplicación encontró un problema y no pudo completar la operación actual.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <StatusPage
      icon={<AlertTriangle className="h-8 w-8" />}
      eyebrow="500"
      title={title}
      description={description}
      tone="danger"
      primaryAction={{ href: "/inicio", label: "Volver al inicio" }}
      secondaryAction={{ href: "/transaction-history", label: "Ir al historial" }}
    />
  );
}

export function InlineStatusCard({
  title,
  description,
  tone = "neutral",
  icon,
}: {
  title: string;
  description: string;
  tone?: StatusTone;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-3xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <div className="flex items-start gap-3">
        {icon ? <div className="rounded-2xl bg-slate-900/5 p-2.5 text-current">{icon}</div> : null}
        <div>
          <p className="text-base font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-6 text-current/75">{description}</p>
        </div>
      </div>
    </div>
  );
}