import os from "node:os";
import type { NextConfig } from "next";

function getLanDevOrigins() {
  const origins = new Set(["127.0.0.1", "localhost"]);
  const interfaces = os.networkInterfaces();

  for (const networkInterface of Object.values(interfaces)) {
    for (const address of networkInterface || []) {
      if (address.family !== "IPv4" || address.internal) {
        continue;
      }

      origins.add(address.address);
    }
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getLanDevOrigins(),
  async redirects() {
    return [
      {
        source: "/account",
        destination: "/cuenta",
        permanent: false,
      },
      {
        source: "/account-mockup",
        destination: "/cuenta",
        permanent: false,
      },
      {
        source: "/account/seguridad",
        destination: "/cuenta/seguridad",
        permanent: false,
      },
      {
        source: "/account/apariencia",
        destination: "/cuenta",
        permanent: false,
      },
      {
        source: "/account/operacion",
        destination: "/cuenta",
        permanent: false,
      },
      {
        source: "/dashboard",
        destination: "/panel",
        permanent: false,
      },
      {
        source: "/inventory",
        destination: "/inventario",
        permanent: false,
      },
      {
        source: "/inventory/ajustes",
        destination: "/inventario/ajustes",
        permanent: false,
      },
      {
        source: "/inventory/ajustes/nuevo",
        destination: "/inventario/ajustes/nuevo",
        permanent: false,
      },
      {
        source: "/inventory/movements",
        destination: "/inventario/movimientos",
        permanent: false,
      },
      {
        source: "/kardex",
        destination: "/inventario/movimientos",
        permanent: false,
      },
      {
        source: "/purchase-system",
        destination: "/ventas",
        permanent: false,
      },
      {
        source: "/purchase-system/checkout",
        destination: "/ventas",
        permanent: false,
      },
      {
        source: "/purchase-system/checkout-payment",
        destination: "/ventas",
        permanent: false,
      },
      {
        source: "/purchase-system/:saleId",
        destination: "/ventas/:saleId",
        permanent: false,
      },
      {
        source: "/transaction-history",
        destination: "/ventas/historial",
        permanent: false,
      },
      {
        source: "/transferencias/listado-de-transferencias",
        destination: "/transferencias",
        permanent: false,
      },
      {
        source: "/transferencias/solicitar-productos",
        destination: "/transferencias/solicitar",
        permanent: false,
      },
      {
        source: "/transferencias/recepciones-pendientes",
        destination: "/transferencias/recepciones",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
