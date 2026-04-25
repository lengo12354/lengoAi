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
  title: 'lengoAi — AI Auto Subtitles in Darija, French, English & 90+ Languages',
  description:
    'Generate accurate subtitles for any audio or video in Moroccan Darija (Arabic & Franco), French, English and 90+ languages. Export to SRT, VTT, CapCut, Premiere Pro and more in under a minute.',
  keywords: ['auto subtitles', 'darija subtitles', 'AI transcription', 'subtitle generator', 'SRT export', 'CapCut subtitles', 'Moroccan Arabic', 'Franco subtitles', 'lengoAi'],
  openGraph: {
    title: 'lengoAi — AI Auto Subtitles in Darija, French & 90+ Languages',
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
      <body className={`${inter.variable} ${outfit.variable}`}>
        <div className="noise-bg" />
        <SmoothScroller>
          <ThemeProvider>{children}</ThemeProvider>
        </SmoothScroller>
      </body>
    </html>
  )
}
