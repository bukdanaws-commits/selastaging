'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Label } from '@/components/ui/label';
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
  Server,
  Bell,
  Calculator,
  Receipt,
  Tag,
  Clock,
  Ticket,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api';
import type { IFeeConfig, ISystemSetting } from '@/lib/types';

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

// ─── DEFAULT VALUES ────────────────────────────────────────────────

const DEFAULT_FEE_CONFIG: IFeeConfig = {
  ppnPercent: 11,
  defaultAdminFeePercent: 2,
  paymentTimeoutMinutes: 30,
  maxTicketsPerOrder: 5,
};

const DEFAULT_GLOBAL_CONFIG = {
  paymentTimeout: '30',
  maxTicketsPerUser: '5',
  maxTicketsPerTransaction: '5',
  eventStatus: 'Published',
  twoFARequired: true,
  autoCancelExpired: true,
};

// ─── SETTINGS PAGE COMPONENT ──────────────────────────────────────

export default function SettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [activeTab, setActiveTab] = useState('checkout-fee');

  // Loading states
  const [isLoadingFee, setIsLoadingFee] = useState(true);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
  const [isSavingFee, setIsSavingFee] = useState(false);
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  // DOKU Config State (read-only from env)
  const [dokuConfig] = useState({
    clientId: process.env.NEXT_PUBLIC_DOKU_CLIENT_ID || 'MCH-0001-0000000000000',
    environment: process.env.NEXT_PUBLIC_DOKU_ENVIRONMENT || 'sandbox',
    webhookUrl: process.env.NEXT_PUBLIC_DOKU_NOTIFICATION_URL || '',
    finishUrl: process.env.NEXT_PUBLIC_DOKU_FINISH_URL || '',
    errorUrl: process.env.NEXT_PUBLIC_DOKU_ERROR_URL || '',
  });

  // Fee Config State — loaded from API
  const [feeConfig, setFeeConfig] = useState<IFeeConfig>({ ...DEFAULT_FEE_CONFIG });
  // Keep track of original values for reset
  const [feeConfigOriginal, setFeeConfigOriginal] = useState<IFeeConfig>({ ...DEFAULT_FEE_CONFIG });

  // Global Config State — loaded from API
  const [config, setConfig] = useState({ ...DEFAULT_GLOBAL_CONFIG });
  const [configOriginal, setConfigOriginal] = useState({ ...DEFAULT_GLOBAL_CONFIG });

  // ─── FETCH FEE SETTINGS ───────────────────────────────────────────

  const fetchFeeSettings = useCallback(async () => {
    setIsLoadingFee(true);
    try {
      const data = await settingsApi.getFeeConfig();
      setFeeConfig(data);
      setFeeConfigOriginal(data);
    } catch {
      // Use defaults on failure
      setFeeConfig({ ...DEFAULT_FEE_CONFIG });
      setFeeConfigOriginal({ ...DEFAULT_FEE_CONFIG });
    } finally {
      setIsLoadingFee(false);
    }
  }, []);

  // ─── FETCH GLOBAL SETTINGS ────────────────────────────────────────

  const fetchGlobalSettings = useCallback(async () => {
    setIsLoadingGlobal(true);
    try {
      const allSettings = await settingsApi.getAllSettings();
      const s = allSettings as Record<string, ISystemSetting[]>;

      // Extract checkout category settings
      const checkoutSettings = s.checkout || [];
      const globalSettings = s.global || [];

      const newConfig = { ...DEFAULT_GLOBAL_CONFIG };

      // Map checkout settings
      for (const setting of checkoutSettings) {
        if (setting.key === 'payment_timeout_minutes') {
          newConfig.paymentTimeout = setting.value;
        } else if (setting.key === 'max_tickets_per_order') {
          newConfig.maxTicketsPerTransaction = setting.value;
        }
      }

      // Map global settings
      for (const setting of globalSettings) {
        if (setting.key === 'max_tickets_per_event') {
          newConfig.maxTicketsPerUser = String(Math.min(Number(setting.value), 10));
        } else if (setting.key === 'maintenance_mode') {
          // could be used for autoCancelExpired mapping
        }
      }

      setConfig(newConfig);
      setConfigOriginal(newConfig);
    } catch {
      setConfig({ ...DEFAULT_GLOBAL_CONFIG });
      setConfigOriginal({ ...DEFAULT_GLOBAL_CONFIG });
    } finally {
      setIsLoadingGlobal(false);
    }
  }, []);

  // ─── LOAD ON MOUNT ────────────────────────────────────────────────

  useEffect(() => {
    fetchFeeSettings();
    fetchGlobalSettings();
  }, [fetchFeeSettings, fetchGlobalSettings]);

  // ─── VALIDATE FEE INPUTS ──────────────────────────────────────────

  const validateFeeConfig = (): string | null => {
    if (feeConfig.ppnPercent < 0 || feeConfig.ppnPercent > 100) {
      return 'PPN harus antara 0% - 100%';
    }
    if (feeConfig.defaultAdminFeePercent < 0 || feeConfig.defaultAdminFeePercent > 100) {
      return 'Admin Fee harus antara 0% - 100%';
    }
    if (feeConfig.paymentTimeoutMinutes <= 0) {
      return 'Payment Timeout harus lebih dari 0 menit';
    }
    if (feeConfig.maxTicketsPerOrder <= 0) {
      return 'Max Tickets per Order harus lebih dari 0';
    }
    return null;
  };

  // ─── VALIDATE GLOBAL CONFIG INPUTS ────────────────────────────────

  const validateGlobalConfig = (): string | null => {
    const timeout = Number(config.paymentTimeout);
    const maxTickets = Number(config.maxTicketsPerUser);
    const maxTrans = Number(config.maxTicketsPerTransaction);

    if (isNaN(timeout) || timeout <= 0) {
      return 'Payment Timeout harus lebih dari 0 menit';
    }
    if (isNaN(maxTickets) || maxTickets <= 0) {
      return 'Max Tickets per User harus lebih dari 0';
    }
    if (isNaN(maxTrans) || maxTrans <= 0) {
      return 'Max Tickets per Transaction harus lebih dari 0';
    }
    return null;
  };

  // ─── SAVE FEE CONFIG ──────────────────────────────────────────────

  const handleSaveFee = async () => {
    const validationError = validateFeeConfig();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSavingFee(true);
    try {
      await settingsApi.bulkUpdateSettings([
        { key: 'ppn_percent', value: String(feeConfig.ppnPercent) },
        { key: 'default_admin_fee_percent', value: String(feeConfig.defaultAdminFeePercent) },
        { key: 'payment_timeout_minutes', value: String(feeConfig.paymentTimeoutMinutes) },
        { key: 'max_tickets_per_order', value: String(feeConfig.maxTicketsPerOrder) },
      ]);
      setFeeConfigOriginal({ ...feeConfig });
      setIsEditingFee(false);
      toast.success('Pengaturan fee & checkout berhasil disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan pengaturan fee. Silakan coba lagi.');
      console.error('[SettingsPage] Save fee error:', err);
    } finally {
      setIsSavingFee(false);
    }
  };

  // ─── SAVE GLOBAL CONFIG ───────────────────────────────────────────

  const handleSaveConfig = async () => {
    const validationError = validateGlobalConfig();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSavingGlobal(true);
    try {
      await settingsApi.bulkUpdateSettings([
        { key: 'payment_timeout_minutes', value: config.paymentTimeout },
        { key: 'max_tickets_per_order', value: config.maxTicketsPerTransaction },
        { key: 'max_tickets_per_event', value: String(Number(config.maxTicketsPerUser) * 10000) },
      ]);
      setConfigOriginal({ ...config });
      setIsEditing(false);
      toast.success('Konfigurasi global berhasil disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan konfigurasi. Silakan coba lagi.');
      console.error('[SettingsPage] Save config error:', err);
    } finally {
      setIsSavingGlobal(false);
    }
  };

  // ─── COMPUTED PREVIEW VALUES ──────────────────────────────────────

  const feePercent = feeConfig.defaultAdminFeePercent || 2;
  const ppnPercent = feeConfig.ppnPercent || 11;
  const ticketPrice = 1_000_000;
  const adminFee = Math.round(ticketPrice * feePercent / 100);
  const ppn = Math.round(ticketPrice * ppnPercent / 100);
  const totalBayar = ticketPrice + adminFee + ppn;
  const couponDiscount = 50_000;
  const finalTotal = totalBayar - couponDiscount;
  const organizerGets = ticketPrice - adminFee;
  const platformGets = adminFee;

  // ─── LOADING SKELETON ─────────────────────────────────────────────

  const FeeLoadingSkeleton = () => (
    <Card className="bg-card border border-primary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-5 w-40" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

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
            value="checkout-fee"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Receipt className="w-3 h-3 mr-1" />
            Checkout & Fee
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Sliders className="w-3 h-3 mr-1" />
            Global Config
          </TabsTrigger>
        </TabsList>

        {/* ═══ CHECKOUT & FEE TAB ═══ */}
        <TabsContent value="checkout-fee" className="space-y-6">

          {/* ─── Section 1: DOKU Payment Gateway ─── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">DOKU Payment Gateway</h3>
            </div>

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
            <Card className="bg-card border border-primary/10 mt-4">
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
            <Card className="bg-card border border-primary/10 mt-4">
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
          </div>

          {/* ─── Separator ─── */}
          <Separator className="bg-primary/10" />

          {/* ─── Section 2: Platform Fee & Checkout Settings ─── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Platform Fee & Checkout</h3>
            </div>

            {isLoadingFee ? (
              <FeeLoadingSkeleton />
            ) : (
              <Card className="bg-card border border-primary/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-gold" />
                      <CardTitle className="text-foreground text-sm font-bold">
                        Platform Fee & PPN
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
                    Atur biaya platform, PPN, dan batas checkout. Perubahan akan mempengaruhi semua order baru.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Fee Display Banner */}
                  <div className="bg-background rounded-xl p-6 text-center border border-primary/10">
                    <p className="text-xs text-muted-foreground mb-2">Current Configuration</p>
                    <div className="flex items-center justify-center gap-8">
                      <div>
                        <span className="text-4xl font-black text-gold">{feeConfig.defaultAdminFeePercent}</span>
                        <span className="text-lg font-bold text-muted-foreground">%</span>
                        <p className="text-xs text-muted-foreground mt-1">Admin Fee</p>
                      </div>
                      <Separator orientation="vertical" className="h-12 bg-primary/10" />
                      <div>
                        <span className="text-4xl font-black text-foreground">{feeConfig.ppnPercent}</span>
                        <span className="text-lg font-bold text-muted-foreground">%</span>
                        <p className="text-xs text-muted-foreground mt-1">PPN</p>
                      </div>
                    </div>
                  </div>

                  {/* Editable Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* PPN Percent */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        PPN Percent (%)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={feeConfig.ppnPercent}
                          onChange={(e) => setFeeConfig({ ...feeConfig, ppnPercent: Number(e.target.value) || 0 })}
                          disabled={!isEditingFee}
                          className={cn(
                            'bg-background border-primary/15 text-foreground text-sm h-10',
                            !isEditingFee && 'opacity-60'
                          )}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">% pajak</span>
                      </div>
                      {isEditingFee && (feeConfig.ppnPercent < 0 || feeConfig.ppnPercent > 100) && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Harus antara 0-100%
                        </p>
                      )}
                    </div>

                    {/* Default Admin Fee Percent */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Receipt className="w-3 h-3" />
                        Default Admin Fee (%)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={feeConfig.defaultAdminFeePercent}
                          onChange={(e) => setFeeConfig({ ...feeConfig, defaultAdminFeePercent: Number(e.target.value) || 0 })}
                          disabled={!isEditingFee}
                          className={cn(
                            'bg-background border-primary/15 text-foreground text-sm h-10',
                            !isEditingFee && 'opacity-60'
                          )}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">% dari subtotal</span>
                      </div>
                      {isEditingFee && (feeConfig.defaultAdminFeePercent < 0 || feeConfig.defaultAdminFeePercent > 100) && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Harus antara 0-100%
                        </p>
                      )}
                    </div>

                    {/* Payment Timeout Minutes */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Payment Timeout (menit)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={feeConfig.paymentTimeoutMinutes}
                          onChange={(e) => setFeeConfig({ ...feeConfig, paymentTimeoutMinutes: Number(e.target.value) || 1 })}
                          disabled={!isEditingFee}
                          className={cn(
                            'bg-background border-primary/15 text-foreground text-sm h-10',
                            !isEditingFee && 'opacity-60'
                          )}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">menit</span>
                      </div>
                      {isEditingFee && feeConfig.paymentTimeoutMinutes <= 0 && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Harus lebih dari 0
                        </p>
                      )}
                    </div>

                    {/* Max Tickets Per Order */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                        <Ticket className="w-3 h-3" />
                        Max Tiket per Order
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={feeConfig.maxTicketsPerOrder}
                          onChange={(e) => setFeeConfig({ ...feeConfig, maxTicketsPerOrder: Number(e.target.value) || 1 })}
                          disabled={!isEditingFee}
                          className={cn(
                            'bg-background border-primary/15 text-foreground text-sm h-10',
                            !isEditingFee && 'opacity-60'
                          )}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">tiket</span>
                      </div>
                      {isEditingFee && feeConfig.maxTicketsPerOrder <= 0 && (
                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Harus lebih dari 0
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick select for admin fee */}
                  {isEditingFee && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground font-medium">Quick Select Admin Fee</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 5, 7, 10].map((val) => (
                          <Button
                            key={val}
                            size="sm"
                            variant="outline"
                            className={cn(
                              'text-xs h-7',
                              feeConfig.defaultAdminFeePercent === val
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-primary/20 text-muted-foreground'
                            )}
                            onClick={() => setFeeConfig({ ...feeConfig, defaultAdminFeePercent: val })}
                          >
                            {val}%
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Example Calculation */}
                  <div className="bg-background rounded-lg p-4 border border-primary/5">
                    <p className="text-xs text-muted-foreground font-medium mb-3">Contoh Perhitungan</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Harga Tiket</span>
                        <span className="text-foreground font-medium">Rp {ticketPrice.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fee Platform ({feePercent}%)</span>
                        <span className="text-gold font-medium">+ Rp {adminFee.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">PPN ({ppnPercent}%)</span>
                        <span className="text-foreground font-medium">+ Rp {ppn.toLocaleString('id-ID')}</span>
                      </div>
                      <Separator className="bg-primary/10" />
                      <div className="flex justify-between font-bold">
                        <span className="text-foreground">Total Bayar</span>
                        <span className="text-foreground">Rp {totalBayar.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Coupon (SAHABATDUTA)
                        </span>
                        <span className="text-emerald-400 font-medium">-Rp {couponDiscount.toLocaleString('id-ID')}</span>
                      </div>
                      <Separator className="bg-primary/10" />
                      <div className="flex justify-between font-bold text-sm">
                        <span className="text-foreground">Final Total</span>
                        <span className="text-primary">Rp {finalTotal.toLocaleString('id-ID')}</span>
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
                          setFeeConfig({ ...feeConfigOriginal });
                          setIsEditingFee(false);
                          toast.info('Perubahan fee dibatalkan');
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                        onClick={handleSaveFee}
                        disabled={isSavingFee}
                      >
                        {isSavingFee ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3 mr-1" />
                        )}
                        {isSavingFee ? 'Menyimpan...' : 'Simpan Fee'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ─── Separator ─── */}
          <Separator className="bg-primary/10" />

          {/* ─── Section 3: Checkout Pricing Preview ─── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Checkout Pricing Preview</h3>
            </div>

            <Card className="bg-card border border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <CardTitle className="text-foreground text-sm font-bold">
                    Simulasi Perhitungan Checkout
                  </CardTitle>
                </div>
                <CardDescription className="text-muted-foreground text-xs">
                  Contoh perhitungan lengkap dari harga tiket hingga distribusi pendapatan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-background rounded-xl p-5 border border-primary/10 space-y-3">
                  {/* Buyer Perspective */}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Perspektif Pembeli</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Harga Tiket</span>
                      <span className="text-foreground font-medium">Rp {ticketPrice.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Admin Fee ({feePercent}%)</span>
                      <span className="text-foreground font-medium">Rp {adminFee.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PPN ({ppnPercent}%)</span>
                      <span className="text-foreground font-medium">Rp {ppn.toLocaleString('id-ID')}</span>
                    </div>
                    <Separator className="bg-primary/10" />
                    <div className="flex justify-between font-bold">
                      <span className="text-foreground">Total Bayar</span>
                      <span className="text-foreground">Rp {totalBayar.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        Coupon (SAHABATDUTA)
                      </span>
                      <span className="text-emerald-400 font-medium">-Rp {couponDiscount.toLocaleString('id-ID')}</span>
                    </div>
                    <Separator className="bg-primary/10" />
                    <div className="flex justify-between font-bold text-base">
                      <span className="text-foreground">Final Total</span>
                      <span className="text-primary">Rp {finalTotal.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Separator between perspectives */}
                  <div className="relative my-4">
                    <Separator className="bg-primary/10" />
                  </div>

                  {/* Revenue Distribution */}
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Distribusi Pendapatan</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Organizer Gets</span>
                      <span className="text-emerald-400 font-bold">Rp {organizerGets.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Gets</span>
                      <span className="text-gold font-bold">Rp {platformGets.toLocaleString('id-ID')} ({feePercent}%)</span>
                    </div>
                  </div>

                  {/* Visual bar */}
                  <div className="mt-4 pt-3 border-t border-primary/10">
                    <p className="text-[10px] text-muted-foreground mb-2">Revenue Split</p>
                    <div className="flex rounded-lg overflow-hidden h-6">
                      <div
                        className="bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400 font-bold"
                        style={{ width: `${100 - feePercent}%` }}
                      >
                        Organizer {100 - feePercent}%
                      </div>
                      <div
                        className="bg-gold/20 flex items-center justify-center text-[10px] text-gold font-bold"
                        style={{ width: `${feePercent}%` }}
                      >
                        Platform {feePercent}%
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ═══ GLOBAL CONFIG TAB ═══ */}
        <TabsContent value="config" className="space-y-4">
          {isLoadingGlobal ? (
            <Card className="bg-card border border-primary/10">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-4 h-4 rounded" />
                  <Skeleton className="h-5 w-44" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
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
                    <Label className="text-xs text-muted-foreground font-medium">Payment Timeout (menit)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={config.paymentTimeout}
                        onChange={(e) => setConfig({ ...config, paymentTimeout: e.target.value })}
                        disabled={!isEditing}
                        className={cn(
                          'bg-background border-primary/15 text-foreground text-sm h-10',
                          !isEditing && 'opacity-60'
                        )}
                      />
                      <span className="text-sm text-muted-foreground shrink-0">menit</span>
                    </div>
                    {isEditing && Number(config.paymentTimeout) <= 0 && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Harus lebih dari 0
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">Max Tickets per User</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.maxTicketsPerUser}
                      onChange={(e) => setConfig({ ...config, maxTicketsPerUser: e.target.value })}
                      disabled={!isEditing}
                      className={cn(
                        'bg-background border-primary/15 text-foreground text-sm h-10',
                        !isEditing && 'opacity-60'
                      )}
                    />
                    {isEditing && Number(config.maxTicketsPerUser) <= 0 && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Harus lebih dari 0
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">Max Tickets per Transaction</Label>
                    <Input
                      type="number"
                      min="1"
                      value={config.maxTicketsPerTransaction}
                      onChange={(e) => setConfig({ ...config, maxTicketsPerTransaction: e.target.value })}
                      disabled={!isEditing}
                      className={cn(
                        'bg-background border-primary/15 text-foreground text-sm h-10',
                        !isEditing && 'opacity-60'
                      )}
                    />
                    {isEditing && Number(config.maxTicketsPerTransaction) <= 0 && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Harus lebih dari 0
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground font-medium">Settlement (H+)</Label>
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
                      setConfig({ ...configOriginal });
                      setIsEditing(false);
                      toast.info('Perubahan dibatalkan');
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold disabled:opacity-40"
                    disabled={!isEditing || isSavingGlobal}
                    onClick={handleSaveConfig}
                  >
                    {isSavingGlobal ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Save className="w-3 h-3 mr-1" />
                    )}
                    {isSavingGlobal ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
