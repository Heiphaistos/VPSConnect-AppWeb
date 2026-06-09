/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL ?? 'http://backend:4000'
    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/ws/:path*', destination: `${backendUrl}/ws/:path*` },
    ]
  },
}

export default nextConfig
