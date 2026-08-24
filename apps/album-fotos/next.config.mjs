/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Compila como fuente los paquetes compartidos del monorepo.
  transpilePackages: ["@salones/directorio", "@salones/experiencia", "@salones/ui", "@salones/core", "@salones/sync"],
};

export default nextConfig;
