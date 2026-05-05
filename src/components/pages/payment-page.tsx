"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  QrCode,
  Building2,
  Copy,
  CreditCard,
  Smartphone,
  Store,
  CalendarClock,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { useCreatePayment, usePaymentStatus, useOrderDetail } from "@/hooks/use-api";
import { usePageStore } from "@/lib/page-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { IOrder, ICreatePaymentResponse, DokuPaymentType } from "@/lib/types";
import {
  DOKU_PM_GROUPS,
  DOKU_PAYMENT_METHODS,
  DOKU_PM_LABELS,
} from "@/lib/doku/client";
import {
  getPaymentMethodInfo,
  PAYMENT_CATEGORY_CONFIG,
  formatVANumber,
  getQRCodeUrl,
  getPaymentInstructions,
  isInlinePaymentMethod,
  redirectToDokuCheckout,
} from "@/lib/doku/client";

// ─── Category icon mapping ──────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  Smartphone,
  QrCode,
  CreditCard,
  Store,
  CalendarClock,
};

export default function PaymentPage() {
  const { currentOrderId, navigateTo } = usePageStore();
  const { toast } = useToast();
  const createPayment = useCreatePayment();

  // ─── Fetch order detail from API ───────────────────────────
  const { data: orderData, isLoading: orderLoading } = useOrderDetail(currentOrderId || "");
  const order = orderData as IOrder | null;

  // ─── State ──────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string>("virtual_account");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [paymentResult, setPaymentResult] = useState<ICreatePaymentResponse | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [timePercentage, setTimePercentage] = useState(100);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // ─── Available payment methods ──────────────────────────────
  const paymentGroups = useMemo(() => {
    return Object.entries(DOKU_PM_GROUPS).map(([key, group]) => ({
      key,
      ...group,
    }));
  }, []);

  const selectedMethodInfo = selectedMethod ? getPaymentMethodInfo(selectedMethod) : null;

  // ─── Timer ──────────────────────────────────────────────────
  useEffect(() => {
    const expiresAt = paymentResult?.expiresAt || order?.expiresAt;
    if (!expiresAt) return;

    const expiry = new Date(expiresAt).getTime();
    const createdAt = order?.createdAt ? new Date(order.createdAt).getTime() : Date.now() - (2 * 60 * 60 * 1000);
    const totalDuration = expiry - createdAt || (2 * 60 * 60 * 1000);

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, expiry - now);

      if (diff <= 0) {
        navigateTo("home");
        toast({ title: "Waktu pembayaran habis", variant: "destructive" });
        return;
      }

      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });

      const elapsed = totalDuration - diff;
      setTimePercentage(Math.max(0, 100 - (elapsed / totalDuration) * 100));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [order, paymentResult, navigateTo, toast]);

  // ─── Copy helper ────────────────────────────────────────────
  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text.replace(/\s/g, ""));
    setCopiedField(field);
    toast({ title: "Disalin!" });
    setTimeout(() => setCopiedField(null), 2000);
  }, [toast]);

  // ─── Submit payment ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!order || !selectedMethod) {
      toast({ title: "Pilih metode pembayaran", variant: "destructive" });
      return;
    }

    try {
      const result = await createPayment.mutateAsync({
        orderId: order.id,
        paymentType: selectedMethod as DokuPaymentType,
      }) as ICreatePaymentResponse;

      setPaymentResult(result);

      // If redirect type (e-wallet, CC, etc.), redirect to DOKU checkout
      if (result.paymentUrl && !result.vaNumber && !result.qrContent) {
        redirectToDokuCheckout({ paymentUrl: result.paymentUrl });
      } else {
        // VA or QRIS — show inline details
        setShowInstructions(true);
        toast({ title: "Silakan selesaikan pembayaran" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal memproses pembayaran";
      toast({ title: message, variant: "destructive" });
    }
  };

  // ─── Loading state ──────────────────────────────────────────
  if (orderLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        <span className="ml-3 text-gray-400">Memuat pesanan...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <p className="text-gray-500">Order tidak ditemukan</p>
      </div>
    );
  }

  const isUrgent = timeLeft.hours < 1 && timeLeft.minutes < 30;
  const eventTitle = order.event?.title || "Event";
  const eventDate = order.event?.date || "";
  const totalTickets = order.items?.reduce((s, i) => s + i.quantity, 0) || 0;

  // Show payment result panel (VA / QRIS)
  const showPaymentPanel = paymentResult && (paymentResult.vaNumber || paymentResult.qrContent);

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-[#2A2A35]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-[#16161D]"
            onClick={() => paymentResult ? navigateTo("home") : navigateTo("home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-semibold text-lg flex-1">
            Pembayaran
          </h1>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              isUrgent
                ? "text-red-400 border-red-500/50 animate-pulse"
                : "text-yellow-400 border-yellow-500/50"
            )}
          >
            <Clock className="w-3 h-3 mr-1" />
            {String(timeLeft.hours).padStart(2, "0")}:
            {String(timeLeft.minutes).padStart(2, "0")}:
            {String(timeLeft.seconds).padStart(2, "0")}
          </Badge>
        </div>
        <Progress
          value={timePercentage}
          className={cn(
            "h-0.5 rounded-none",
            isUrgent ? "[&>div]:bg-red-500" : "[&>div]:bg-green-500"
          )}
        />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-4">
        {/* Order summary */}
        <Card className="bg-[#16161D] border-[#2A2A35]">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Kode Pesanan</span>
              <div className="flex items-center gap-1">
                <span className="text-white font-mono text-sm">
                  {order.orderCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-500 hover:text-white"
                  onClick={() => copyToClipboard(order.orderCode, "code")}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Separator className="bg-[#2A2A35]" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{eventTitle}</p>
                <p className="text-gray-400 text-xs">{eventDate}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold text-xl">
                  {formatRupiah(order.totalAmount)}
                </p>
                <p className="text-gray-500 text-xs">
                  {totalTickets} tiket
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── PAYMENT RESULT PANEL (VA / QRIS) ──────────────── */}
        {showPaymentPanel && paymentResult && (
          <Card className="bg-[#16161D] border-green-500/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  {paymentResult.vaNumber ? (
                    <>
                      <Building2 className="w-4 h-4 text-green-400" />
                      Virtual Account
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 text-green-400" />
                      Pembayaran QRIS
                    </>
                  )}
                </CardTitle>
                <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  DOKU
                </Badge>
              </div>
              <CardDescription className="text-gray-400 text-xs">
                {selectedMethodInfo?.label || paymentResult.paymentMethod}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* VA Number Display */}
              {paymentResult.vaNumber && (
                <div className="space-y-3">
                  <div className="bg-[#0B0B0F] rounded-lg p-4 text-center">
                    <p className="text-gray-500 text-xs mb-2">Nomor Virtual Account</p>
                    <p className="text-white font-mono text-xl font-bold tracking-wider">
                      {formatVANumber(paymentResult.vaNumber)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 border-green-500/50 text-green-400 hover:bg-green-500/10 h-8"
                      onClick={() => copyToClipboard(paymentResult.vaNumber!, "va")}
                    >
                      {copiedField === "va" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Disalin
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Salin Nomor
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Amount */}
                  <div className="bg-[#0B0B0F] rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-sm">Total Bayar</span>
                      <span className="text-green-400 font-bold text-lg">
                        {formatRupiah(order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <Alert className="border-yellow-500/30 bg-yellow-500/5">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-400/80 text-xs">
                      Pastikan nominal transfer <strong>TEPAT</strong> sesuai total di atas.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* QRIS Display */}
              {paymentResult.qrContent && (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="relative bg-white p-3 rounded-xl">
                      <img
                        src={getQRCodeUrl(paymentResult.qrContent, 240)}
                        alt="QRIS Payment"
                        className="w-60 h-60 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="bg-[#0B0B0F] rounded-lg p-3 text-center">
                    <p className="text-gray-500 text-xs mb-1">Total Pembayaran</p>
                    <p className="text-green-400 font-bold text-lg">
                      {formatRupiah(order.totalAmount)}
                    </p>
                  </div>

                  <Alert className="border-yellow-500/30 bg-yellow-500/5">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <AlertDescription className="text-yellow-400/80 text-xs">
                      Scan QR code di atas menggunakan aplikasi e-wallet atau mobile banking Anda.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* How-to-pay instructions */}
              {selectedMethod && (
                <div className="space-y-2">
                  <button
                    className="flex items-center justify-between w-full text-left"
                    onClick={() => setShowInstructions(!showInstructions)}
                  >
                    <span className="text-gray-400 text-sm flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Cara Pembayaran
                    </span>
                    {showInstructions ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                  {showInstructions && (
                    <div className="bg-[#0B0B0F] rounded-lg p-3 space-y-2">
                      {getPaymentInstructions(selectedMethod).map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span className="text-gray-300 text-sm">{step}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── PAYMENT METHOD SELECTION ──────────────────────── */}
        {!showPaymentPanel && (
          <>
            {/* Category tabs */}
            <div className="space-y-3">
              <h2 className="text-white font-semibold text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-400" />
                Pilih Metode Pembayaran
              </h2>

              {/* Category buttons */}
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2 overflow-x-auto">
                  {paymentGroups.map((group) => {
                    const CatIcon = CATEGORY_ICONS[group.icon] || Building2;
                    const isActive = selectedCategory === group.key;
                    return (
                      <button
                        key={group.key}
                        onClick={() => {
                          setSelectedCategory(group.key);
                          setSelectedMethod("");
                          setIsExpanded(true);
                        }}
                        className={cn(
                          "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm",
                          isActive
                            ? "bg-green-500/20 border-green-500/50 text-green-400"
                            : "bg-[#16161D] border-[#2A2A35] text-gray-400 hover:border-gray-500"
                        )}
                      >
                        <CatIcon className="w-4 h-4" />
                        <span className="whitespace-nowrap">{group.label}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Methods in selected category */}
            <Card className="bg-[#16161D] border-[#2A2A35] overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-sm">
                    {paymentGroups.find((g) => g.key === selectedCategory)?.label || ""}
                  </CardTitle>
                  <p className="text-gray-500 text-xs">
                    {paymentGroups.find((g) => g.key === selectedCategory)?.methods.length || 0} metode
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {paymentGroups
                  .find((g) => g.key === selectedCategory)
                  ?.methods.map((method) => {
                    const info = getPaymentMethodInfo(method);
                    const isSelected = selectedMethod === method;
                    return (
                      <button
                        key={method}
                        onClick={() => setSelectedMethod(method)}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                          isSelected
                            ? "bg-green-500/10 border-green-500/50"
                            : "bg-[#0B0B0F] border-[#2A2A35] hover:border-gray-500"
                        )}
                      >
                        {/* Method icon */}
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${info.color}20` }}
                        >
                          {(() => {
                            const IconComponent = CATEGORY_ICONS[info.icon] || Building2;
                            return <IconComponent className="w-5 h-5" style={{ color: info.color }} />;
                          })()}
                        </div>

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isSelected ? "text-green-400" : "text-white"
                          )}>
                            {info.label}
                          </p>
                          <p className="text-gray-500 text-xs truncate">
                            {PAYMENT_CATEGORY_CONFIG[selectedCategory]?.description || ""}
                          </p>
                        </div>

                        {/* Selection indicator */}
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          isSelected ? "border-green-500 bg-green-500" : "border-[#2A2A35]"
                        )}>
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
              </CardContent>
            </Card>

            {/* Amount display */}
            {selectedMethod && (
              <Card className="bg-[#0B0B0F] border-green-500/30">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-gray-400 text-sm">Total Pembayaran</span>
                      <p className="text-gray-500 text-xs mt-0.5">
                        via {selectedMethodInfo?.label || selectedMethod}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 font-bold text-2xl">
                        {formatRupiah(order.totalAmount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0B0B0F]/95 backdrop-blur-md border-t border-[#2A2A35] p-4 z-50">
        <div className="max-w-lg mx-auto">
          {showPaymentPanel ? (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#2A2A35] text-gray-300 hover:bg-[#16161D] hover:text-white h-12"
                onClick={() => {
                  setPaymentResult(null);
                  setShowInstructions(false);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Ganti Metode
              </Button>
              <Button
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold h-12"
                onClick={() => navigateTo("payment-status", order.id)}
              >
                Cek Status
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold h-12"
              onClick={handleSubmit}
              disabled={!selectedMethod || createPayment.isPending}
            >
              {createPayment.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Bayar Sekarang
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
