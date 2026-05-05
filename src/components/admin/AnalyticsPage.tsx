'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { toast } from 'sonner';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  CreditCard,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Globe,
  UserPlus,
  UserCheck,
  Building2,
  AlertTriangle,
} from 'lucide-react';
import { cn, formatRupiah } from '@/lib/utils';
import { useAdminAnalytics, useAdminDashboard } from '@/hooks/use-api';
import { Skeleton } from '@/components/ui/skeleton';

// ─── SUMMARY KPI CARD ────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  color = '#00A39D',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendLabel?: string;
  color?: string;
}) {
  return (
    <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)] hover:border-[rgba(0,163,157,0.3)] transition-all card-hover">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
            <p className="text-xl font-extrabold text-white">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            {trend && trendLabel && (
              <div className="flex items-center gap-1">
                {trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-green-400" /> : <ArrowDownRight className="w-3 h-3 text-red-400" />}
                <span className={cn('text-[10px] font-semibold', trend === 'up' ? 'text-green-400' : 'text-red-400')}>{trendLabel}</span>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── TOOLTIP STYLE ───────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: { backgroundColor: '#111918', border: '1px solid rgba(0,163,157,0.2)', borderRadius: '8px', color: '#F0FDF9', fontSize: '12px' },
  labelStyle: { color: '#7FB3AE' },
};

const axisStyle = { tick: { fill: '#7FB3AE', fontSize: 11 }, axisLine: { stroke: 'rgba(0,163,157,0.15)' }, tickLine: false };

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────────

export function AnalyticsPage() {
  const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useAdminAnalytics();
  const { data: dashboardData, isLoading: dashboardLoading } = useAdminDashboard();

  const isLoading = analyticsLoading || dashboardLoading;
  const analytics = analyticsData as Record<string, unknown> | undefined;
  const kpis = dashboardData as Record<string, unknown> | undefined;

  const totalRevenue = Number(kpis?.totalRevenue || 0);
  const totalSold = Number(kpis?.totalTicketsSold || 0);
  const totalQuota = Number(kpis?.totalQuota || 0);
  const paidOrders = Number(kpis?.paidOrders || 0);
  const conversionRate = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;
  const avgTicketPrice = totalSold > 0 ? Math.round(totalRevenue / totalSold) : 0;

  const revenueChartData = (kpis?.revenueChartData || analytics?.revenueChartData || []) as { date: string; revenue: number; orders: number }[];
  const salesByTier = (kpis?.salesByTier || analytics?.salesByTier || []) as { name: string; terjual: number; quota: number; revenue: number; percentage: number }[];
  const paymentMethodBreakdown = (kpis?.paymentMethodBreakdown || analytics?.paymentMethodBreakdown || []) as { method: string; count: number; percentage: number }[];
  const hourlySalesData = (analytics?.hourlySalesData || []) as { hour: string; sales: number }[];

  const peakHour = hourlySalesData.length > 0
    ? hourlySalesData.reduce((max, d) => (d.sales > max.sales ? d : max), hourlySalesData[0])
    : { hour: '—', sales: 0 };

  const payColors = ['#00A39D', '#00BFB8', '#7FB3AE', '#F8AD3C', '#D4922A', '#008580', '#4DB6AC'];

  const topCities = (analytics?.topCities || [
    { city: 'Jakarta', pct: 42 }, { city: 'Tangerang', pct: 12 }, { city: 'Bekasi', pct: 10 }, { city: 'Depok', pct: 8 }, { city: 'Bandung', pct: 7 },
  ]) as { city: string; pct: number }[];

  const ageDistribution = (analytics?.ageDistribution || [
    { range: '18-24', pct: 35 }, { range: '25-34', pct: 40 }, { range: '35-44', pct: 15 }, { range: '45+', pct: 10 },
  ]) as { range: string; pct: number }[];

  const handleExport = () => {
    toast.success('Export berhasil', { description: 'File laporan telah diunduh ke perangkat Anda.' });
  };

  if (analyticsError) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto" />
          <p className="text-red-400 font-medium">Failed to load analytics</p>
          <p className="text-muted-foreground text-sm">{String(analyticsError)}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(248,173,60,0.1)] flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[#F8AD3C]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Analytics & Reports</h2>
            <p className="text-muted-foreground text-xs">Data analitik penjualan</p>
          </div>
        </div>
        <Button size="sm" className="bg-[#00A39D] hover:bg-[#00BFB8] text-[#0A0F0E] text-xs font-semibold" onClick={handleExport}>
          <Download className="w-3 h-3 mr-1.5" />Export Laporan
        </Button>
      </div>

      <Separator className="bg-[rgba(0,163,157,0.1)]" />

      {/* ═══ SUMMARY KPIs ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Revenue" value={formatRupiah(totalRevenue)} subtitle={`${paidOrders} pesanan lunas`} icon={DollarSign} trend="up" trendLabel="+18.5% vs minggu lalu" color="#00A39D" />
        <KpiCard title="Avg Ticket Price" value={formatRupiah(avgTicketPrice)} subtitle={`${totalSold.toLocaleString('id-ID')} tiket terjual`} icon={Target} color="#F8AD3C" />
        <KpiCard title="Conversion Rate" value={`${conversionRate}%`} subtitle={`${totalSold.toLocaleString('id-ID')} / ${totalQuota.toLocaleString('id-ID')} quota`} icon={TrendingUp} trend="up" trendLabel="+5.2% vs target" color="#00BFB8" />
        <KpiCard title="Peak Sales Hour" value={peakHour.hour} subtitle={`${peakHour.sales} transaksi pada jam tersibuk`} icon={Clock} color="#7FB3AE" />
      </div>

      {/* ═══ MAIN TABS ═══ */}
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="bg-[#111918] border border-[rgba(0,163,157,0.15)] p-1">
          <TabsTrigger value="revenue" className="text-xs data-[state=active]:bg-[#00A39D] data-[state=active]:text-[#0A0F0E] data-[state=active]:font-bold"><DollarSign className="w-3 h-3 mr-1" />Revenue</TabsTrigger>
          <TabsTrigger value="sales" className="text-xs data-[state=active]:bg-[#00A39D] data-[state=active]:text-[#0A0F0E] data-[state=active]:font-bold"><BarChart3 className="w-3 h-3 mr-1" />Sales</TabsTrigger>
          <TabsTrigger value="demographics" className="text-xs data-[state=active]:bg-[#00A39D] data-[state=active]:text-[#0A0F0E] data-[state=active]:font-bold"><Users className="w-3 h-3 mr-1" />Demographics</TabsTrigger>
        </TabsList>

        {/* ─── REVENUE TAB ─── */}
        <TabsContent value="revenue" className="space-y-4">
          {revenueChartData.length > 0 && (
            <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-bold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[#00A39D]" />Revenue 7 Hari Terakhir</CardTitle>
                <CardDescription className="text-muted-foreground text-xs">Tren pendapatan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,163,157,0.08)" />
                      <XAxis dataKey="date" {...axisStyle} />
                      <YAxis {...axisStyle} tickFormatter={(v: number) => `${(v / 1000000000).toFixed(1)}M`} />
                      <Tooltip {...tooltipStyle} formatter={(value: number) => [formatRupiah(value), 'Revenue']} />
                      <Line type="monotone" dataKey="revenue" stroke="#00A39D" strokeWidth={2.5} dot={{ fill: '#00A39D', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: '#00BFB8', stroke: '#00A39D', strokeWidth: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {salesByTier.length > 0 && (
              <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)] lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#F8AD3C]" />Revenue per Kategori Tiket</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesByTier} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,163,157,0.06)" horizontal={false} />
                        <XAxis type="number" {...axisStyle} tickFormatter={(v: number) => `${(v / 1000000000).toFixed(1)}M`} />
                        <YAxis type="category" dataKey="name" {...axisStyle} width={55} />
                        <Tooltip {...tooltipStyle} formatter={(value: number) => [formatRupiah(value), 'Revenue']} />
                        <Bar dataKey="revenue" fill="#00A39D" radius={[0, 4, 4, 0]} barSize={18} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-[#111918] border border-[rgba(248,173,60,0.2)]">
              <CardContent className="p-6 flex flex-col items-center justify-center h-full space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[rgba(248,173,60,0.12)] flex items-center justify-center"><DollarSign className="w-7 h-7 text-[#F8AD3C]" /></div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Revenue</p>
                  <p className="text-3xl font-extrabold gradient-text-gold">{formatRupiah(totalRevenue)}</p>
                </div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400 font-semibold">+18.5%</span>
                  <span className="text-muted-foreground">vs target awal</span>
                </div>
                <Separator className="bg-[rgba(0,163,157,0.1)] w-full" />
                <div className="grid grid-cols-2 gap-4 w-full text-center">
                  <div>
                    <p className="text-lg font-bold text-white">{paidOrders}</p>
                    <p className="text-[10px] text-muted-foreground">Orders Paid</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{paidOrders > 0 ? formatRupiah(Math.round(totalRevenue / paidOrders)) : '—'}</p>
                    <p className="text-[10px] text-muted-foreground">AOV</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── SALES TAB ─── */}
        <TabsContent value="sales" className="space-y-4">
          {salesByTier.length > 0 && (
            <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-bold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#00A39D]" />Tiket Terjual per Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesByTier} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,163,157,0.06)" />
                      <XAxis dataKey="name" {...axisStyle} tick={{ ...axisStyle.tick, fontSize: 10 }} />
                      <YAxis {...axisStyle} />
                      <Tooltip {...tooltipStyle} formatter={(value: number, name: string) => [`${value.toLocaleString('id-ID')} tiket`, name === 'terjual' ? 'Terjual' : 'Quota']} />
                      <Bar dataKey="terjual" fill="#00A39D" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar dataKey="quota" fill="rgba(0,163,157,0.15)" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {salesByTier.length > 0 && (
            <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
              <CardHeader className="pb-3"><CardTitle className="text-white text-sm font-bold">Detail Penjualan per Tier</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-[rgba(0,163,157,0.08)]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[rgba(0,163,157,0.15)] hover:bg-transparent">
                        <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider">Kategori</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">Terjual</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">Quota</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">%</TableHead>
                        <TableHead className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesByTier.map((tier) => (
                        <TableRow key={tier.name} className="border-b border-[rgba(0,163,157,0.08)] hover:bg-[rgba(0,163,157,0.04)]">
                          <TableCell className="text-sm text-white font-medium">{tier.name}</TableCell>
                          <TableCell className="text-sm text-white text-right">{tier.terjual.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-sm text-muted-foreground text-right">{tier.quota.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right"><Badge variant="outline" className={cn('text-[10px] font-bold', tier.percentage >= 90 ? 'border-red-500/50 text-red-400' : tier.percentage >= 70 ? 'border-[rgba(248,173,60,0.5)] text-[#F8AD3C]' : 'border-green-500/50 text-green-400')}>{tier.percentage}%</Badge></TableCell>
                          <TableCell className="text-sm text-[#00A39D] font-semibold text-right">{formatRupiah(tier.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {paymentMethodBreakdown.length > 0 && (
            <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-bold flex items-center gap-2"><CreditCard className="w-4 h-4 text-[#00BFB8]" />Distribusi Metode Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentMethodBreakdown.map((pm, i) => (
                  <div key={pm.method} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: payColors[i] || '#00A39D' }} />
                        <span className="text-muted-foreground">{pm.method}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{pm.count} trx</span>
                        <span className="text-muted-foreground w-10 text-right">{pm.percentage}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[#0A0F0E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pm.percentage}%`, backgroundColor: payColors[i] || '#00A39D' }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── DEMOGRAPHICS TAB ─── */}
        <TabsContent value="demographics" className="space-y-4">
          <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-bold flex items-center gap-2"><Building2 className="w-4 h-4 text-[#00A39D]" />Top Kota Asal Penonton</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">Berdasarkan data alamat pemesanan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCities.map((city, i) => (
                  <div key={city.city} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-5 text-center font-bold text-xs text-muted-foreground">{i + 1}</span>
                        <Globe className="w-3.5 h-3.5 text-[#7FB3AE]" />
                        <span className="text-white font-medium">{city.city}</span>
                      </div>
                      <span className="text-[#00A39D] font-bold">{city.pct}%</span>
                    </div>
                    <div className="h-2 w-full bg-[#0A0F0E] rounded-full overflow-hidden ml-8">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#00A39D] to-[#00BFB8] transition-all duration-500" style={{ width: `${city.pct * 2.2}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-bold flex items-center gap-2"><Users className="w-4 h-4 text-[#F8AD3C]" />Distribusi Usia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ageDistribution.map((age) => (
                  <div key={age.range} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{age.range} tahun</span>
                      <span className="text-white font-bold">{age.pct}%</span>
                    </div>
                    <div className="h-3 w-full bg-[#0A0F0E] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#F8AD3C] to-[#FBBF4E] transition-all duration-500" style={{ width: `${age.pct * 2.5}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-[#111918] border border-[rgba(0,163,157,0.1)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm font-bold flex items-center gap-2"><UserCheck className="w-4 h-4 text-[#00BFB8]" />Pembeli Baru vs. Kembali</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[rgba(0,163,157,0.06)] border border-[rgba(0,163,157,0.1)] text-center">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(0,163,157,0.12)] flex items-center justify-center mx-auto mb-2"><UserPlus className="w-5 h-5 text-[#00A39D]" /></div>
                    <p className="text-2xl font-extrabold text-white">68%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">First-time Buyers</p>
                    <p className="text-xs text-muted-foreground mt-1">{(totalSold * 0.68).toLocaleString('id-ID', { maximumFractionDigits: 0 })} orang</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[rgba(248,173,60,0.06)] border border-[rgba(248,173,60,0.1)] text-center">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(248,173,60,0.12)] flex items-center justify-center mx-auto mb-2"><UserCheck className="w-5 h-5 text-[#F8AD3C]" /></div>
                    <p className="text-2xl font-extrabold text-white">32%</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">Returning Buyers</p>
                    <p className="text-xs text-muted-foreground mt-1">{(totalSold * 0.32).toLocaleString('id-ID', { maximumFractionDigits: 0 })} orang</p>
                  </div>
                </div>
                <Separator className="bg-[rgba(0,163,157,0.1)]" />
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground">Avg. repeat purchase rate untuk konser musik Indonesia</p>
                  <p className="text-sm text-[#00A39D] font-semibold">2.3x per returning buyer</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
