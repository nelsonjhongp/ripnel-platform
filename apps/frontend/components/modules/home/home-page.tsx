"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Boxes, Clock3, ShieldCheck, Store, Wallet } from "lucide-react"

import { useAuth } from "@/components/auth/AuthProvider"
import { ErrorPage, LoadingPage } from "@/components/feedback/status-page"
import { HomeEmptyState } from "@/components/home/home-empty-state"
import { HomeHero } from "@/components/home/home-hero"
import { HomePriorities } from "@/components/home/home-priorities"
import { HomeQuickActions } from "@/components/home/home-quick-actions"
import { HomeSectionCard } from "@/components/home/home-section-card"
import { HomeTransferRequests } from "@/components/home/home-transfer-requests"
import type { HomeOverview } from "@/components/home/home-types"
import { useSidebarTopbarActions } from "@/components/sidebar"
import { apiFetch, ApiError } from "@/lib/api"
import { appRoutes } from "@/lib/routes"

function explainHomeError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "No pudimos preparar tu inicio operativo."
  }

  if (error.status === 409) {
    return "Necesitas una sede default activa para preparar tu inicio."
  }

  if (error.status === 401) {
    return "Tu sesión ya no es válida. Vuelve a iniciar sesión."
  }

  return error.message || "No pudimos preparar tu inicio operativo."
}

