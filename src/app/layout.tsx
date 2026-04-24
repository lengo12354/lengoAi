import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import ThemeProvider from '@/components/ThemeProvider'
import SmoothScroller from '@/components/SmoothScroller'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'lengoAi — The Ultimate AI Platform',
  description:
    'Experience the next generation of productivity. Supercharge your workflow with cinematic, hyper-fast AI tools.',
  keywords: ['AI tools', 'productivity', 'video to script', 'AI editor', 'design assistant'],
  openGraph: {
    title: 'lengoAi — The Ultimate AI Platform',
    description: 'Experience the next generation of productivity with AI.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${outfit.variable}`}>
        <div className="noise-bg" />
        <SmoothScroller>
          <ThemeProvider>{children}</ThemeProvider>
        </SmoothScroller>
      </body>
    </html>
  )
}
