import type { NextConfig } from 'next'

const gateway = (process.env.AIGW_API_ORIGIN || 'http://127.0.0.1:8000').replace(/\/$/, '')

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${gateway}/api/:path*` },
      { source: '/v1/:path*', destination: `${gateway}/v1/:path*` },
    ]
  },
}

export default nextConfig
