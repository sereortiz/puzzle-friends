import './globals.css'

export const metadata = {
  title: 'Puzzle Friends - Sua Estante de Quebra-Cabeças',
  description: 'Catalogue seus quebra-cabeças montados, siga amigos e compartilhe sua lista de presentes.',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-50 text-slate-900 pb-20">
        {children}
      </body>
    </html>
  )
}
