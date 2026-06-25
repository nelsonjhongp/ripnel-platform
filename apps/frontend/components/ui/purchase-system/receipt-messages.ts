export const RC = {
  dialog: {
    title: "Descargar comprobante",
    description: "Selecciona el formato de salida del documento.",
    close: "Cerrar",
    footerNote:
      "Los formatos de ticket estaran disponibles proximamente. El PDF A4 ya se encuentra operativo.",
  },

  options: {
    ticket80: {
      label: "Ticket 80mm",
      description: "Para impresoras termicas estandar de mostrador",
    },
    ticket58: {
      label: "Ticket 58mm",
      description: "Para impresoras portatiles y moviles",
    },
    pdfTicket: {
      label: "PDF formato ticket",
      description: "Archivo PDF con diseno de ticket termico",
    },
    pdfA4: {
      label: "PDF A4 / Carta",
      description: "Para impresion en hoja estandar de oficina",
    },
  },

  preview: {
    label: "Vista previa",
    description: "Previsualizar el comprobante antes de descargar.",
  },

  badge: {
    comingSoon: "Proximamente",
  },
} as const
