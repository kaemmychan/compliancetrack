import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Navbar from "@/components/navbar"
import { AuthProvider } from "@/lib/auth-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Compliance Track",
  description: "Chemical compliance tracking system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            <Navbar />
            <main className="min-h-screen">{children}</main>
          </ThemeProvider>
          <div className="fixed bottom-4 right-4 text-sm text-muted-foreground z-10">by ATC</div>
        </AuthProvider>
      </body>
    </html>
  )
}



import './globals.css'