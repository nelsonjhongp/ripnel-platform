import Image from "next/image"
import { BadgeCheck, Banknote, CircleAlert, CreditCard, Landmark, Receipt, Smartphone } from "lucide-react"

export function renderDocumentIcon(documentType: string, className: string) {
  if (documentType === "factura") return <Receipt className={className} />
  if (documentType === "boleta") return <CreditCard className={className} />
  if (documentType === "proforma") return <BadgeCheck className={className} />
  return <CircleAlert className={className} />
}

export function renderPaymentMethodIcon(method: string, className: string) {
  if (method === "cash") return <Banknote className={className} />
  if (method === "transfer") return <Landmark className={className} />
  if (method === "yape") {
    return <Image src="/yape.svg" alt="Yape" width={14} height={14} className={className} />
  }
  if (method === "plin") {
    return <Image src="/plin.svg" alt="Plin" width={14} height={14} className={className} />
  }
  return <Smartphone className={className} />
}
