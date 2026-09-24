import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acesso pelo IP da rede local (além de localhost)
  allowedDevOrigins: [
    "100.88.152.149",
  ],
  experimental: {
    // O proxy (src/proxy.ts) roda em /api/uploads e faz o Next bufferizar
    // o corpo da requisição em memória. O limite padrão desse buffer barra
    // uploads grandes com 413. O form aceita PDF de até 30 MB, então damos
    // folga para a sobrecarga do multipart/form-data (boundaries e metadados).
    proxyClientMaxBodySize: "35mb",
  },
};

export default nextConfig;
