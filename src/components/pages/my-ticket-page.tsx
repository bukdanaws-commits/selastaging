'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { formatRupiah } from '@/lib/utils';
import {
  useOrganizerWristbandGuide,
} from '@/hooks/use-api';

import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
  Ticket,
  Watch,
  MapPin,
  Calendar,
  Copy,
  CheckCircle2,
  LogIn,
  ArrowLeftRight,
  AlertCircle,
  Users,
  DoorOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ─── MOCK TICKET DATA FOR PARTICIPANT ────────────────────────────────────────

interface MyTicket {
  ticketCode: string;
  attendeeName: string;
  ticketType: string;
  tier: string;
  emoji: string;
  price: number;
  seatLabel: string | null;
  status: 'not_redeemed' | 'redeemed' | 'inside' | 'outside';
  wristbandCode: string | null;
  wristbandColor: string | null;
  wristbandColorHex: string | null;
  qrData: string;
  entryTime: string | null;
  entryGate: string | null;
}

const myTickets: MyTicket[] = [
  {
    ticketCode: 'SHL-JKT-VVIPPIT-0001',
    attendeeName: 'Budi Santoso',
    ticketType: 'VVIP PIT',
    tier: 'floor',
    emoji: '👑',
    price: 3500000,
    seatLabel: 'V1',
    status: 'inside',
    wristbandCode: 'WB-00001',
    wristbandColor: 'Gold',
    wristbandColorHex: '#FFD700',
    qrData: 'SHL-JKT-VVIPPIT-0001',
    entryTime: '2026-06-22T16:30:00',
    entryGate: 'VIP Gate',
  },
  {
    ticketCode: 'SHL-JKT-VIPZONE-0002',
    attendeeName: 'Budi Santoso',
    ticketType: 'VIP ZONE',
    tier: 'floor',
    emoji: '⭐',
    price: 2800000,
    seatLabel: 'P5',
    status: 'redeemed',
    wristbandCode: 'WB-00002',
    wristbandColor: 'Teal',
    wristbandColorHex: '#008080',
    qrData: 'SHL-JKT-VIPZONE-0002',
    entryTime: null,
    entryGate: null,
  },
  {
    ticketCode: 'SHL-JKT-FESTIV-0003',
    attendeeName: 'Budi Santoso',
    ticketType: 'FESTIVAL',
    tier: 'floor',
    emoji: '🎵',
    price: 2200000,
    seatLabel: null,
    status: 'outside',
    wristbandCode: 'WB-00003',
    wristbandColor: 'Orange',
    wristbandColorHex: '#FF6B35',
    qrData: 'SHL-JKT-FESTIV-0003',
    entryTime: '2026-06-22T16:45:00',
    entryGate: 'Gate A',
  },
  {
    ticketCode: 'SHL-JKT-CAT10001',
    attendeeName: 'Budi Santoso',
    ticketType: 'CAT 1',
    tier: 'tribun',
    emoji: '🎟️',
    price: 1750000,
    seatLabel: 'A5',
    status: 'not_redeemed',
    wristbandCode: null,
    wristbandColor: null,
    wristbandColorHex: null,
    qrData: 'SHL-JKT-CAT10001',
    entryTime: null,
    entryGate: null,
  },
];

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

