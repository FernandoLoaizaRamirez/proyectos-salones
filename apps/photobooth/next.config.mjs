/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@salones/sync", "@salones/directorio", "@salones/experiencia", "@salones/ui", "@salones/core"],
};

export default nextConfig;
