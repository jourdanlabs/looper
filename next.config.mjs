/** @type {import('next').NextConfig} */
// The console is served at the root ("/"), so no basePath.
const nextConfig = {
  reactStrictMode: true,
  // Self-contained runtime: `next build` traces exactly the node_modules the
  // server needs into .next/standalone, so the target machine runs it with
  // `node server.mjs` and needs no `npm install` and no build step.
  output: 'standalone',
};
export default nextConfig;
