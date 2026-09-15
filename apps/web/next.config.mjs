/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The workspace packages ship untranspiled ESM; Next compiles them with the app.
  transpilePackages: ["@quittance/protocol-types", "@quittance/reference"],
};
export default nextConfig;
