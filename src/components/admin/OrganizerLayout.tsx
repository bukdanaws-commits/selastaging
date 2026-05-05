'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield, Menu, X, Bell, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const organizerNavItems = [
  { title: 'Penukaran Gelang', href: '/organizer', icon: Shield },
  { title: 'Riwayat', href: '/organizer/redeem-history', icon: ChevronRight },
]

interface OrganizerLayoutProps {
  children: React.ReactNode
}

export function OrganizerLayout({ children }: OrganizerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Teal Header */}
        <div className="flex items-center justify-between h-16 px-4 bg-primary">
          <Link href="/organizer" className="flex items-center gap-2 font-bold text-lg text-primary-foreground">
            <Shield className="h-6 w-6" />
            <span>ORGANIZER</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Station Info */}
        <div className="px-4 py-3 bg-primary/5">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Stasiun</p>
          <p className="text-sm font-semibold mt-0.5">Gate A — Stasiun Penukaran</p>
          <p className="text-xs text-muted-foreground mt-1">Login sebagai</p>
          <p className="text-sm font-medium text-primary">Andi Setiawan</p>
        </div>

        <Separator />

        <ScrollArea className="h-[calc(100vh-10rem)]">
          <nav className="p-3 space-y-1">
            {organizerNavItems.map((item) => {
              const isActive =
                item.href === '/organizer'
                  ? pathname === '/organizer'
                  : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Footer in sidebar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card">
          <p className="text-xs text-muted-foreground text-center">
            Sheila On 7 — Tour 2026
          </p>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/95 backdrop-blur border-b">
          <div className="flex items-center justify-between h-full px-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden lg:block">
              <h2 className="text-sm font-medium">
                Sheila On 7 — Melompat Lebih Tinggi Tour 2026
              </h2>
              <p className="text-xs text-muted-foreground">Panel Organizer</p>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    AS
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium leading-tight">Andi Setiawan</p>
                  <p className="text-xs text-muted-foreground leading-tight">Organizer</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  )
}
