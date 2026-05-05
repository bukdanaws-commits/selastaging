'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Chrome, Loader2, ShieldCheck, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GoogleLoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogin: () => Promise<void>
  isLoading: boolean
}

export function GoogleLoginModal({ open, onOpenChange, onLogin, isLoading }: GoogleLoginModalProps) {
  const handleGoogleLogin = async () => {
    await onLogin()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-[#2A2A35] bg-[#0B0B0F] [&>button]:hidden">
        {/* Top gradient */}
        <div className="h-2 bg-gradient-to-r from-primary via-teal-400 to-amber-400" />

        <div className="p-6 sm:p-8">
          <DialogHeader className="text-center space-y-4 mb-6">
            {/* Logo / Brand */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-3xl">🎵</span>
            </div>

            <div>
              <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
                Masuk untuk Melanjutkan
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2">
                Login menggunakan akun Google untuk membeli tiket
                Sheila On 7 — Melompat Lebih Tinggi Tour 2026
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Google Login Button */}
          <Button
            className={cn(
              'w-full h-12 text-base font-semibold rounded-xl transition-all duration-300',
              'bg-white hover:bg-gray-50 text-gray-800 border border-gray-200',
              'shadow-lg shadow-white/5',
              isLoading && 'opacity-80 pointer-events-none'
            )}
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            ) : (
              <Chrome className="mr-3 h-5 w-5" />
            )}
            {isLoading ? 'Menghubungkan...' : 'Masuk dengan Google'}
          </Button>

          {/* Features list */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4 text-primary" />
              </div>
              <span>Login aman & terverifikasi via Google OAuth</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-8 w-8 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </div>
              <span>Data peserta otomatis terisi dari profil Google</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span>E-tiket langsung tersedia setelah bayar</span>
            </div>
          </div>

          <Separator className="my-6 bg-[#2A2A35]" />

          {/* Terms */}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Dengan masuk, Anda menyetujui{' '}
            <span className="text-primary cursor-pointer hover:underline">Syarat & Ketentuan</span>
            {' '}dan{' '}
            <span className="text-primary cursor-pointer hover:underline">Kebijakan Privasi</span>
            {' '}yang berlaku.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
