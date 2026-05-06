'use client'

import { Music, Instagram, Twitter, Youtube, MapPin } from 'lucide-react'

const FOOTER_LINKS = [
  { label: 'Beranda', href: '#beranda' },
  { label: 'Tiket', href: '#tickets' },
  { label: 'Venue', href: '#venue' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Syarat & Ketentuan', href: '#' },
]

const SOCIAL_LINKS = [
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
]

export function Footer() {
  const scrollTo = (href: string) => {
    if (href === '#') return
    const el = document.querySelector(href)
    el?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer className="mt-auto border-t border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center">
                <Music className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-bold text-xs tracking-wider">SHEILA ON 7</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Sheila On 7 mengajak seluruh Sobat Duta untuk kembali melompat lebih tinggi — melampaui batas, mengejar mimpi, dan merayakan perjalanan musik yang telah menginspirasi jutaan hati.
            </p>
            <div className="glass-gold rounded-lg px-3 py-2 flex items-center gap-2 w-fit">
              <div className="h-5 w-5 rounded bg-gold/20 flex items-center justify-center">
                <span className="text-[9px] font-bold text-gold">BSI</span>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gold">Sponsor Utama</p>
                <p className="text-[9px] text-muted-foreground">Bank Syariah Indonesia</p>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider">Links</h4>
            <nav className="flex flex-col gap-1.5">
              {FOOTER_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => scrollTo(link.href)}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors text-left w-fit"
                >
                  {link.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Kontak */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider">Kontak</h4>
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <span>GBK Madya Stadium,<br />Gelora Bung Karno, Jakarta Pusat</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              24 Mei 2025 • Pukul 19:00 WIB
            </p>
          </div>

          {/* Follow Us */}
          <div className="space-y-3">
            <h4 className="font-semibold text-xs uppercase tracking-wider">Follow Us</h4>
            <div className="flex items-center gap-2">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="h-8 w-8 rounded-lg glass-teal flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300 hover-lift"
                >
                  <social.icon className="h-3.5 w-3.5" />
                </a>
              ))}
              <a
                href="#"
                aria-label="TikTok"
                className="h-8 w-8 rounded-lg glass-teal flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all duration-300 hover-lift"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48 6.28 6.28 0 001.86-4.48V8.76a8.26 8.26 0 004.84 1.55V6.84a4.84 4.84 0 01-1.12-.15z"/>
                </svg>
              </a>
            </div>
            <p className="text-[10px] text-muted-foreground">
              @sheilaon7official
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="divider-gradient my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[10px] text-muted-foreground/60">
            © 2025 Sheila On 7. All rights reserved.
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            Powered By <span className="text-primary/60 font-medium">pakD_Sinnay</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
