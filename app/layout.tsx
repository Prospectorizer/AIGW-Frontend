import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../src/styles.css'
import '../src/theme.css'

export const metadata: Metadata = {
  title: 'AI Prospector',
  description: 'Inference request and infrastructure intelligence',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>
}
