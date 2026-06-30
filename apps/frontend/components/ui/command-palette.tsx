"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

type PaletteItem = {
  label: string
  href: string
  keywords?: string[]
}

let openPaletteFn: (() => void) | null = null

export function openCommandPalette() {
  openPaletteFn?.()
}

const PALETTE_ITEMS: PaletteItem[] = [
  { label: "Inicio", href: "/inicio", keywords: ["home", "inicio"] },
  { label: "Dashboard", href: "/panel", keywords: ["dashboard", "panel", "bi"] },
  { label: "Nueva venta", href: "/ventas/nueva", keywords: ["venta", "pos", "punto de venta", "vender"] },
  { label: "Historial de ventas", href: "/ventas/historial", keywords: ["historial", "ventas"] },
  { label: "Postventa", href: "/postventa", keywords: ["cambio", "devolucion", "anulacion"] },
  { label: "Caja del dia", href: "/caja", keywords: ["caja", "cash", "apertura", "cierre"] },
  { label: "Historial de caja", href: "/caja/historial", keywords: ["historial", "caja", "sesiones"] },
  { label: "Control de cajas", href: "/caja/control", keywords: ["control", "admin", "cajas"] },
  { label: "Clientes", href: "/clientes", keywords: ["clientes", "customer"] },
  { label: "Stock actual", href: "/inventario", keywords: ["stock", "inventario", "inventory"] },
  { label: "Movimientos de stock", href: "/inventario/movimientos", keywords: ["movimientos", "kardex"] },
  { label: "Ajustes de inventario", href: "/inventario/ajustes", keywords: ["ajustes", "inventario", "stock"] },
  { label: "Transferencias", href: "/transferencias", keywords: ["transferencias", "transfers"] },
  { label: "Solicitar transferencia", href: "/transferencias/solicitar", keywords: ["solicitar", "reposicion"] },
  { label: "Recepciones pendientes", href: "/transferencias/recepciones", keywords: ["recepciones", "pendientes"] },
  { label: "Historial de transferencias", href: "/transferencias/historial", keywords: ["historial", "transferencias"] },
  { label: "Catalogos", href: "/catalogos", keywords: ["catalogos", "tallas", "colores"] },
  { label: "Productos", href: "/productos", keywords: ["productos", "styles", "variants"] },
  { label: "Precios", href: "/precios", keywords: ["precios", "pricing"] },
  { label: "Usuarios", href: "/administracion/usuarios", keywords: ["usuarios", "users"] },
  { label: "Roles", href: "/administracion/roles", keywords: ["roles"] },
  { label: "Ubicaciones", href: "/administracion/ubicaciones", keywords: ["ubicaciones", "sedes", "locations"] },
  { label: "Cuenta", href: "/cuenta", keywords: ["cuenta", "perfil", "account"] },
  { label: "Seguridad", href: "/cuenta/seguridad", keywords: ["seguridad", "contrasena", "password"] },
  { label: "Notificaciones", href: "/notificaciones", keywords: ["notificaciones", "alertas"] },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = query.trim()
    ? PALETTE_ITEMS.filter((item) => {
        const q = query.toLowerCase()
        return (
          item.label.toLowerCase().includes(q) ||
          item.keywords?.some((k) => k.includes(q))
        )
      })
    : PALETTE_ITEMS

  const onClose = useCallback(() => {
    setOpen(false)
    setQuery("")
    setActiveIndex(0)
  }, [])

  const onSelect = useCallback(
    (href: string) => {
      router.push(href)
      onClose()
    },
    [router, onClose]
  )

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        if (!open) {
          setActiveIndex(0)
        }
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape" && open) {
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    openPaletteFn = () => {
      setActiveIndex(0)
      setOpen(true)
    }
    return () => {
      openPaletteFn = null
    }
  }, [])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % filtered.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      onSelect(filtered[activeIndex].href)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 top-[18%] mx-auto w-full max-w-lg px-4">
        <div className="overflow-hidden rounded-2xl border border-[var(--ops-border-strong)] bg-[var(--ops-surface)] shadow-2xl">
          <div className="flex items-center gap-3 border-b border-[var(--ops-border-soft)] px-4 py-3">
            <Search className="h-4 w-4 text-[var(--ops-text-muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
              placeholder="Buscar módulo o página..."
              className="flex-1 bg-transparent text-sm text-[var(--ops-text)] outline-none placeholder:text-[var(--ops-text-muted)]"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="inline-flex h-5 items-center gap-0.5 rounded-md border border-[var(--ops-border-strong)] bg-[var(--ops-surface-muted)] px-1.5 text-[10px] font-semibold text-[var(--ops-text-muted)]">
              ESC
            </kbd>
          </div>
          <div className="max-h-[320px] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--ops-text-muted)]">
                Sin resultados para &quot;{query}&quot;
              </p>
            ) : (
              filtered.map((item, index) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => onSelect(item.href)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                    index === activeIndex
                      ? "bg-[color:color-mix(in_srgb,var(--ripnel-accent)_14%,transparent)] text-[var(--ops-text)]"
                      : "text-[var(--ops-text-muted)] hover:bg-[var(--ops-surface-muted)]"
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  {item.keywords && (
                    <span className="ml-auto shrink-0 text-[11px] text-[var(--ops-text-muted)]">
                      {item.keywords[0]}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
