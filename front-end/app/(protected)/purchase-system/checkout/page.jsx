"use client"

import { useState } from "react"
import { ArrowRight, BadgeCheck, Mail, MapPin, Phone, User } from "lucide-react"

import { CashRegisterStatus } from "@/components/ui/purchase-system/CashRegisterStatus"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import {ProceedButton} from "@/components/ui/proceed-button"
import Link from "next/link"

const DOC_TYPES = [
  { value: "DNI", label: "Documento Nacional de Identidad" },
  { value: "RUC", label: "Registro Único de Contribuyentes" },
  { value: "CE", label: "Carné de Extranjería" },
]

function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"

export default function CheckoutPage() {
  const [docType, setDocType] = useState("DNI")
  const [docNumber, setDocNumber] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")

  const isFactura = docType === "RUC"
  const docLabel = docType === "RUC" ? "RUC" : docType === "CE" ? "Número CE" : "DNI"
  const nameLabel = isFactura ? "Razón social" : "Nombre completo"
  const docMaxLength = docType === "RUC" ? 11 : docType === "CE" ? 12 : 8
  const docPlaceholder = docType === "RUC" ? "20123456789" : docType === "CE" ? "000123456" : "12345678"

  const handleSubmit = (event) => {
    event.preventDefault()
    // TODO: advance to payment step with collected data
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">

        <PosHeader
          title="Datos del cliente"
          subtitle="Completa la información del comprador para generar el comprobante correspondiente."
          currentStep={1}
        />

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Tipo de comprobante */}
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <BadgeCheck className="h-4 w-4 text-violet-600" />
                Tipo de documento / comprobante
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {DOC_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setDocType(type.value)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      docType === type.value
                        ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50/40"
                    }`}
                  >
                    <p className={`text-sm font-bold ${docType === type.value ? "text-violet-800" : "text-slate-800"}`}>
                      {type.value}
                    </p>
                    <p className="mt-0.5 text-xs leading-tight text-slate-500">{type.label}</p>
                  </button>
                ))}
              </div>
              {isFactura && (
                <p className="mt-3 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                  Se generará una <strong>factura</strong>. Asegúrate de ingresar el RUC y la dirección fiscal correctos.
                </p>
              )}
            </article>

            {/* Datos de identificación */}
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <User className="h-4 w-4 text-violet-600" />
                Identificación
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label={docLabel}>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder={docPlaceholder}
                    maxLength={docMaxLength}
                    className={INPUT_CLASS}
                    required
                  />
                </FormField>
                <FormField label={nameLabel}>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={isFactura ? "Empresa S.A.C." : "Juan Pérez García"}
                    className={INPUT_CLASS}
                    required
                  />
                </FormField>
              </div>
            </article>

            {/* Datos de contacto */}
            <article className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-md backdrop-blur md:p-6">
              <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-slate-800">
                <Phone className="h-4 w-4 text-violet-600" />
                Contacto
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Número telefónico">
                  <div className="flex items-center gap-2">
                    <span className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">+51</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="987 654 321"
                      maxLength={9}
                      className={INPUT_CLASS}
                    />
                  </div>
                </FormField>
                <FormField label="Correo electrónico">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className={`${INPUT_CLASS} pl-9`}
                    />
                  </div>
                </FormField>
                {isFactura && (
                  <div className="md:col-span-2">
                    <FormField label="Dirección fiscal">
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Av. Ejemplo 123, Lima"
                          className={`${INPUT_CLASS} pl-9`}
                        />
                      </div>
                    </FormField>
                  </div>
                )}
              </div>
            </article>
 
            <div className="flex items-center justify-between">
              <Link
                href="/purchase-system"
                className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                ← Volver a la orden
              </Link>
              <ProceedButton
                type="submit"
                text="Continuar al pago"
                className="flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
                link="/purchase-system/checkout-payment"
              >
                Continuar al pago
                <ArrowRight className="h-4 w-4" />
              </ProceedButton>
            </div>
          </form>

          <CashRegisterStatus
            totalItems={0}
            subtotal={0}
            reminderText="Completa los datos del cliente para continuar al paso de pago."
          />
        </div>
      </div>
    </div>
  )
}
