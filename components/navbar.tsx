"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Home, Search, Calculator, Globe, Settings } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-provider"

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { isAuthenticated, logout } = useAuth()

  const handleLogin = () => {
    router.push("/login")
  }

  const handleLogout = () => {
    logout()
    router.push("/")
  }

  const routes = [
    { name: "Home", path: "/", icon: <Home className="h-5 w-5 mr-2" /> },
    { name: "Search & Matching", path: "/search", icon: <Search className="h-5 w-5 mr-2" /> },
    { name: "Calculation", path: "/calculation", icon: <Calculator className="h-5 w-5 mr-2" /> },
    { name: "Regulation Overview", path: "/regulations", icon: <Globe className="h-5 w-5 mr-2" /> },
    ...(isAuthenticated ? [{ name: "Admin Panel", path: "/admin", icon: <Settings className="h-5 w-5 mr-2" /> }] : []),
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <span className="hidden sm:inline-block">Compliance Track</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6 ml-6">
            {routes.map((route) => (
              <Link
                key={route.path}
                href={route.path}
                className={cn(
                  "flex items-center text-sm font-medium transition-colors hover:text-primary",
                  pathname === route.path ? "text-primary" : "text-muted-foreground",
                )}
              >
                {route.icon}
                {route.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={isAuthenticated ? handleLogout : handleLogin} className="hidden sm:flex">
            {isAuthenticated ? "Logout (Admin)" : "Login"}
          </Button>

          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="pr-0">
              <div className="px-7">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl" onClick={() => setIsOpen(false)}>
                  <span>Compliance Track</span>
                </Link>
              </div>
              <div className="flex flex-col gap-4 mt-8">
                {routes.map((route) => (
                  <Link
                    key={route.path}
                    href={route.path}
                    onClick={() => setIsOpen(false)}
                    className={cn(
                      "flex items-center py-2 px-7 text-sm font-medium transition-colors hover:text-primary",
                      pathname === route.path ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {route.icon}
                    {route.name}
                  </Link>
                ))}
                <div className="px-7 mt-4">
                  <Button variant="outline" onClick={isAuthenticated ? handleLogout : handleLogin} className="w-full">
                    {isAuthenticated ? "Logout (Admin)" : "Login"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  )
}

