"use client"

import {
  Card,
    CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
    BadgeCheck,
    Banknote,
    Building2,
    CreditCard,
    QrCode,
    Smartphone,
} from "lucide-react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

export function TabsPayment({ className }) {
    const methods = [
        {
            value: "overview",
            label: "Tarjeta",
            icon: CreditCard,
            title: "Pago con tarjeta",
            description: "Acerca el POS al cliente y espera la confirmacion de la transaccion.",
            details: ["Acepta debito y credito", "Confirmacion inmediata", "Recomendado para montos altos"],
        },
        {
            value: "analytics",
            label: "Efectivo",
            icon: Banknote,
            title: "Pago en efectivo",
            description: "Recibe el dinero y valida que el monto entregado cubra el total.",
            details: ["Verifica billetes", "Calcula vuelto", "Entrega comprobante"],
        },
        {
            value: "reports",
            label: "Deposito",
            icon: Building2,
            title: "Pago por deposito",
            description: "Solicita y valida el voucher antes de cerrar la venta.",
            details: ["BCP: 191-98765432-0-11", "CCI: 002-191-198765432011-55", "Valida titular y monto"],
        },
        {
            value: "settings",
            label: "Plin / Yape",
            icon: Smartphone,
            title: "Pago con billetera digital",
            description: "Escanea o comparte numero y confirma la recepcion del pago.",
            details: ["Numero: 987654321", "Titular: Juan Perez", "Verifica operacion aprobada"],
        },
    ]

  return (
        <div className={cn("w-full", className)}>
            <Tabs defaultValue="overview" className="w-full gap-4">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0 md:grid-cols-4">
                    {methods.map((method) => {
                        const Icon = method.icon

                        return (
                            <TabsTrigger
                                key={method.value}
                                value={method.value}
                                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-slate-600 shadow-xs transition hover:border-violet-200 hover:text-violet-700 data-active:border-violet-300 data-active:bg-violet-50 data-active:text-violet-700"
                            >
                                <Icon className="h-4 w-4" />
                                <span>{method.label}</span>
                            </TabsTrigger>
                        )
                    })}
                </TabsList>

                {methods.map((method) => (
                    <TabsContent
                        key={method.value}
                        value={method.value}
                        className="data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1"
                    >
                        <Card className="border-violet-100 bg-linear-to-br from-white via-violet-50/30 to-indigo-50/30">
                            <CardHeader>
                                <div className="flex items-center justify-between gap-3">
                                    <CardTitle className="text-slate-900">{method.title}</CardTitle>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700">
                                        <BadgeCheck className="h-3.5 w-3.5" />
                                        Recomendado
                                    </span>
                                </div>
                                <CardDescription>{method.description}</CardDescription>
                            </CardHeader>

                            <CardContent>
                                <div className="rounded-xl border border-slate-200/80 bg-white/80 p-3">
                                    <div className="grid gap-2 text-sm text-slate-700">
                                        {method.details.map((detail) => (
                                            <p key={detail} className="flex items-start gap-2">
                                                <QrCode className="mt-0.5 h-3.5 w-3.5 text-violet-500" />
                                                <span>{detail}</span>
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
    </div>
  )
}