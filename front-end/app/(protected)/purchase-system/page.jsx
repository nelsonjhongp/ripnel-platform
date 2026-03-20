"use client"
import { Search, CirclePlus, Minus} from "lucide-react"

import { Stepper } from "@/components/ui/stepper"
import { DropdownButtom } from "@/components/ui/Dropdown-buttom"
import { TotalToPayField } from "@/components/ui/total-to-pay-field"
import { ProceedClientButton } from "@/components/ui/proceed-client-button"


export default function PurchaseSystem() {
    const purchaseSteps = [
        { id: "purchase-order", label: "Orden de compra" },
        { id: "customer-data", label: "Datos del cliente" },
        { id: "confirmation", label: "Confirmacion y pago" },
    ]

  return (
    <>
    <div className="px-8 py-4 mx-auto w-1/2">
        <Stepper steps={purchaseSteps} currentStep={0} />
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
            <div className="p-8 flex flex-col gap-4">
                <h3>Buscar producto</h3>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        className="rounded-4xl border bg-gray-300 px-3 py-2"
                        placeholder="Ingrese del producto"
                    />
                    <Search className="h-5 w-5" />
                </div>
            </div>

            <div className="p-8 flex flex-col gap-4">
                <h3>Cantidad</h3>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        className="rounded-4xl border border-slate-300 px-3 py-2 text-center"
                        placeholder="Ingrese la cantidad"
                    />
                    <CirclePlus className="h-5 w-5" />
                    <Minus className="h-5 w-5" />
                </div>
            </div>

            <div className="p-8 flex flex-col gap-4">
                <h3>Stock</h3>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        className="rounded-4xl border border-slate-300 px-3 py-2 text-center"
                        disabled
                    />
                </div>
            </div>

            <div className="p-8 flex flex-col gap-4">
                <h3>SKU</h3>
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        className="rounded-4xl border border-slate-300 px-3 py-2 text-center"
                        disabled
                    />
                </div>
            </div>
        </div>

        <div>
            <div className="p-8 flex flex-col gap-4">
                <h3>Talla</h3>
                <div className="flex items-center gap-2">
                        <DropdownButtom
                            id="dropdown-buttom-purchase"
                            className="mt-4 "
                            options={[
                                { value: "S", label: "S" },
                                { value: "M", label: "M" },
                                { value: "L", label: "L" },
                                { value: "XL", label: "XL" },
                            ]}
                        />
                </div>
            </div>

            <div className="p-8 flex flex-col gap-4">
                <h3>Color</h3>
                <div className="flex items-center gap-2">
                        <DropdownButtom
                            id="dropdown-buttom-color"
                            className="mt-4 "
                            options={[
                                { value: "Negro", label: "Negro" },
                                { value: "Blanco", label: "Blanco" },
                                { value: "Rojo", label: "Rojo" },
                                { value: "Azul", label: "Azul" },
                                { value: "Verde", label: "Verde" },
                                { value: "Amarillo", label: "Amarillo" },
                                { value: "Naranja", label: "Naranja" },
                            ]}
                        />
                </div>
            </div>
        </div>

    </div>

        <div className="mt-4 flex items-center justify-between bg-slate-100 px-8 py-6">
                <TotalToPayField />
                <ProceedClientButton />
        </div>

    </>
  )
}