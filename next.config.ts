import type { NextConfig } from "next";

const isGhPages = process.env.GITHUB_PAGES === "true";
const basePath = isGhPages ? "/Travel-Planner" : "";

const nextConfig: NextConfig = {
  output: isGhPages ? "export" : undefined,
  basePath,
  assetPrefix: isGhPages ? "/Travel-Planner/" : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
