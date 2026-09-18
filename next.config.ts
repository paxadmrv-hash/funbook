import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acesso pelo IP da rede local (além de localhost)
  allowedDevOrigins: [
    "100.88.152.149",
  ],
};

export default nextConfig;
