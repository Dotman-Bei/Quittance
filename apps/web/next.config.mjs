import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The workspace packages ship untranspiled ESM; Next compiles them with the app.
  transpilePackages: ["@quittance/protocol-types", "@quittance/reference"],
  /*
   * The receipt corpus lives outside apps/web, so Next's file tracer does not bundle it
   * into the serverless function by default. Without this the deployed site finds no
   * receipts and renders "no runs yet" — correct-looking and wrong.
   */
  outputFileTracingRoot: join(dirname(fileURLToPath(import.meta.url)), "..", ".."),
  outputFileTracingIncludes: {
    "/": ["../../evidence/receipts/**"],
    "/receipts": ["../../evidence/receipts/**"],
    "/receipts/[hash]": ["../../evidence/receipts/**"],
    "/endpoints": ["../../evidence/receipts/**"],
    "/endpoints/[host]": ["../../evidence/receipts/**"],
  },
};
export default nextConfig;
