/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compila como fuente los paquetes compartidos del monorepo.
  transpilePackages: ["@salones/ui", "@salones/core", "@salones/payments", "@salones/sync"],
};

export default nextConfig;
