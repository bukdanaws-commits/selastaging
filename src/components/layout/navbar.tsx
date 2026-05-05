'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Music, Menu, Ticket, User, LogOut, ShoppingBag, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import { usePageStore } from '@/lib/page-store'

const NAV_LINKS = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Tiket', href: '#tickets' },
  { label: 'Venue', href: '#venue' },
  { label: 'FAQ', href: '#faq' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const { user, isAuthenticated, isLoading, logout } = useAuthStore()
  const { navigateTo, currentPage } = usePageStore()

  const isLanding = currentPage === 'home'

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollTo = (href: string) => {
    setOpen(false)
    if (!isLanding) {
      navigateTo('home')
      setTimeout(() => {
        const el = document.querySelector(href)
        el?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return
    }
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleBuyTicket = () => {
    setOpen(false)
    if (!isLanding) {
      navigateTo('home')
      setTimeout(() => scrollTo('#tickets'), 100)
      return
    }
    scrollTo('#tickets')
  }

  const handleLoginClick = () => {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('open-login-modal'))
  }

  const handleLogout = () => {
    logout()
    navigateTo('home')
  }

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        scrolled || !isLanding
          ? 'glass border-b border-border/50 shadow-lg shadow-black/10'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => {
            if (!isLanding) navigateTo('home')
            else scrollTo('#beranda')
          }}
          className="flex items-center gap-2 group"
        >
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors duration-300">
            <Music className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-bold text-xs sm:text-sm tracking-wider">
            SHEILA ON 7
          </span>
        </button>

        {/* Desktop Nav */}
        {isLanding && (
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="px-3.5 py-1.5 text-base font-bold text-white hover:text-[#F8AD3C] transition-colors duration-300 rounded-lg hover:bg-white/5"
              >
                {link.label}
              </button>
            ))}
          </nav>
        )}

        {/* CTA + Auth + Mobile */}
        <div className="flex items-center gap-2">
          {isAuthenticated && user ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-muted-foreground hover:text-foreground text-xs"
                onClick={() => navigateTo('my-orders')}
              >
                <Ticket className="h-3.5 w-3.5 mr-1.5" />
                Tiket Saya
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-1.5 px-2 h-8">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-[9px]">
                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-xs max-w-[80px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 glass">
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigateTo('profile')} className="text-xs">
                    <User className="mr-2 h-3.5 w-3.5" />
                    Profil Saya
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigateTo('my-orders')} className="text-xs">
                    <ShoppingBag className="mr-2 h-3.5 w-3.5" />
                    Pesanan Saya
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive text-xs">
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex text-xs text-muted-foreground"
                onClick={handleLoginClick}
                disabled={isLoading}
              >
                Masuk
              </Button>
              <Button
                size="sm"
                onClick={handleBuyTicket}
                className="hidden sm:flex text-xs h-8 btn-shine glow-bsi"
              >
                Beli Tiket
              </Button>
            </>
          )}

          {/* Mobile Hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 glass border-border">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-sm">
                  <Music className="h-4 w-4 text-primary" />
                  SHEILA ON 7
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6 px-3">
                {isLanding && NAV_LINKS.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <button
                      onClick={() => scrollTo(link.href)}
                      className="w-full text-left px-3 py-2.5 text-base font-bold text-white hover:text-[#F8AD3C] rounded-lg hover:bg-white/5 transition-colors"
                    >
                      {link.label}
                    </button>
                  </SheetClose>
                ))}

                {isAuthenticated ? (
                  <div className="pt-3 mt-2 border-t border-border space-y-1">
                    <SheetClose asChild>
                      <button
                        onClick={() => navigateTo('my-orders')}
                        className="w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2.5"
                      >
                        <Ticket className="h-3.5 w-3.5 text-primary" />
                        Tiket Saya
                      </button>
                    </SheetClose>
                    <SheetClose asChild>
                      <button
                        onClick={() => navigateTo('profile')}
                        className="w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2.5"
                      >
                        <User className="h-3.5 w-3.5 text-primary" />
                        Profil Saya
                      </button>
                    </SheetClose>
                    <SheetClose asChild>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2.5 text-xs rounded-lg hover:bg-destructive/10 transition-colors flex items-center gap-2.5 text-destructive"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Keluar
                      </button>
                    </SheetClose>
                  </div>
                ) : (
                  <div className="pt-3 mt-2 border-t border-border">
                    <SheetClose asChild>
                      <Button variant="outline" size="sm" className="w-full mb-2 text-xs" onClick={handleLoginClick}>
                        Masuk dengan Google
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button size="sm" className="w-full text-xs btn-shine" onClick={handleBuyTicket}>
                        Beli Tiket
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
