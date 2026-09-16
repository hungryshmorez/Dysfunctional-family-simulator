const isGitHubPages = process.env.GITHUB_PAGES === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: { unoptimized: true },
  ...(isGitHubPages && {
    basePath: '/Dysfunctional-family-simulator',
    assetPrefix: '/Dysfunctional-family-simulator/',
  }),
};

export default nextConfig;