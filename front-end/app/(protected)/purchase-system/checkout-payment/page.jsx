import { TabsPayment } from "@/components/ui/purchase-system/PaymentMethods"
import { PosHeader } from "@/components/ui/purchase-system/PosHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {ProceedButton} from "@/components/ui/proceed-button"

export default function CheckoutPaymentPage() {
    const item = {
        name: "Polo básico",
        size: "M",
        color: "Negro",
        quantity: 2,
        unitPrice: 45,
        discount: 5,
    }

    const subtotal = item.quantity * item.unitPrice
    const total = subtotal - item.discount

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#ede9fe_0%,#f5f3ff_35%,#f8fafc_70%,#eef2ff_100%)] px-4 py-6 md:px-8">
            <div className="mx-auto max-w-7xl space-y-5">
                <PosHeader currentStep={2} />

                <section className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
                    <Card className="bg-white/90">
                        <CardHeader>
                            <CardTitle>Opciones de pago</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TabsPayment className="max-w-xl" />
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90">
                        <CardHeader>
                            <CardTitle>Producto y precios</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                <p className="mt-1 text-sm text-slate-600">Talla: {item.size}</p>
                                <p className="text-sm text-slate-600">Color: {item.color}</p>
                                <p className="text-sm text-slate-600">Cantidad: {item.quantity}</p>
                            </div>

                            <div className="space-y-2 rounded-xl border border-slate-200 p-4 text-sm">
                                <div className="flex items-center justify-between text-slate-700">
                                    <span>Precio unitario</span>
                                    <span>S/. {item.unitPrice.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-700">
                                    <span>Subtotal</span>
                                    <span>S/. {subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between text-slate-700">
                                    <span>Descuento</span>
                                    <span>- S/. {item.discount.toFixed(2)}</span>
                                </div>
                                <div className="border-t border-slate-200 pt-2">
                                    <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                                        <span>Total</span>
                                        <span>S/. {total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Agrega un botón para finalizar la compra o descargar la factura. Este botón enviará un correo con la información sobre la compra */}

                            <ProceedButton
                                text="Finalizar compra"
                                className="w-full justify-center md:w-auto m-5 p-2" 
                                link=""
                            />
                            <button className="border-3 rounded-xl m-4 p-1" onClick>
                                Descargar factura o boleta en PDF
                            </button>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </div>
    )
}