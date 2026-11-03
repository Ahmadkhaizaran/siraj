import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config,{webpack}) {
    config.plugins.push(new webpack.NormalModuleReplacementPlugin(/^cloudflare:workers$/,new URL('./lib/cloudflare-unavailable.ts',import.meta.url).pathname));
    return config;
  },
};

export default nextConfig;
