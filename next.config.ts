import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/a100",
  serverExternalPackages: ["pdf-parse", "mammoth", "docxtemplater", "pizzip"],
};

export default nextConfig;