function formatCurrency(value: number | null | undefined) {
  return `S/. ${Number(value || 0).toFixed(2)}`
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-"

  return new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", {
    dateStyle: "medium",
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-"

  return new Date(value).toLocaleString("es-PE", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

export default function InicioPage() {
  const { loading: authLoading } = useAuth()
  const [overview, setOverview] = useState<HomeOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    async function loadOverview() {
      setLoading(true)
      setError(null)

      try {
        const data = await apiFetch<HomeOverview>("/api/home/overview", {
          cache: "no-store",
        })

        if (active) {
          setOverview(data)
        }
      } catch (loadError) {
        if (!active) return
        setOverview(null)
        setError(explainHomeError(loadError))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadOverview()

    return () => {
      active = false
    }
  }, [])

  const locationMeta = useMemo(() => {
    if (!overview) return ""

    return [overview.context.user.role_name || null, formatDate(overview.context.business_date)]
      .filter(Boolean)
      .join(" · ")
  }, [overview])

  const personalSales = overview?.sections.personal_sales ?? null
  const transferRequests = overview?.sections.transfer_requests ?? null
  const cash = overview?.sections.cash ?? null
  const inventory = overview?.sections.inventory ?? null
  const admin = overview?.sections.admin ?? null

  const topbarActions =
    cash?.visible && !cash.closing
      ? [
          {
            key: "open-cash",
            label: "Abrir caja",
            href: "/caja",
            icon: <Wallet className="h-4 w-4" />,
            variant: "outline" as const,
          },
        ]
      : []

  useSidebarTopbarActions(topbarActions)

  if ((loading || authLoading) && !overview) {
    return (
      <LoadingPage
        variant="ops"
        title="Preparando tu inicio"
        description="Estamos reuniendo ventas, caja, solicitudes entre tiendas e indicadores de tu sede activa."
      />
    )
  }

  if (!overview) {
    return (
      <ErrorPage
        variant="ops"
        title="No pudimos abrir tu inicio"
        description={error || "El inicio personalizado no está disponible en este momento."}
      />
    )
  }

  const hasSummaryRow = personalSales?.visible || cash?.visible
  const hasSecondaryRow = transferRequests?.visible || inventory?.visible

  return (
    <section className="sales-page min-h-screen px-4 py-[var(--ops-page-py)] md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <HomeHero hero={overview.hero} locationMeta={locationMeta} />

        {hasSummaryRow ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {personalSales?.visible ? (
              <HomeSectionCard
                eyebrow="Ventas"
                title="Tu avance"
                action={{ label: "Ver historial", href: appRoutes.transactionHistory }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="sales-panel-muted rounded-xl p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
                      <Store className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                      Hoy
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                      {personalSales.today.sale_count}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                      {formatCurrency(personalSales.today.total_amount)}
                    </p>
                  </div>
                  <div className="sales-panel-muted rounded-xl p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
                      <Clock3 className="h-4 w-4 text-[var(--ripnel-accent-hover)]" />
                      Semana
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                      {personalSales.week.sale_count}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                      {formatCurrency(personalSales.week.total_amount)}
                    </p>
                  </div>
                </div>
              </HomeSectionCard>
            ) : null}

            {cash?.visible ? (
              <HomeSectionCard eyebrow="Caja" title="Estado de caja" action={{ label: "Ir a caja", href: "/caja" }}>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="sales-panel-muted rounded-xl p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
                      <Wallet className="h-4 w-4 text-emerald-600" />
                      Estado
                    </p>
                    <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                      {cash.closing ? (cash.closing.status === "open" ? "Abierta" : "Cerrada") : "Sin apertura"}
                    </p>
                  </div>
                  <div className="sales-panel-muted rounded-xl p-4">
                    <p className="text-sm font-semibold text-[var(--ops-text)]">Diferencia</p>
                    <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                      {formatCurrency(cash.consistency?.difference)}
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                      {cash.consistency?.is_consistent ? "Ventas y pagos consistentes" : "Requiere revisión"}
                    </p>
                  </div>
                </div>
              </HomeSectionCard>
            ) : null}
          </div>
        ) : null}

        {overview.priorities.length > 0 ? <HomePriorities items={overview.priorities} /> : null}

        {overview.quick_actions.length > 0 ? <HomeQuickActions items={overview.quick_actions} /> : null}

        {hasSecondaryRow ? (
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-6">
              {transferRequests?.visible ? (
                <HomeTransferRequests section={transferRequests} formatDateTime={formatDateTime} />
              ) : null}
            </div>

            <div className="space-y-6">
              {inventory?.visible ? (
                <HomeSectionCard
                  eyebrow="Inventario"
                  title="Stock sensible"
                  action={{ label: "Ver inventario", href: appRoutes.inventory }}
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="sales-panel-muted rounded-xl p-4">
                      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
                        <Boxes className="h-4 w-4 text-rose-600" />
                        En cero
                      </p>
                      <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                        {inventory.zero_stock_count}
                      </p>
                    </div>
                    <div className="sales-panel-muted rounded-xl p-4">
                      <p className="text-sm font-semibold text-[var(--ops-text)]">Bajo mínimo</p>
                      <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                        {inventory.low_stock_count}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                        Umbral {inventory.low_stock_threshold}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {inventory.critical_variants.length > 0 ? (
                      inventory.critical_variants.map((item) => (
                        <Link
                          key={item.variant_id}
                          href={appRoutes.inventory}
                          className="sales-panel-muted block rounded-xl px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[var(--ops-text)]">{item.style_name}</p>
                              <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                                {item.sku} · {item.size_code} / {item.color_code}
                              </p>
                            </div>
                            <span className="sales-chip rounded-full px-2.5 py-1 text-[11px] font-semibold">
                              Stock {item.qty}
                            </span>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <HomeEmptyState
                        title="Sin variantes críticas"
                        description="No hay variantes en cero o bajo mínimo visibles para la sede activa."
                      />
                    )}
                  </div>
                </HomeSectionCard>
              ) : null}
            </div>
          </div>
        ) : null}

        {admin?.visible ? (
          <HomeSectionCard
            eyebrow="Administración"
            title="Panorama general"
            action={{ label: "Abrir dashboard", href: appRoutes.dashboard }}
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <div className="sales-panel-muted rounded-xl p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  Usuarios activos
                </p>
                <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                  {admin.active_user_count}
                </p>
                <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                  {admin.active_location_count} sede(s) asignadas
                </p>
              </div>
              <div className="sales-panel-muted rounded-xl p-4">
                <p className="text-sm font-semibold text-[var(--ops-text)]">Ventas de hoy</p>
                <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                  {admin.sales_today_count}
                </p>
                <p className="mt-1 text-sm text-[var(--ops-text-muted)]">
                  {formatCurrency(admin.sales_today_total)}
                </p>
              </div>
              <div className="sales-panel-muted rounded-xl p-4">
                <p className="text-sm font-semibold text-[var(--ops-text)]">Solicitudes abiertas</p>
                <p className="mt-3 text-2xl font-bold text-[var(--ops-text)]">
                  {admin.pending_requests_count}
                </p>
                <p className="mt-1 text-sm text-[var(--ops-text-muted)]">En tu red asignada</p>
              </div>
            </div>
          </HomeSectionCard>
        ) : null}

        {!personalSales?.visible && !cash?.visible && !transferRequests?.visible && !inventory?.visible && !admin?.visible ? (
          <HomeSectionCard eyebrow="Inicio" title="Aún no hay bloques activos">
            <HomeEmptyState
              title="Sin indicadores visibles para tu sesión"
              description="El inicio mostrará módulos operativos cuando tu usuario tenga sede activa y capacidades asociadas."
            />
          </HomeSectionCard>
        ) : null}
      </div>
    </section>
  )
}
