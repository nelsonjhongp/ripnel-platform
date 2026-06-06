"use client"

import Link from "next/link"
import { useState } from "react"
import {
  AlertTriangle, ArrowRight, Ban, Box, Building2, Check, CheckCircle2,
  ChevronDown, Clock, Eye, FileText, Info, LoaderCircle, MapPin,
  Package, PackageSearch, PencilLine, Plus, Power, RefreshCw, RotateCw,
  Search, Settings, Smartphone, Store, Ticket, User, Warehouse, XCircle
} from "lucide-react"
import { OpsPageShell, OpsSectionDivider, OpsTableBlock, OpsFiltersRow, OpsSearchField } from "@/components/ui/ops-page-shell"
import { OpsDataTable, type OpsDataTableColumn } from "@/components/ui/ops-data-table"
import { OpsEmptyState } from "@/components/ui/ops-empty-state"
import { OpsStatusBadge } from "@/components/ui/ops-status-badge"
import { OpsMetricPill } from "@/components/ui/ops-metric-pill"
import { OpsMetricCard } from "@/components/ui/ops-metric-card"
import { OpsMetricStripItem } from "@/components/ui/ops-metric-strip-item"
import { OpsMetricRow } from "@/components/ui/ops-metric-row"
import { OpsInlineBadge } from "@/components/ui/ops-inline-badge"
import { OpsCardActionLink } from "@/components/ui/ops-card-action-link"
import { OpsSectionHeader } from "@/components/ui/ops-section-header"
import { OpsQuantityStepper } from "@/components/ui/ops-quantity-stepper"
import { OpsLocationIcon } from "@/components/ui/ops-location-icon"
import { FilterDropdown, type FilterDropdownOption } from "@/components/ui/filter-dropdown"
import { DateFilterPicker } from "@/components/ui/date-filter-picker"
import { Pagination } from "@/components/ui/pagination"
import { CompactPickerPopover, CompactPickerList, CompactPickerOption, CompactPickerEmpty } from "@/components/ui/compact-picker"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { SalesWizardRail, type SalesWizardRailItem } from "@/components/ui/purchase-system/SalesWizardRail"
import { ReceiptOptionsModal } from "@/components/ui/purchase-system/ReceiptOptionsModal"
import { AdminInlineMessage, AdminActionButton, AdminRowActionButton, AdminRowActionsMenu, AdminConfirmModal, AdminModalShell, AdminField, AdminInput, AdminTextarea, AdminCheckboxField, AdminFormActionsBar } from "@/components/admin/admin-ui"
import { AdminFormPageShell } from "@/components/admin/admin-form-page-shell"
import { InlineStatusCard, LoadingPage, NotFoundPage, ForbiddenPage, ErrorPage } from "@/components/feedback/status-page"
import { OpsAttentionRow } from "@/components/ui/ops-attention-row"
import { OpsPendingRow } from "@/components/ui/ops-pending-row"
import { TooltipProvider } from "@/components/ui/tooltip"
import { appRoutes } from "@/lib/routes"
import { OpsSummaryBand, type OpsSummaryBandItem } from "@/components/ui/ops-summary-band"
import { OpsActionLink } from "@/components/ui/ops-action-link"
import { OpsActionTile } from "@/components/ui/ops-action-tile"
import { OpsInfoCard } from "@/components/ui/ops-info-card"
import { OpsSelectMenu, OpsMultiSelectMenu, OpsSelectionChip, OpsReadonlyFieldState, type OpsOption } from "@/components/ui/ops-selection"
import { FieldLabel } from "@/components/ui/ops-field-label"
import { MultiSelectCatalog } from "@/components/ui/ops-multi-select-catalog"
import { SearchablePicker } from "@/components/ui/searchable-picker"
import { Stepper } from "@/components/ui/stepper"
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { AdminSection, AdminCheckboxOption, AdminCheckboxRow } from "@/components/admin/admin-ui"
import { AttentionPanel } from "@/components/dashboard/attention-panel"
import { DashboardChartCard } from "@/components/dashboard/dashboard-chart-card"
import { BarChart, Bar, ResponsiveContainer } from "recharts"

