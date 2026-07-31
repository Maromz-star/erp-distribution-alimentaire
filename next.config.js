/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Autorise le chargement des photos produits stockees localement dans /public/uploads
    remotePatterns: [],
  },
};

module.exports = nextConfig;
