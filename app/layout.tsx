import type { Metadata } from 'next'
import { Fira_Sans, Fira_Code } from 'next/font/google'
import './globals.css'
import { ConditionalShell } from '@/components/layout/ConditionalShell'
import { GlobalOverlays } from '@/components/layout/GlobalOverlays'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { bootstrapAuth } from '@/lib/auth-bootstrap'
import { getActiveThemeKey } from '@/lib/active-brand'

const firaSans = Fira_Sans({ variable: '--font-sans', subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })
const firaMono = Fira_Code({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Content Dashboard by eternity',
  description: 'Análisis profundo de tu contenido e ingresos',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await bootstrapAuth()
  const themeKey = await getActiveThemeKey()
  return (
    <html lang="es" className={`${firaSans.variable} ${firaMono.variable} dark brand-${themeKey}`} suppressHydrationWarning>
      <body className="antialiased" style={{ minHeight: '100vh' }}>
        <AuthProvider>
          <ConditionalShell>{children}</ConditionalShell>
          <GlobalOverlays />
        </AuthProvider>
      </body>
    </html>
  )
}