const mockRows = [
  { id: "1", producto: "Polo Classic", sku: "POL-001", color: "Negro", talla: "M", stock: 15, precio: "S/. 45.00" },
  { id: "2", producto: "Camisa Oxford", sku: "CAM-002", color: "Blanco", talla: "L", stock: 8, precio: "S/. 72.50" },
  { id: "3", producto: "Jean Slim", sku: "JEA-003", color: "Azul", talla: "32", stock: 22, precio: "S/. 89.90" },
  { id: "4", producto: "Casaca Urbana", sku: "CAS-004", color: "Gris", talla: "XL", stock: 0, precio: "S/. 129.00" },
  { id: "5", producto: "Polo Básico", sku: "POL-005", color: "Blanco", talla: "S", stock: 45, precio: "S/. 29.90" },
]

const tableColumns: OpsDataTableColumn[] = [
  { key: "producto", header: "Producto" },
  { key: "sku", header: "SKU" },
  { key: "color", header: "Color" },
  { key: "talla", header: "Talla" },
  { key: "stock", header: "Stock" },
  { key: "precio", header: "Precio" },
]

const filterStatusOptions: FilterDropdownOption[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activo", badge: "OK", tone: "success" },
  { value: "inactive", label: "Inactivo", badge: "OFF", tone: "neutral" },
  { value: "low", label: "Stock bajo", badge: "!", tone: "warning" },
]

const pickerItems = ["Tienda Centro", "Tienda Norte", "Almacén Principal", "Tienda Sur", "Outlet Plaza"]

const wizardItems: SalesWizardRailItem[] = [
  { id: "customer", label: "Cliente", icon: User, complete: true },
  { id: "products", label: "Productos", icon: Package, active: true, activeLabel: "Seleccionando" },
  { id: "payment", label: "Cobro", icon: Ticket, suggested: true },
  { id: "receipt", label: "Recibo", icon: FileText },
]

const selectOptions: OpsOption[] = [
  { value: "retail", label: "Minorista", helper: "Precio para venta al publico" },
  { value: "wholesale", label: "Mayorista", helper: "Precio por volumen", leading: <Box className="h-4 w-4" /> },
  { value: "dist", label: "Distribuidor", helper: "Precio especial para distribuidores", disabled: true },
]

const summaryBandItems: OpsSummaryBandItem[] = [
  { icon: <Package className="h-4 w-4" />, label: "Productos", value: "1,248", meta: "+12 este mes", tone: "accent" },
  { icon: <Ticket className="h-4 w-4" />, label: "Ventas hoy", value: "S/. 4,520", meta: "23 transacciones", tone: "success" },
  { icon: <Clock className="h-4 w-4" />, label: "Pendientes", value: "8", meta: "transferencias sin recibir", tone: "info" },
]

const searchableItems = [
  { id: "p1", name: "Polo Classic", code: "POL-001", stock: 15 },
  { id: "p2", name: "Camisa Oxford", code: "CAM-002", stock: 8 },
  { id: "p3", name: "Jean Slim", code: "JEA-003", stock: 22 },
  { id: "p4", name: "Casaca Urbana", code: "CAS-004", stock: 0 },
  { id: "p5", name: "Polo Basico", code: "POL-005", stock: 45 },
]

const stepperSteps = [
  { id: "config", label: "Configurar" },
  { id: "review", label: "Revisar" },
  { id: "confirm", label: "Confirmar" },
]

const attentionItems = [
  { key: "low", label: "Stock bajo", value: "3 productos", highlightValue: "3", badge: "Critico", cta: "Revisar", href: "/inventario", icon: AlertTriangle, tone: "danger" as const, numericValue: 3 },
  { key: "price", label: "Precios vencidos", value: "12 productos", highlightValue: "12", badge: "Pendiente", cta: "Actualizar", href: "/precios", icon: Clock, tone: "warning" as const, numericValue: 12 },
]

