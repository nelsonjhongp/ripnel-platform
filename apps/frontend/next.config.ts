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
};

export default nextConfig;
