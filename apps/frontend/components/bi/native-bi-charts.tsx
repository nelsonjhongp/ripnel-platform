"use client"

import React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  Cell,
  PieChart,
  Pie,
} from "recharts"

// Simple demo datasets approximating the Power BI visuals in the screenshots
const demoSalesByDay = [
  { day: "6", a: 177, b: 6 },
  { day: "7", a: 286, b: 7 },
  { day: "8", a: 0, b: 0 },
  { day: "9", a: 312, b: 9 },
]

const demoScatter = [
  { x: 2023, y: 60 },
  { x: 2024, y: 72 },
  { x: 2025, y: 45 },
]

const demoPaymentMix = [
  { name: "Efectivo", value: 279.5 },
  { name: "Plin", value: 0 },
  { name: "Transferencias", value: 360.6 },
  { name: "Yape", value: 0 },
]

const demoSalesByUser = [
  { user: "admin", total: 700 },
  { user: "Nelson", total: 720 },
  { user: "Operador", total: 680 },
  { user: "Tienda Centro", total: 710 },
]

export function BiChart1() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-900">Tablero BI 1 — Total ventas por día</h3>
      <div className="mt-3 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={demoSalesByDay} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
            <CartesianGrid stroke="#e6eef8" />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip formatter={(value: number) => new Intl.NumberFormat("es-PE").format(value)} />
            <Legend />
            <Bar dataKey="a" name="Total ventas" fill="#3b82f6" />
            <Bar dataKey="b" name="Unidades" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function BiChart2() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-900">Tablero BI 2 — Dispersión anual</h3>
      <div className="mt-3 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart>
            <CartesianGrid stroke="#e6eef8" />
            <XAxis dataKey="x" name="Año" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis dataKey="y" name="Suma" tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={demoScatter} fill="#4f46e5" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function BiChart3() {
  const COLORS = ["#6366f1", "#a78bfa", "#94a3b8", "#c7d2fe"]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-900">Tablero BI 3 — Mezcla de pago</h3>
      <div className="mt-3 flex-1 flex items-center justify-center">
        <ResponsiveContainer width="80%" height="100%">
          <PieChart>
            <Pie
              data={demoPaymentMix}
              dataKey="value"
              nameKey="name"
              innerRadius={40}
              outerRadius={90}
              label
            >
              {demoPaymentMix.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value} (${((value / demoPaymentMix.reduce((s, e) => s + e.value, 0)) * 100).toFixed(1)}%)`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function BiChart4() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm h-full flex flex-col">
      <h3 className="text-sm font-semibold text-slate-900">Tablero BI 4 — Ventas por colaborador</h3>
      <div className="mt-3 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={demoSalesByUser} margin={{ left: 8, right: 8 }}>
            <CartesianGrid stroke="#e6eef8" />
            <XAxis dataKey="user" tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip formatter={(value: number) => new Intl.NumberFormat("es-PE").format(value)} />
            <Bar dataKey="total" fill="#7c3aed" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function NativeBiCharts({ viewId }: { viewId: string | null }) {
  if (!viewId) return null

  if (viewId === "operacion-1") return <BiChart1 />
  if (viewId === "operacion-2") return <BiChart2 />
  if (viewId === "operacion-3") return <BiChart3 />
  if (viewId === "operacion-4") return <BiChart4 />

  return null
}