export default function DemoPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateFilter, setDateFilter] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [checked, setChecked] = useState(false)
  const [tablePage, setTablePage] = useState(1)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState("")
  const [showAdminConfirm, setShowAdminConfirm] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [tableVariant, setTableVariant] = useState<"data" | "loading" | "error" | "empty">("data")
  const [selectValue, setSelectValue] = useState("")
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([])
  const [picker2Open, setPicker2Open] = useState(false)
  const [picker2Query, setPicker2Query] = useState("")
  const [picker2Highlight, setPicker2Highlight] = useState(0)
  const [stepperStep, setStepperStep] = useState(1)
  const [passValue, setPassValue] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [receiptDemoOpen, setReceiptDemoOpen] = useState(false)

  const filteredPickerItems = pickerItems.filter((item) =>
    item.toLowerCase().includes(pickerQuery.toLowerCase())
  )

  return (
    <TooltipProvider delayDuration={120}>
      <OpsPageShell width="wide">
        <PosHeader
          eyebrow="Componentes"
          title="Demo de componentes"
          actions={
            <Link
              href={appRoutes.home}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--ops-border-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--ops-text-muted)] transition hover:text-[var(--ops-text)]"
            >
              <ArrowRight className="h-4 w-4 rotate-180" />
              Volver
            </Link>
          }
        />

        {/* ──────────── 1. LAYOUT ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<Building2 className="h-4 w-4" />} title="1. Layout" />
          <div className="mt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsPageShell</span>
              <span className="text-[11px] text-[var(--ops-text-muted)]">(envolviendo esta pagina, width=&quot;wide&quot;)</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">PosHeader</span>
              <span className="text-[11px] text-[var(--ops-text-muted)]">(renderizado arriba)</span>
            </div>
            <div className="rounded-xl border border-dashed border-[var(--ops-border-strong)] p-4">
              <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                AdminFormPageShell (preview)
              </span>
              <AdminFormPageShell
                eyebrow="Catalogo"
                title="Formulario ejemplo"
                backHref={appRoutes.home}
                maxWidth="max-w-lg"
              >
                <p className="text-sm text-[var(--ops-text-muted)]">Contenido del formulario...</p>
              </AdminFormPageShell>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 2. DATA TABLE ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<FileText className="h-4 w-4" />} title="2. Data Table" />
          <OpsTableBlock>
            <OpsFiltersRow>
              <OpsSearchField
                label="Buscar"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar producto..."
                ariaLabel="Buscar producto"
              />
              <FilterDropdown label="Estado" value={filterStatus} options={filterStatusOptions} onChange={setFilterStatus} />
              <DateFilterPicker label="Fecha" value={dateFilter} onChange={setDateFilter} ariaLabel="Filtrar por fecha" />
              <div className="flex items-end gap-1.5">
                <AdminActionButton onClick={() => setTableVariant("data")} className="text-[10px]">Data</AdminActionButton>
                <AdminActionButton onClick={() => setTableVariant("loading")} className="text-[10px]">Loading</AdminActionButton>
                <AdminActionButton onClick={() => setTableVariant("error")} className="text-[10px]">Error</AdminActionButton>
                <AdminActionButton onClick={() => setTableVariant("empty")} className="text-[10px]">Empty</AdminActionButton>
              </div>
            </OpsFiltersRow>

            <OpsDataTable
              columns={tableColumns}
              loading={tableVariant === "loading"}
              error={tableVariant === "error" ? "Error de conexion con el servidor." : null}
              isEmpty={tableVariant === "empty"}
              emptyMessage="No se encontraron productos."
              footer={tableVariant === "data" ? <Pagination page={tablePage} totalPages={10} onPageChange={setTablePage} /> : undefined}
            >
              {mockRows.map((row) => (
                <tr key={row.id} className="text-sm text-[var(--ops-text)] transition hover:bg-[var(--ops-surface-muted)]">
                  <td className="px-4 py-2.5 font-medium">{row.producto}</td>
                  <td className="px-4 py-2.5 text-[var(--ops-text-muted)]">{row.sku}</td>
                  <td className="px-4 py-2.5">{row.color}</td>
                  <td className="px-4 py-2.5">{row.talla}</td>
                  <td className="px-4 py-2.5">
                    <OpsInlineBadge label={String(row.stock)} tone={row.stock > 10 ? "success" : row.stock > 0 ? "warning" : "danger"} />
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{row.precio}</td>
                </tr>
              ))}
            </OpsDataTable>
          </OpsTableBlock>
        </OpsSectionDivider>

        {/* ──────────── 3. STATUS BADGES ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<CheckCircle2 className="h-4 w-4" />} title="3. Status Badges" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsStatusBadge (5 tones × 2 sizes)</p>
              <div className="flex flex-wrap items-center gap-2">
                {(["neutral", "accent", "success", "warning", "danger"] as const).flatMap((tone) =>
                  (["sm", "xs"] as const).map((size) => (
                    <OpsStatusBadge key={`${tone}-${size}`} tone={tone} size={size}>{tone} {size}</OpsStatusBadge>
                  ))
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <OpsStatusBadge tone="success" icon={<Check className="h-3 w-3" />}>Con icono</OpsStatusBadge>
                <OpsStatusBadge tone="warning" icon={<Clock className="h-3 w-3" />}>Pendiente</OpsStatusBadge>
                <OpsStatusBadge tone="danger" icon={<XCircle className="h-3 w-3" />}>Error</OpsStatusBadge>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsInlineBadge</p>
              <div className="flex flex-wrap items-center gap-2">
                <OpsInlineBadge label="OK" tone="success" />
                <OpsInlineBadge label="Pend" tone="warning" />
                <OpsInlineBadge label="Err" tone="danger" />
                <OpsInlineBadge label="N/A" tone="neutral" />
                <OpsInlineBadge label="VIP" tone="purple" />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminInlineMessage</p>
              <div className="flex flex-col gap-2">
                <AdminInlineMessage tone="danger">Este registro tiene errores de validacion.</AdminInlineMessage>
                <AdminInlineMessage tone="warning">El stock esta por debajo del minimo configurado.</AdminInlineMessage>
                <AdminInlineMessage tone="success">Todos los datos se guardaron correctamente.</AdminInlineMessage>
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 4. METRICS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<Box className="h-4 w-4" />} title="4. Metrics" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsMetricPill (4 tones × active/inactive)</p>
              <div className="flex flex-wrap items-center gap-2">
                {(["default", "accent", "warning", "success"] as const).flatMap((tone) =>
                  ([false, true] as const).map((active) => (
                    <OpsMetricPill
                      key={`${tone}-${active}`}
                      label={active ? `${tone} activo` : tone}
                      value={42}
                      tone={tone}
                      active={active}
                    />
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsMetricCard (6 tones)</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {(["default", "accent", "success", "warning", "danger", "neutral"] as const).map((tone) => (
                  <OpsMetricCard
                    key={tone}
                    icon={<Package className="h-4 w-4" />}
                    label={`Card ${tone}`}
                    value={320}
                    detail="vs mes anterior"
                    tone={tone}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsMetricStripItem (3 tones)</p>
              <div className="grid grid-cols-3 gap-3">
                <OpsMetricStripItem label="Ventas hoy" value="S/. 2,450" tone="accent" />
                <OpsMetricStripItem label="Pendientes" value="12" tone="warning" />
                <OpsMetricStripItem label="Transferencias" value="5" tone="info" />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsMetricRow (3 tones)</p>
              <div className="max-w-xs space-y-1.5 rounded-xl border border-[var(--ops-border-strong)] p-3">
                <OpsMetricRow label="Subtotal" value="S/. 180.00" tone="default" />
                <OpsMetricRow label="Descuento" value="-S/. 25.00" tone="warning" />
                <OpsMetricRow label="Stock faltante" value="3 unidades" tone="danger" />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsSummaryBand (4 tones)</p>
              <OpsSummaryBand items={summaryBandItems} />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsActionLink (6 tones × 2 sizes)</p>
              <div className="flex flex-wrap items-center gap-2">
                {(["neutral", "accent", "success", "warning", "danger"] as const).flatMap((tone) =>
                  (["sm", "md"] as const).map((size) => (
                    <OpsActionLink key={`${tone}-${size}`} href="#" tone={tone} size={size}>{tone} {size}</OpsActionLink>
                  ))
                )}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsActionTile (5 tones)</p>
              <div className="flex flex-wrap gap-3">
                {(["accent", "warning", "success", "info", "neutral"] as const).map((tone) => (
                  <OpsActionTile key={tone} icon={<Package className="h-4 w-4" />} label={`Tile ${tone}`} href="#" tone={tone} />
                ))}
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 5. INFO & CARDS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<FileText className="h-4 w-4" />} title="5. Info & Cards" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsInfoCard</p>
              <div className="max-w-md">
                <OpsInfoCard title="Informacion del envio" icon={Package}>
                  <p className="text-sm text-[var(--ops-text-muted)]">Destino: Tienda Norte</p>
                  <p className="text-sm text-[var(--ops-text-muted)]">Origen: Almacen Principal</p>
                  <p className="text-sm text-[var(--ops-text-muted)]">Items: 12 unidades</p>
                </OpsInfoCard>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">DashboardChartCard</p>
              <DashboardChartCard title="Ventas por mes" subtitle="Ultimos 6 meses" height={160}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={[{ mes: "Ene", ventas: 4200 }, { mes: "Feb", ventas: 3800 }, { mes: "Mar", ventas: 5100 }, { mes: "Abr", ventas: 4600 }, { mes: "May", ventas: 5400 }, { mes: "Jun", ventas: 4900 }]}>
                    <Bar dataKey="ventas" fill="var(--ripnel-accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChartCard>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 6. EMPTY & FEEDBACK ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<PackageSearch className="h-4 w-4" />} title="6. Empty & Feedback" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsEmptyState (default / dashed / compact)</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <OpsEmptyState title="Sin resultados" description="No hay productos que coincidan con los filtros." />
                <OpsEmptyState variant="dashed" title="Arrastra aqui" description="Suelta variantes para agregarlas al estilo." />
                <OpsEmptyState variant="compact" description="Esta lista esta vacia." />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">InlineStatusCard (ops variant)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <InlineStatusCard
                  title="Error de conexion"
                  description="No se pudo contactar al servidor. Revisa tu red e intenta de nuevo."
                  tone="danger"
                  variant="ops"
                  icon={<AlertTriangle className="h-5 w-5" />}
                />
                <InlineStatusCard
                  title="Version desactualizada"
                  description="Hay una nueva version disponible. Actualiza para continuar."
                  tone="warning"
                  variant="ops"
                  icon={<Info className="h-5 w-5" />}
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Status pages (ver seccion 14 para preview completo)</p>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 7. FORM INPUTS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<PencilLine className="h-4 w-4" />} title="7. Form Inputs" />
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[220px]">
                <OpsSearchField label="Buscar" value={searchTerm} onChange={setSearchTerm} placeholder="Buscar..." ariaLabel="Buscar en demo" />
              </div>
              <FilterDropdown label="Filtro" value={filterStatus} options={filterStatusOptions} onChange={setFilterStatus} />
              <DateFilterPicker label="Desde" value={dateFilter} onChange={setDateFilter} ariaLabel="Seleccionar fecha" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Nombre del producto" hint="Maximo 120 caracteres." htmlFor="demo-name">
                <AdminInput id="demo-name" placeholder="Ej: Polo Classic" />
              </AdminField>
              <AdminField label="Descripcion" htmlFor="demo-desc">
                <AdminTextarea id="demo-desc" placeholder="Describe el producto..." />
              </AdminField>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <AdminCheckboxField label="Activar notificaciones" checked={checked} onChange={setChecked} />
              <OpsQuantityStepper
                value={quantity}
                onChange={setQuantity}
                onIncrement={() => setQuantity(String(Math.min(99, Number(quantity) + 1)))}
                onDecrement={() => setQuantity(String(Math.max(1, Number(quantity) - 1)))}
                max={99}
              />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsSelectMenu</p>
              <div className="max-w-xs">
                <OpsSelectMenu value={selectValue} onValueChange={setSelectValue} placeholder="Seleccionar tipo" options={selectOptions} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsMultiSelectMenu</p>
              <div className="max-w-xs">
                <OpsMultiSelectMenu selectedValues={multiSelectValues} onToggle={(v) => setMultiSelectValues((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v])} placeholder="Seleccionar tallas" options={[{ value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" }, { value: "xl", label: "X-Large" }]} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsSelectionChip</p>
              <div className="flex flex-wrap gap-2">
                <OpsSelectionChip label="Talla M" selected />
                <OpsSelectionChip label="Color Negro" selected onRemove={() => {}} />
                <OpsSelectionChip label="Tela Algodon" />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsReadonlyFieldState</p>
              <div className="max-w-xs">
                <OpsReadonlyFieldState value="Generado automaticamente" placeholder="Sin valor" />
                <div className="mt-1">
                  <OpsReadonlyFieldState value="POL-2025-0042" badge="SKU" />
                </div>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">FieldLabel</p>
              <FieldLabel actionLabel="Crear nuevo" onAction={() => {}}>Tipo de prenda</FieldLabel>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">MultiSelectCatalog</p>
              <div className="max-w-sm">
                <MultiSelectCatalog
                  label="Tallas"
                  items={[{ id: "s", name: "Small", code: "S" }, { id: "m", name: "Medium", code: "M" }, { id: "l", name: "Large", code: "L" }]}
                  selectedIds={multiSelectValues}
                  idKeys={["id"]}
                  placeholder="Elegir tallas"
                  onToggle={(id) => setMultiSelectValues((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])}
                  onCreate={() => {}}
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">Stepper</p>
              <div className="flex flex-wrap gap-3">
                <AdminActionButton onClick={() => setStepperStep(Math.max(0, stepperStep - 1))} className="text-[10px]">Anterior</AdminActionButton>
                <AdminActionButton onClick={() => setStepperStep(Math.min(2, stepperStep + 1))} className="text-[10px]">Siguiente</AdminActionButton>
              </div>
              <div className="mt-3 max-w-lg">
                <Stepper steps={stepperSteps} currentStep={stepperStep} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">InputGroup (login-style)</p>
              <div className="max-w-xs space-y-2">
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <User className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  </InputGroupAddon>
                  <InputGroupInput placeholder="Usuario" />
                </InputGroup>
                <InputGroup>
                  <InputGroupAddon align="inline-start">
                    <Smartphone className="h-4 w-4 text-[var(--ops-text-muted)]" />
                  </InputGroupAddon>
                  <InputGroupInput type={showPass ? "text" : "password"} value={passValue} onChange={(e) => setPassValue(e.target.value)} placeholder="Contraseña" />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton onClick={() => setShowPass((p) => !p)}>
                      <Eye className="h-4 w-4" />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 8. PICKERS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<MapPin className="h-4 w-4" />} title="8. Pickers" />
          <div className="space-y-3">
            <div className="relative inline-block">
              <AdminActionButton onClick={() => setPickerOpen((p) => !p)}>
                <Search className="h-3.5 w-3.5" />
                Elegir ubicacion
                <ChevronDown className="h-3.5 w-3.5" />
              </AdminActionButton>
              {pickerOpen && (
                <div className="absolute left-0 top-[calc(100%+0.375rem)] z-50">
                  <CompactPickerPopover>
                    <div className="border-b border-[var(--ops-border-soft)] px-2 py-1.5">
                      <input
                        type="text"
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
                      />
                    </div>
                    <CompactPickerList>
                      {filteredPickerItems.length > 0 ? (
                        filteredPickerItems.map((item) => (
                          <CompactPickerOption key={item} onClick={() => { setPickerOpen(false); setPickerQuery("") }}>
                            <span className="text-sm text-[var(--ops-text)]">{item}</span>
                          </CompactPickerOption>
                        ))
                      ) : (
                        <CompactPickerEmpty>Sin coincidencias.</CompactPickerEmpty>
                      )}
                    </CompactPickerList>
                  </CompactPickerPopover>
                </div>
              )}
            </div>
            <div className="max-w-xs">
              <CompactPickerPopover>
                <CompactPickerList>
                  <CompactPickerEmpty>CompactPickerEmpty: sin resultados para mostrar.</CompactPickerEmpty>
                </CompactPickerList>
              </CompactPickerPopover>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">SearchablePicker (con busqueda + keyboard nav)</p>
              <div className="max-w-sm">
                <SearchablePicker
                  value={picker2Query}
                  onChange={(v) => { setPicker2Query(v); setPicker2Highlight(0) }}
                  placeholder="Buscar producto..."
                  open={picker2Open}
                  onOpenChange={setPicker2Open}
                  items={searchableItems.filter((item) => item.name.toLowerCase().includes(picker2Query.toLowerCase()))}
                  loading={false}
                  emptyMessage="No hay coincidencias."
                  maxVisibleItems={5}
                  highlightedIndex={picker2Highlight}
                  onHighlightChange={setPicker2Highlight}
                  getItemKey={(item) => item.id}
                  renderItem={(item) => (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--ops-text)]">{item.name}</span>
                      <span className="text-[11px] text-[var(--ops-text-muted)]">{item.code} · stock: {item.stock}</span>
                    </div>
                  )}
                  onSelect={(item) => { setPicker2Query(item.name); setPicker2Open(false); setPicker2Highlight(0) }}
                  onClear={() => { setPicker2Query(""); setPicker2Open(false); setPicker2Highlight(0) }}
                />
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 9. ACTIONS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<Power className="h-4 w-4" />} title="9. Actions" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsCardActionLink</p>
              <OpsCardActionLink href={appRoutes.home} label="Ir al inicio" />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminActionButton (accent / neutral / danger)</p>
              <div className="flex flex-wrap gap-2">
                <AdminActionButton tone="accent"><Plus className="h-3.5 w-3.5" />Crear</AdminActionButton>
                <AdminActionButton tone="neutral"><Settings className="h-3.5 w-3.5" />Configurar</AdminActionButton>
                <AdminActionButton tone="danger"><XCircle className="h-3.5 w-3.5" />Eliminar</AdminActionButton>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminRowActionButton</p>
              <div className="flex flex-wrap gap-2">
                <AdminRowActionButton icon={<Eye className="h-3.5 w-3.5" />}>Ver</AdminRowActionButton>
                <AdminRowActionButton icon={<PencilLine className="h-3.5 w-3.5" />} tone="accent">Editar</AdminRowActionButton>
                <AdminRowActionButton icon={<XCircle className="h-3.5 w-3.5" />} tone="danger">Borrar</AdminRowActionButton>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminRowActionsMenu</p>
              <div className="w-14">
                <AdminRowActionsMenu
                  items={[
                    { label: "Editar", icon: <PencilLine className="h-3.5 w-3.5" />, onSelect: () => {} },
                    { label: "Duplicar", icon: <RefreshCw className="h-3.5 w-3.5" />, onSelect: () => {} },
                    { label: "Eliminar", icon: <XCircle className="h-3.5 w-3.5" />, tone: "danger", onSelect: () => {} },
                  ]}
                />
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 10. ADMIN COMPONENTS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<Settings className="h-4 w-4" />} title="10. Admin Components" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminSection</p>
              <AdminSection title="Datos del producto" description="Informacion basica del producto." aside={<OpsInlineBadge label="Opcional" tone="neutral" />}>
                <p className="text-sm text-[var(--ops-text-muted)]">Contenido de la seccion aqui.</p>
              </AdminSection>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminCheckboxOption</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <AdminCheckboxOption label="Notificar por email" helper="Recibiras alertas de stock." checked={checked} onChange={setChecked} />
                <AdminCheckboxOption label="Notificar por SMS" helper="Requiere numero verificado." checked={false} onChange={() => {}} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminCheckboxRow</p>
              <div className="max-w-md space-y-1">
                <AdminCheckboxRow label="Activar cuenta" description="El usuario podra iniciar sesion." checked={checked} onChange={setChecked} />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsSelectMenu / OpsReadonlyFieldState</p>
              <div className="max-w-xs space-y-2">
                <OpsSelectMenu value={selectValue} onValueChange={setSelectValue} placeholder="Seleccionar tipo" options={selectOptions.slice(0, 2)} />
                <OpsReadonlyFieldState value="ADM-001" badge="Codigo" />
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 11. DIALOGS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<AlertTriangle className="h-4 w-4" />} title="11. Dialogs" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AdminConfirmModal (danger / accent / neutral)</p>
              <div className="flex flex-wrap gap-2">
                <AdminActionButton tone="danger" onClick={() => setShowAdminConfirm(true)}>Danger confirm</AdminActionButton>
                <AdminActionButton tone="accent" onClick={() => setShowAdminModal(true)}>Accent modal</AdminActionButton>
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 12. ALERTS & ATTENTION ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<Info className="h-4 w-4" />} title="12. Alerts & Attention" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsAttentionRow (embedded)</p>
              <div className="space-y-2">
                <OpsAttentionRow
                  icon={<Package className="h-4 w-4" />}
                  title="Stock bajo en 3 productos"
                  description="Los siguientes productos estan por debajo del minimo."
                  ctaLabel="Revisar inventario"
                  href={appRoutes.inventory}
                  highlightValue="3"
                  badge="Critico"
                  tone="danger"
                  embedded
                />
                <OpsAttentionRow
                  icon={<RefreshCw className="h-4 w-4" />}
                  title="Transferencia pendiente"
                  description="La sucursal Norte espera recepcion de 12 unidades."
                  ctaLabel="Ir a transferencias"
                  href={appRoutes.transfers}
                  highlightValue="12"
                  badge="Pendiente"
                  tone="warning"
                  embedded
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsPendingRow (critical / warning / info)</p>
              <div className="space-y-2 rounded-xl border border-[var(--ops-border-strong)]">
                <OpsPendingRow
                  icon={<AlertTriangle className="h-4 w-4" />}
                  title="Cierre de caja pendiente"
                  description="Debes cerrar la caja antes de las 20:00."
                  ctaLabel="Cerrar caja"
                  ctaHref={appRoutes.cash}
                  tone="critical"
                />
                <OpsPendingRow
                  icon={<Clock className="h-4 w-4" />}
                  title="Precios sin actualizar"
                  description="3 productos no tienen precio vigente para esta temporada."
                  ctaLabel="Actualizar"
                  ctaHref={appRoutes.prices}
                  tone="warning"
                />
                <OpsPendingRow
                  icon={<Info className="h-4 w-4" />}
                  title="Nuevo catalogo disponible"
                  description="Se agregaron 5 colores a la paleta de temporada."
                  ctaLabel="Ver catalogo"
                  ctaHref={appRoutes.catalogs}
                  tone="info"
                />
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">AttentionPanel</p>
              <AttentionPanel items={attentionItems} />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsEmptyState (con action prop)</p>
              <div className="flex gap-2">
                <OpsEmptyState variant="compact" description="Sin datos para este periodo." />
                <OpsEmptyState variant="dashed" description="Arrastra widgets aqui." />
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 13. WIZARD & PROGRESS ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<Ticket className="h-4 w-4" />} title="13. Wizard & Progress" />
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">SalesWizardRail (4 steps)</p>
              <SalesWizardRail items={wizardItems} canGoPrevious canGoNext canAdvance />
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">ReceiptOptionsModal (5 formatos)</p>
              <AdminActionButton onClick={() => setReceiptDemoOpen(true)}>
                <Ticket className="h-3.5 w-3.5" />
                Abrir modal de comprobante
              </AdminActionButton>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">OpsLocationIcon (store / warehouse / default)</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <OpsLocationIcon type="store" className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  <span className="text-xs text-[var(--ops-text-muted)]">store</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <OpsLocationIcon type="warehouse" className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  <span className="text-xs text-[var(--ops-text-muted)]">warehouse</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <OpsLocationIcon type={null} className="h-4 w-4 text-[var(--ripnel-accent)]" />
                  <span className="text-xs text-[var(--ops-text-muted)]">default</span>
                </div>
              </div>
            </div>
          </div>
        </OpsSectionDivider>

        {/* ──────────── 14. STATUS PAGES ──────────── */}
        <OpsSectionDivider>
          <OpsSectionHeader icon={<Ban className="h-4 w-4" />} title="14. Status Pages" />
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)]">
              <div className="scale-[0.28] origin-top-left w-[357%]">
                <LoadingPage variant="ops" />
              </div>
              <p className="-mt-1 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">LoadingPage</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)]">
              <div className="scale-[0.28] origin-top-left w-[357%]">
                <NotFoundPage variant="ops" />
              </div>
              <p className="-mt-1 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">NotFoundPage</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)]">
              <div className="scale-[0.28] origin-top-left w-[357%]">
                <ForbiddenPage variant="ops" />
              </div>
              <p className="-mt-1 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">ForbiddenPage</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--ops-border-strong)]">
              <div className="scale-[0.28] origin-top-left w-[357%]">
                <ErrorPage variant="ops" />
              </div>
              <p className="-mt-1 px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ops-text-muted)]">ErrorPage</p>
            </div>
          </div>
        </OpsSectionDivider>

        {showAdminConfirm && (
          <AdminConfirmModal
            open={showAdminConfirm}
            title="AdminConfirmModal"
            description="Confirmar esta accion permanentemente."
            confirmLabel="Confirmar"
            confirmTone="danger"
            onCancel={() => setShowAdminConfirm(false)}
            onConfirm={() => setShowAdminConfirm(false)}
          />
        )}

        {showAdminModal && (
          <AdminModalShell
            title="AdminModalShell"
            description="Shell generico para formularios modales."
            onClose={() => setShowAdminModal(false)}
            footer={
              <AdminFormActionsBar>
                <AdminActionButton onClick={() => setShowAdminModal(false)}>Cerrar</AdminActionButton>
                <AdminActionButton tone="accent">Guardar</AdminActionButton>
              </AdminFormActionsBar>
            }
          >
            <p className="text-sm text-[var(--ops-text-muted)]">Contenido del modal aqui.</p>
          </AdminModalShell>
        )}

        <ReceiptOptionsModal
          open={receiptDemoOpen}
          onClose={() => setReceiptDemoOpen(false)}
          onOpenPreview={() => setReceiptDemoOpen(false)}
        />
      </OpsPageShell>
    </TooltipProvider>
  )
}
