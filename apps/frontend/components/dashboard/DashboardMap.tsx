"use client"

import { useEffect, useRef, useState } from "react"
import type { DepartmentSalesData } from "@/lib/dashboard-types"

const CENTER: [number, number] = [-9.19, -75.015]
const ZOOM = 5.8
const GEOJSON_URL =
  "https://raw.githubusercontent.com/juaneladio/peru-geojson/refs/heads/master/peru_departments_simple.geojson"

const COLOR_STEPS = ["#f5f0ff", "#ddd2ff", "#c4a8ff", "#a87cff", "#8b50f0", "#7c3aed", "#5b21b6"]

function getColor(value: number, max: number): string {
  if (max === 0 || value === 0) return COLOR_STEPS[0]
  const ratio = value / max
  const idx = Math.min(Math.floor(ratio * (COLOR_STEPS.length - 1)), COLOR_STEPS.length - 1)
  return COLOR_STEPS[Math.max(idx, 0)]
}

function formatCurrency(value: number) {
  return `S/. ${value.toFixed(2)}`
}

type Props = {
  departments?: DepartmentSalesData[]
  locationName?: string
  height?: number
}

export default function DashboardMap({ departments = [], locationName, height = 380 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<import("leaflet").Map | null>(null)
  const geoLayer = useRef<import("leaflet").GeoJSON | null>(null)
  const LeafletRef = useRef<typeof import("leaflet") | null>(null)
  const [geoLoaded, setGeoLoaded] = useState(false)
  const [hoveredDept, setHoveredDept] = useState<{ name: string; saleCount: number; totalAmount: number } | null>(null)

  const totalAmount = departments.reduce((s, d) => s + d.total_amount, 0)
  const maxAmount = Math.max(...departments.map((d) => d.total_amount), 0)

  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    top: 12,
    left: 12,
    background: "white",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 12,
    lineHeight: 1.4,
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    zIndex: 1000,
    display: hoveredDept ? "block" : "none",
    pointerEvents: "none",
  }

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const init = async () => {
      const L = (await import("leaflet")).default
      LeafletRef.current = L

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      })

      const map = L.map(mapRef.current!, {
        center: CENTER,
        zoom: ZOOM,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      })

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>, &copy; <a href="https://carto.com/" target="_blank">CARTO</a>',
      }).addTo(map)

      mapInstance.current = map

      const resp = await fetch(GEOJSON_URL)
      if (!resp.ok) return
      const geojson = await resp.json()
      setGeoLoaded(true)

      const deptEntries = departments.map((d) => [d.name, d] as const)

      const geoJsonLayer = L.geoJSON(geojson, {
        style: (feature) => {
          const name = feature?.properties?.NOMBDEP || ""
          const entry = deptEntries.find(([n]) => n.toLowerCase() === name.toLowerCase())
          const value = entry ? entry[1].total_amount : 0
          return {
            fillColor: getColor(value, maxAmount),
            weight: 1.2,
            opacity: 1,
            color: "#cbd5e1",
            fillOpacity: 0.85,
          }
        },
        onEachFeature: (feature, layer) => {
          const name = feature?.properties?.NOMBDEP || ""
          const entry = deptEntries.find(([n]) => n.toLowerCase() === name.toLowerCase())
          const dept = entry ? entry[1] : null
          const saleCount = dept?.sale_count ?? 0
          const deptTotal = dept?.total_amount ?? 0

          layer.bindTooltip(
            `<b>${name}</b>` +
              (dept ? `<br/>${saleCount} venta(s)<br/>${formatCurrency(deptTotal)}` : "<br/>Sin datos de ventas"),
            { sticky: true, direction: "top" }
          )

          layer.on({
            mouseover: () => {
              setHoveredDept({ name, saleCount, totalAmount: deptTotal })
              ;(layer as import("leaflet").Path).setStyle({
                weight: 2,
                color: "#475569",
                fillOpacity: 1,
              })
            },
            mouseout: () => {
              setHoveredDept(null)
              geoJsonLayer.resetStyle(layer)
            },
            click: () => {
              const polyLayer = layer as unknown as { getBounds?: () => import("leaflet").LatLngBounds }
              const bounds = polyLayer.getBounds?.()
              if (bounds && map.getBounds().contains(bounds.getCenter())) {
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 })
              }
            },
          })
        },
      }).addTo(map)

      geoLayer.current = geoJsonLayer

      if (locationName) {
        L.marker(CENTER, {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:16px;height:16px;border-radius:50%;background:#7c3aed;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        })
          .addTo(map)
          .bindPopup(`<b>${locationName}</b><br/>Sede activa`)
      }
    }

    void init()

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
      geoLayer.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!geoLayer.current || !LeafletRef.current || !geoLoaded) return
    const L = LeafletRef.current
    const deptEntries = departments.map((d) => [d.name, d] as const)
    geoLayer.current.eachLayer((layer) => {
      const feat = (layer as unknown as { feature?: { properties?: Record<string, string> } }).feature
      if (!feat?.properties) return
      const name = feat.properties.NOMBDEP || ""
      const entry = deptEntries.find(([n]) => n.toLowerCase() === name.toLowerCase())
      const value = entry ? entry[1].total_amount : 0
      ;(layer as import("leaflet").Path).setStyle({
        fillColor: getColor(value, maxAmount),
        fillOpacity: 0.85,
      })
    })
  }, [departments, maxAmount, geoLoaded])

  const hasData = departments.length > 0

  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--ops-border-strong)]">
      <div ref={mapRef} style={{ height: `${height}px`, width: "100%" }} />

      {/* Hover tooltip */}
      <div style={tooltipStyle}>
        {hoveredDept ? (
          <>
            <b>{hoveredDept.name}</b>
            <br />
            {hoveredDept.saleCount} venta(s)
            <br />
            {formatCurrency(hoveredDept.totalAmount)}
          </>
        ) : null}
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          background: "white",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #e2e8f0",
          fontSize: 11,
          lineHeight: 1.4,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          zIndex: 1000,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12 }}>Ventas por departamento</div>
        <div
          style={{
            height: 12,
            width: 140,
            borderRadius: 4,
            marginBottom: 4,
            background: `linear-gradient(to right, ${COLOR_STEPS.join(",")})`,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b" }}>
          <span>S/. 0</span>
          <span>{formatCurrency(maxAmount || 0)}</span>
        </div>
      </div>

      {/* Empty state overlay */}
      {!hasData ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="rounded-lg bg-white/90 px-4 py-3 text-center text-sm text-[var(--ops-text-muted)] shadow-sm backdrop-blur-sm">
            <p className="font-semibold text-[var(--ops-text)]">Sin datos por departamento</p>
            <p className="mt-0.5 text-xs">
              Los departamentos se iluminaran cuando los clientes tengan direcciones registradas.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
