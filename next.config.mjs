/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  // Allow opening the dev server from other devices on the LAN
  allowedDevOrigins: ["192.168.1.45"],
};

export default nextConfig;
