/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@salones/directorio", "@salones/experiencia", "@salones/ui", "@salones/core", "@salones/sync"],
};

export default nextConfig;
