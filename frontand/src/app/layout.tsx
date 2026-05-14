import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import localFont from 'next/font/local'
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

const coolvetica = localFont({
  src: './fonts/coolvetica-rg.otf',
  variable: '--font-coolvetica',
  display: 'swap',
})

const coolveticaIt = localFont({
  src: './fonts/coolvetica-rg-it.otf',
  variable: '--font-coolvetica-it',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Awartools',
  description:
    'Generate accurate subtitles for any audio or video in Moroccan Darija (Arabic & Franco), French, English and 90+ languages. Export to SRT, VTT, CapCut, Premiere Pro and more in under a minute.',
  icons: {
    icon: '/lengoailogo2.png',
    apple: '/lengoailogo2.png',
  },
  openGraph: {
    title: 'Awartools',
    description: 'Generate perfect subtitles for your videos in seconds. Darija, French, English and 90+ more.',
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
      <body className={`${inter.variable} ${outfit.variable} ${coolvetica.variable} ${coolveticaIt.variable}`}>
        <div className="noise-bg" />
        <SmoothScroller>
          <ThemeProvider>{children}</ThemeProvider>
        </SmoothScroller>
      </body>
    </html>
  )
}
