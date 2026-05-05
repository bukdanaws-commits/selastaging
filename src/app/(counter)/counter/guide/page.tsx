'use client'

import { Watch, Hash } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useCounterGuide } from '@/hooks/use-api'

export default function GuidePage() {
  const { data: guideData, isLoading } = useCounterGuide()

  // Extract wristband configs from API response
  const wristbandConfigs = (() => {
    const guide = guideData as { guide: unknown[] } | undefined
    return (guide?.guide ?? []) as Record<string, unknown>[]
  })()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-4 max-w-lg mx-auto w-full">
        <Skeleton className="h-16 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 p-4 max-w-lg mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Watch className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">
            Panduan Warna Gelang
          </h1>
          <p className="text-xs text-muted-foreground">
            Referensi cepat warna gelang per tiket tier
          </p>
        </div>
      </div>

      {/* ── Wristband Cards Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {wristbandConfigs.map((wb, idx) => (
          <Card
            key={String(wb.ticketTypeId ?? idx)}
            className="bg-[#111918] border-border/30 hover:border-primary/30 transition-colors"
          >
            <CardContent className="p-4 flex flex-col items-center gap-3 text-center">
              {/* Color Swatch */}
              <div
                className="h-12 w-12 rounded-full border-2 border-white/10 shadow-lg"
                style={{ backgroundColor: String(wb.wristbandColorHex ?? '#E5E7EB') }}
              />
              {/* Tier Name */}
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {String(wb.ticketTypeName ?? '-')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {String(wb.wristbandColor ?? '-')}
                </p>
              </div>
              {/* Wristband Type */}
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
                {String(wb.wristbandType ?? '-')}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Reference Table ── */}
      <Card className="bg-[#111918] border-border/30">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-foreground mb-3">
            Tiket Tier → Warna Gelang
          </h2>
          <div className="space-y-1">
            {wristbandConfigs.map((wb, idx) => (
              <div
                key={String(wb.ticketTypeId ?? idx)}
                className={`flex items-center justify-between py-2 px-3 rounded-lg ${
                  idx % 2 === 0 ? 'bg-[#0A0F0E]/60' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-4 w-4 rounded-full border border-white/10 shrink-0"
                    style={{ backgroundColor: String(wb.wristbandColorHex ?? '#E5E7EB') }}
                  />
                  <span className="text-xs font-medium text-foreground">
                    {String(wb.ticketTypeName ?? '-')}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {String(wb.wristbandColor ?? '-')}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
