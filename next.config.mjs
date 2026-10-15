/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Verification builds set NEXT_DIST_DIR=.next-verify so they never overwrite
  // the .next folder a running `next dev` depends on. Unset everywhere else
  // (including Vercel), so the default stays .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
