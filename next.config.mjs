/** @type {import('next').NextConfig} */
const nextConfig = {
  // No ignoreBuildErrors and no ignoreDuringBuilds. `npm run verify` is the
  // gate, and a build that cannot type-check is a build that is not finished.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
