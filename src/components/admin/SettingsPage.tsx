'use client';

import React, { useState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CreditCard,
  Shield,
  Sliders,
  CheckCircle2,
  XCircle,
  Save,
  Eye,
  Pencil,
  Percent,
  Settings2,
  Globe,
  Server,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── DOKU CONFIG DATA ──────────────────────────────────────────────

const dokuPaymentMethods = [
  { name: 'Virtual Account - BCA', active: true, channel: 'VIRTUAL_ACCOUNT_BCA' },
  { name: 'Virtual Account - BSI', active: true, channel: 'VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI' },
  { name: 'Virtual Account - Mandiri', active: true, channel: 'VIRTUAL_ACCOUNT_BANK_MANDIRI' },
  { name: 'Virtual Account - BNI', active: true, channel: 'VIRTUAL_ACCOUNT_BNI' },
  { name: 'Virtual Account - BRI', active: true, channel: 'VIRTUAL_ACCOUNT_BRI' },
  { name: 'QRIS', active: true, channel: 'QRIS' },
  { name: 'OVO', active: true, channel: 'EMONEY_OVO' },
  { name: 'DANA', active: true, channel: 'EMONEY_DANA' },
  { name: 'ShopeePay', active: true, channel: 'EMONEY_SHOPEE_PAY' },
  { name: 'LinkAja', active: true, channel: 'EMONEY_LINKAJA' },
  { name: 'Credit Card', active: false, channel: 'CREDIT_CARD' },
  { name: 'Alfamart', active: true, channel: 'ONLINE_TO_OFFLINE_ALFA' },
  { name: 'Indomaret', active: true, channel: 'ONLINE_TO_OFFLINE_INDOMARET' },
  { name: 'Akulaku (PayLater)', active: false, channel: 'PEER_TO_PEER_AKULAKU' },
  { name: 'Kredivo (PayLater)', active: false, channel: 'PEER_TO_PEER_KREDIVO' },
] as const;

// ─── SETTINGS PAGE COMPONENT ──────────────────────────────────────

export default function SettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [activeTab, setActiveTab] = useState('doku');

  // DOKU Config State
  const [dokuConfig, setDokuConfig] = useState({
    clientId: process.env.NEXT_PUBLIC_DOKU_CLIENT_ID || 'MCH-0001-0000000000000',
    environment: process.env.NEXT_PUBLIC_DOKU_ENVIRONMENT || 'sandbox',
    webhookUrl: process.env.NEXT_PUBLIC_DOKU_NOTIFICATION_URL || '',
    finishUrl: process.env.NEXT_PUBLIC_DOKU_FINISH_URL || '',
    errorUrl: process.env.NEXT_PUBLIC_DOKU_ERROR_URL || '',
  });

  // Fee Config State
  const [feeConfig, setFeeConfig] = useState({
    platformDefaultFee: '5',
  });

  // Global Config State
  const [config, setConfig] = useState({
    paymentTimeout: '2',
    maxTicketsPerUser: '5',
    maxTicketsPerTransaction: '5',
    eventStatus: 'Published',
    twoFARequired: true,
    autoCancelExpired: true,
  });

  const handleSaveConfig = () => {
    setIsEditing(false);
    toast.success('Konfigurasi berhasil disimpan');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary" />
          Pengaturan Sistem
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Konfigurasi platform SeleEvent — hanya SUPER_ADMIN yang dapat mengubah
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-card border border-primary/15 p-1">
          <TabsTrigger
            value="doku"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <CreditCard className="w-3 h-3 mr-1" />
            DOKU Payment
          </TabsTrigger>
          <TabsTrigger
            value="fee"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Percent className="w-3 h-3 mr-1" />
            Platform Fee
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Sliders className="w-3 h-3 mr-1" />
            Global Config
          </TabsTrigger>
        </TabsList>

        {/* ═══ DOKU PAYMENT TAB ═══ */}
        <TabsContent value="doku" className="space-y-4">
          {/* Environment Status */}
          <Card className="bg-card border border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  <CardTitle className="text-foreground text-sm font-bold">
                    DOKU Environment
                  </CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] font-bold uppercase px-2 py-0.5',
                    dokuConfig.environment === 'sandbox'
                      ? 'border-amber-500/30 text-amber-400 bg-amber-500/5'
                      : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                  )}
                >
                  {dokuConfig.environment === 'sandbox' ? '🔌 Sandbox' : '🚀 Production'}
                </Badge>
              </div>
              <CardDescription className="text-muted-foreground text-xs">
                Konfigurasi koneksi ke DOKU Payment Gateway
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Client ID (Merchant ID)</label>
                <div className="flex items-center gap-2">
                  <Input
                    value={dokuConfig.clientId}
                    disabled
                    className="bg-background border-primary/15 text-foreground text-sm h-10 font-mono"
                  />
                  <Badge variant="outline" className="text-[10px] text-muted-foreground border-border shrink-0">
                    READ ONLY
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium">Secret Key</label>
                <Input
                  value="••••••••••••••••••••••••••••"
                  disabled
                  className="bg-background border-primary/15 text-muted-foreground text-sm h-10 font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* Webhook URLs */}
          <Card className="bg-card border border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <CardTitle className="text-foreground text-sm font-bold">Webhook & Redirect URLs</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground text-xs">
                URL yang digunakan DOKU untuk notifikasi pembayaran dan redirect setelah bayar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Notification URL (Webhook)', key: 'webhookUrl', desc: 'DOKU POST payment status ke URL ini' },
                { label: 'Finish URL (Success Redirect)', key: 'finishUrl', desc: 'Redirect setelah pembayaran berhasil' },
                { label: 'Error URL (Failed Redirect)', key: 'errorUrl', desc: 'Redirect jika pembayaran gagal' },
              ].map((url) => (
                <div key={url.key} className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">{url.label}</label>
                  <Input
                    value={(dokuConfig as Record<string, string>)[url.key] || '-'}
                    disabled
                    className="bg-background border-primary/15 text-muted-foreground text-sm h-9 font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground/60">{url.desc}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Active Payment Methods */}
          <Card className="bg-card border border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <CardTitle className="text-foreground text-sm font-bold">Active Payment Methods</CardTitle>
              </div>
              <CardDescription className="text-muted-foreground text-xs">
                Metode pembayaran yang aktif di platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dokuPaymentMethods.map((pm) => (
                  <div
                    key={pm.channel}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg border text-xs font-medium',
                      pm.active
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                        : 'bg-background border-border text-muted-foreground/50'
                    )}
                  >
                    <span>{pm.name}</span>
                    {pm.active ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 opacity-40" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ PLATFORM FEE TAB ═══ */}
        <TabsContent value="fee" className="space-y-4">
          <Card className="bg-card border border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-gold" />
                  <CardTitle className="text-foreground text-sm font-bold">
                    Platform Default Fee
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  variant={isEditingFee ? 'default' : 'outline'}
                  className={cn(
                    'text-xs',
                    isEditingFee
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold'
                      : 'border-primary/30 text-primary hover:bg-primary/10'
                  )}
                  onClick={() => setIsEditingFee(!isEditingFee)}
                >
                  {isEditingFee ? 'Preview' : 'Edit'}
                </Button>
              </div>
              <CardDescription className="text-muted-foreground text-xs">
                Default platform fee untuk semua organizer baru. Bisa di-override per organizer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fee Display */}
              <div className="bg-background rounded-xl p-6 text-center border border-primary/10">
                <p className="text-xs text-muted-foreground mb-2">Current Default Fee</p>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-5xl font-black text-gold">{feeConfig.platformDefaultFee}</span>
                  <span className="text-2xl font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">dari total penjualan tiket</p>
              </div>

              {/* Fee Slider */}
              <div className="space-y-3">
                <label className="text-xs text-muted-foreground font-medium">
                  Atur Fee (1% - 10%)
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    step="0.5"
                    value={feeConfig.platformDefaultFee}
                    onChange={(e) => setFeeConfig({ ...feeConfig, platformDefaultFee: e.target.value })}
                    disabled={!isEditingFee}
                    className="bg-background border-primary/15 text-foreground text-sm h-10 w-24"
                  />
                  <span className="text-sm text-muted-foreground">% dari total penjualan</span>
                </div>
                {/* Quick select */}
                <div className="flex items-center gap-2">
                  {[1, 3, 5, 7, 10].map((val) => (
                    <Button
                      key={val}
                      size="sm"
                      variant="outline"
                      disabled={!isEditingFee}
                      className={cn(
                        'text-xs h-7',
                        feeConfig.platformDefaultFee === String(val)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-primary/20 text-muted-foreground'
                      )}
                      onClick={() => setFeeConfig({ ...feeConfig, platformDefaultFee: String(val) })}
                    >
                      {val}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Example Calculation */}
              <div className="bg-background rounded-lg p-4 border border-primary/5">
                <p className="text-xs text-muted-foreground font-medium mb-3">Contoh Perhitungan</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga Tiket</span>
                    <span className="text-foreground font-medium">Rp 1.000.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee Platform ({feeConfig.platformDefaultFee}%)</span>
                    <span className="text-gold font-medium">- Rp {(1000000 * Number(feeConfig.platformDefaultFee) / 100).toLocaleString('id-ID')}</span>
                  </div>
                  <Separator className="bg-primary/10" />
                  <div className="flex justify-between font-bold">
                    <span className="text-foreground">Diterima Organizer</span>
                    <span className="text-emerald-400">Rp {(1000000 * (100 - Number(feeConfig.platformDefaultFee)) / 100).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              {isEditingFee && (
                <div className="flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/20 text-muted-foreground text-xs"
                    onClick={() => {
                      setFeeConfig({ platformDefaultFee: '5' });
                      setIsEditingFee(false);
                      toast.info('Perubahan fee dibatalkan');
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                    onClick={() => {
                      setIsEditingFee(false);
                      toast.success(`Default fee disimpan: ${feeConfig.platformDefaultFee}%`);
                    }}
                  >
                    <Save className="w-3 h-3 mr-1" />
                    Simpan Fee
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ GLOBAL CONFIG TAB ═══ */}
        <TabsContent value="config" className="space-y-4">
          <Card className="bg-card border border-primary/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-primary" />
                  <CardTitle className="text-foreground text-sm font-bold">
                    Global Configuration
                  </CardTitle>
                </div>
                <Button
                  size="sm"
                  variant={isEditing ? 'default' : 'outline'}
                  className={cn(
                    'text-xs',
                    isEditing
                      ? 'bg-primary hover:bg-primary/90 text-primary-foreground font-semibold'
                      : 'border-primary/30 text-primary hover:bg-primary/10'
                  )}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <Eye className="w-3 h-3 mr-1" /> : <Pencil className="w-3 h-3 mr-1" />}
                  {isEditing ? 'Preview' : 'Edit'}
                </Button>
              </div>
              <CardDescription className="text-muted-foreground text-xs">
                Konfigurasi global sistem ticketing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Payment Timeout (jam)</label>
                  <Input
                    type="number"
                    value={config.paymentTimeout}
                    onChange={(e) => setConfig({ ...config, paymentTimeout: e.target.value })}
                    disabled={!isEditing}
                    className="bg-background border-primary/15 text-foreground text-sm h-10 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Max Tickets per User</label>
                  <Input
                    type="number"
                    value={config.maxTicketsPerUser}
                    onChange={(e) => setConfig({ ...config, maxTicketsPerUser: e.target.value })}
                    disabled={!isEditing}
                    className="bg-background border-primary/15 text-foreground text-sm h-10 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Max Tickets per Transaction</label>
                  <Input
                    type="number"
                    value={config.maxTicketsPerTransaction}
                    onChange={(e) => setConfig({ ...config, maxTicketsPerTransaction: e.target.value })}
                    disabled={!isEditing}
                    className="bg-background border-primary/15 text-foreground text-sm h-10 disabled:opacity-60"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Settlement (H+)</label>
                  <Input
                    type="number"
                    value="7"
                    disabled
                    className="bg-background border-primary/15 text-foreground text-sm h-10 disabled:opacity-60"
                  />
                  <p className="text-[10px] text-muted-foreground/60">Hari setelah event selesai sebelum WD tersedia</p>
                </div>
              </div>

              <Separator className="bg-primary/10" />

              {/* Toggle switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm text-foreground font-medium">2FA Required for SUPER_ADMIN</label>
                    <p className="text-[10px] text-muted-foreground">Wajibkan autentikasi dua faktor untuk akses admin panel</p>
                  </div>
                  <Switch
                    checked={config.twoFARequired}
                    onCheckedChange={(checked) => setConfig({ ...config, twoFARequired: checked })}
                    disabled={!isEditing}
                  />
                </div>
                <Separator className="bg-primary/10" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm text-foreground font-medium">Auto-cancel Expired Orders</label>
                    <p className="text-[10px] text-muted-foreground">Batalkan pesanan otomatis jika melewati batas waktu pembayaran</p>
                  </div>
                  <Switch
                    checked={config.autoCancelExpired}
                    onCheckedChange={(checked) => setConfig({ ...config, autoCancelExpired: checked })}
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <Separator className="bg-primary/10" />

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/20 text-muted-foreground text-xs"
                  onClick={() => {
                    setConfig({
                      paymentTimeout: '2',
                      maxTicketsPerUser: '5',
                      maxTicketsPerTransaction: '5',
                      eventStatus: 'Published',
                      twoFARequired: true,
                      autoCancelExpired: true,
                    });
                    setIsEditing(false);
                    toast.info('Perubahan dibatalkan');
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-40"
                  disabled={!isEditing}
                  onClick={handleSaveConfig}
                >
                  <Save className="w-3 h-3 mr-1" />
                  Simpan Konfigurasi
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
