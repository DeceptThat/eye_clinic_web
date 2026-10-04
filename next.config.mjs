/** @type {import('next').NextConfig} */
const nextConfig = {
  // React Compiler is off: it caused "cannot read properties of null" crashes
  // on pages that show a form only when one is open.
  reactCompiler: false,
  // Allow opening the dev server from other devices on the LAN
  allowedDevOrigins: ["192.168.1.45"],
};

export default nextConfig;