function getStatusConfig(status: MyTicket['status']) {
  switch (status) {
    case 'not_redeemed':
      return {
        label: 'Belum Tukar Gelang',
        color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        icon: <AlertCircle className="w-3 h-3" />,
        note: 'Tukar di counter H-7 s/d H-1',
      };
    case 'redeemed':
      return {
        label: 'Sudah Tukar',
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        icon: <Watch className="w-3 h-3" />,
        note: null,
      };
    case 'inside':
      return {
        label: 'Di Dalam Venue',
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: <LogIn className="w-3 h-3" />,
        note: null,
      };
    case 'outside':
      return {
        label: 'Di Luar',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: <ArrowLeftRight className="w-3 h-3" />,
        note: 'Re-entry tersedia',
      };
  }
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export default function MyTicketPage() {
  const { data: guideData } = useOrganizerWristbandGuide()
  const wristbandConfigs = (() => {
    const guide = guideData as { guide: unknown[] } | undefined
    return (guide?.guide ?? []) as Record<string, unknown>[]
  })()

  const totalTickets = myTickets.length;
  const redeemed = myTickets.filter((t) => t.status !== 'not_redeemed').length;
  const inside = myTickets.filter((t) => t.status === 'inside').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-primary/10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Ticket className="w-4 h-4 text-primary" />
            </div>
            <h1 className="text-foreground font-bold text-lg">Tiket Saya</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* ═══════════ SUMMARY CARD ═══════════ */}
        <Card className="bg-gradient-to-br from-card to-background border-primary/15 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-gold" />
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-foreground font-bold text-lg">Budi Santoso</p>
                <p className="text-muted-foreground text-sm">Sobat Duta • 4 Tiket</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-background/80 border border-primary/8">
                <p className="text-xl font-bold text-foreground">{totalTickets}</p>
                <p className="text-[10px] text-muted-foreground">Total Tiket</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <p className="text-xl font-bold text-amber-400">{redeemed}</p>
                <p className="text-[10px] text-muted-foreground">Sudah Tukar</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <p className="text-xl font-bold text-emerald-400">{inside}</p>
                <p className="text-[10px] text-muted-foreground">Di Dalam Venue</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ═══════════ EVENT INFO ═══════════ */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-primary/8">
          <Calendar className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-sm text-foreground font-medium">Sheila On 7 — JAKARTA</p>
            <p className="text-xs text-muted-foreground">Sabtu, 22 Juni 2026 • GBK Madya Stadium</p>
          </div>
        </div>

        {/* ═══════════ TICKET CARDS ═══════════ */}
        <div className="space-y-4">
          {myTickets.map((ticket, idx) => {
            const statusConfig = getStatusConfig(ticket.status);
            return (
              <Card
                key={ticket.ticketCode}
                className="bg-card border-primary/10 overflow-hidden"
              >
                {/* Top bar with tier color */}
                <div className={cn(
                  'h-1',
                  ticket.tier === 'floor'
                    ? 'bg-gradient-to-r from-gold to-gold/60'
                    : 'bg-gradient-to-r from-primary to-primary/60'
                )} />

                <CardContent className="p-5 space-y-4">
                  {/* Ticket type header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{ticket.emoji}</span>
                      <div>
                        <h3 className="text-foreground font-bold text-base">{ticket.ticketType}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold',
                              ticket.tier === 'floor'
                                ? 'bg-gold/10 text-gold border-gold/30'
                                : 'bg-muted text-muted-foreground border-muted-foreground/20'
                            )}
                          >
                            {ticket.tier.toUpperCase()}
                          </Badge>
                          {ticket.seatLabel && (
                            <span className="text-xs text-muted-foreground">
                              Seat: <span className="text-foreground font-medium">{ticket.seatLabel}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-gold font-bold text-sm">{formatRupiah(ticket.price)}</p>
                    </div>
                  </div>

                  <Separator className="bg-primary/8" />

                  {/* QR Code + Ticket Code */}
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-lg shrink-0">
                      <QRCodeSVG
                        value={ticket.qrData}
                        size={120}
                        level="H"
                        includeMargin={false}
                        fgColor="#0A0F0E"
                        bgColor="#ffffff"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Kode Tiket</p>
                        <div className="flex items-center gap-1.5">
                          <p className="font-mono text-sm text-foreground font-bold">{ticket.ticketCode}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(ticket.ticketCode);
                              toast.success('Kode tiket disalin!');
                            }}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Status badge */}
                      <div>
                        <p className="text-[10px] text-muted-foreground mb-1">Status</p>
                        <Badge variant="outline" className={cn('text-xs gap-1.5 py-1', statusConfig.color)}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Status details */}
                  <div className={cn(
                    'p-3 rounded-lg border',
                    ticket.status === 'not_redeemed'
                      ? 'bg-gray-500/5 border-gray-500/10'
                      : ticket.status === 'redeemed'
                      ? 'bg-amber-500/5 border-amber-500/10'
                      : ticket.status === 'inside'
                      ? 'bg-emerald-500/5 border-emerald-500/10'
                      : 'bg-blue-500/5 border-blue-500/10'
                  )}>
                    {ticket.status === 'not_redeemed' && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">
                            Tukar di counter <span className="text-foreground font-medium">H-7 s/d H-1</span> sebelum acara
                          </p>
                          <p className="text-[10px] text-gray-500 mt-1">
                            Bawa e-tiket ini ke counter penukaran gelang untuk mendapatkan gelang fisik
                          </p>
                        </div>
                      </div>
                    )}

                    {ticket.status === 'redeemed' && ticket.wristbandCode && (
                      <div className="flex items-start gap-2">
                        <Watch className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-foreground font-medium">Gelang: {ticket.wristbandCode}</span>
                            {ticket.wristbandColorHex && (
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-3 h-3 rounded-full border border-white/20"
                                  style={{ backgroundColor: ticket.wristbandColorHex }}
                                />
                                <span className="text-xs text-amber-400">{ticket.wristbandColor}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Scan gelang di gate untuk masuk venue
                          </p>
                        </div>
                      </div>
                    )}

                    {ticket.status === 'inside' && (
                      <div className="flex items-start gap-2">
                        <LogIn className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-foreground font-medium">Anda sudah di dalam venue</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            {ticket.entryTime && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Masuk: {formatTime(ticket.entryTime)}
                              </span>
                            )}
                            {ticket.entryGate && (
                              <span className="flex items-center gap-1">
                                <DoorOpen className="w-3 h-3" />
                                Gate: {ticket.entryGate}
                              </span>
                            )}
                          </div>
                          {ticket.wristbandCode && ticket.wristbandColorHex && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: ticket.wristbandColorHex }}
                              />
                              <span className="text-[10px] text-amber-400 font-medium">
                                {ticket.wristbandCode} — {ticket.wristbandColor}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {ticket.status === 'outside' && (
                      <div className="flex items-start gap-2">
                        <ArrowLeftRight className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-foreground font-medium">
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <CheckCircle2 className="w-3 h-3 text-blue-400" />
                            <span className="text-[10px] text-blue-400 font-medium">
                              Re-entry tersedia
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Scan gelang di gate untuk masuk kembali
                          </p>
                          {ticket.wristbandCode && ticket.wristbandColorHex && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div
                                className="w-3 h-3 rounded-full border border-white/20"
                                style={{ backgroundColor: ticket.wristbandColorHex }}
                              />
                              <span className="text-[10px] text-amber-400 font-medium">
                                {ticket.wristbandCode} — {ticket.wristbandColor}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Bottom ticket stub */}
                <div className="relative">
                  <Separator className="bg-primary/8" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-background" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 rounded-full bg-background" />
                </div>
                <div className="px-5 pb-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/60">
                    <span>Tiket #{idx + 1} dari {totalTickets}</span>
                    <span>Powered by BSI</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ═══════════ WRISTBAND INFO ═══════════ */}
        <Card className="bg-card border-primary/10">
          <CardContent className="p-5">
            <h3 className="text-foreground font-semibold text-sm flex items-center gap-2 mb-3">
              <Watch className="w-4 h-4 text-gold" />
              Panduan Warna Gelang
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {wristbandConfigs.map((wb, idx) => (
                <div
                  key={String(wb.ticketTypeId ?? idx)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background/60 border border-primary/6"
                >
                  <div
                    className="w-4 h-4 rounded-full shrink-0 border border-white/10"
                    style={{ backgroundColor: String(wb.wristbandColorHex ?? '#E5E7EB') }}
                  />
                  <div>
                    <p className="text-[11px] text-foreground font-medium">{String(wb.emoji ?? '')} {String(wb.ticketTypeName ?? '-')}</p>
                    <p className="text-[9px] text-muted-foreground">{String(wb.wristbandColor ?? '-')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export { MyTicketPage };
