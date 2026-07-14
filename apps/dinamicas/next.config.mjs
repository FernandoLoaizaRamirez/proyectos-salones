/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@salones/ui", "@salones/core", "@salones/sync"],
};

export default nextConfig;
