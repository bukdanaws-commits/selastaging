"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Ticket,
  FileCheck,
  ShieldCheck,
  Loader2,
  PartyPopper,
  Home,
} from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";
import type { IOrder, IPaymentStatus } from "@/lib/types";
import { usePageStore } from "@/lib/page-store";
import { useOrderDetail, usePaymentStatus } from "@/hooks/use-api";
import { useQueryClient } from "@tanstack/react-query";

const TIMELINE_STEPS = [
  { label: "Pesanan Dibuat", icon: Ticket },
  { label: "Memilih Pembayaran", icon: FileCheck },
  { label: "Menunggu Pembayaran", icon: Clock },
  { label: "Pembayaran Dikonfirmasi", icon: ShieldCheck },
  { label: "Tiket Aktif", icon: CheckCircle2 },
];

export default function PaymentStatusPage() {
  const { currentOrderId, navigateTo } = usePageStore();
  const queryClient = useQueryClient();

  // ─── Fetch order detail and payment status from API ────────────
  const { data: order, isLoading: orderLoading } = useOrderDetail(currentOrderId || "");
  const { data: paymentStatusData } = usePaymentStatus(currentOrderId || "");

  const typedOrder = order as IOrder | null;
  const typedPaymentStatus = paymentStatusData as IPaymentStatus | null;

  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

  // ─── Auto-refresh order detail while pending ──────────────────
  useEffect(() => {
    if (!typedOrder || typedOrder.status === 'paid' || typedOrder.status === 'cancelled' || typedOrder.status === 'expired') {
      return;
    }
    // Poll every 3 seconds while order is still pending
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'detail', currentOrderId] });
      queryClient.invalidateQueries({ queryKey: ['payment', 'status', currentOrderId] });
    }, 3000);
    return () => clearInterval(interval);
  }, [typedOrder?.status, currentOrderId, queryClient]);

  // ─── Auto-navigate to e-ticket when paid ──────────────────────
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (typedOrder?.status === 'paid' && currentOrderId && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      // Auto-navigate after a short delay to let user see the success state
      const timer = setTimeout(() => {
        navigateTo('eticket', currentOrderId);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [typedOrder?.status, currentOrderId, navigateTo]);

  // ─── Determine current step from order/payment status ──────────
  const currentStep = (() => {
    if (!typedOrder) return 0;
    switch (typedOrder.status) {
      case "pending":
        if (typedPaymentStatus?.paymentType || typedOrder.paymentType) return 2; // Awaiting payment
        return 1; // Order created, selecting payment
      case "paid":
        return 4; // All done — Tiket Aktif
      case "refunded":
      case "cancelled":
        return 2; // Stopped at processing
      case "expired":
        return 1; // Expired before payment
      default:
        return 0;
    }
  })();

  // ─── Confetti effect when paid ─────────────────────────────────
  useEffect(() => {
    if (typedOrder?.status === "paid") {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [typedOrder?.status]);

  // ─── Loading state ─────────────────────────────────────────────
  if (orderLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        <span className="ml-3 text-muted-foreground">Memuat status pesanan...</span>
      </div>
    );
  }

  // ─── Not found state ───────────────────────────────────────────
  if (!typedOrder) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Order tidak ditemukan</p>
      </div>
    );
  }

  const isPaid = typedOrder.status === "paid";
  const isRefunded = typedOrder.status === "refunded";
  const isCancelled = typedOrder.status === "cancelled";
  const isExpired = typedOrder.status === "expired";
  const isNegative = isRefunded || isCancelled || isExpired;

  const eventTitle = typedOrder.event?.title || "Event";
  const eventCity = typedOrder.event?.city || "";
  const paymentMethod = typedOrder.paymentMethod || typedOrder.paymentType || typedOrder.paymentChannel || "DOKU";

  // ─── Fee breakdown helpers ─────────────────────────────────────
  const subTotal = typedOrder.subTotal ?? (typedOrder.totalAmount - Math.round(typedOrder.totalAmount * 13 / 113));
  const adminFee = typedOrder.adminFee ?? Math.round(subTotal * 2 / 100);
  const taxAmount = typedOrder.taxAmount ?? Math.round(subTotal * 11 / 100);
  const discountAmount = typedOrder.discountAmount ?? 0;

  // Calculate actual percentages from stored order data (more accurate than hardcoded)
  const adminFeePercent = subTotal > 0 ? Math.round((adminFee / subTotal) * 100) : 2;
  const ppnPercent = subTotal > 0 ? Math.round((taxAmount / subTotal) * 100) : 11;

  return (
    <div className="min-h-screen bg-background">
      {/* Confetti overlay */}
      {showConfetti && (
        <div
          ref={confettiRef}
          className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
        >
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDuration: `${1.5 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 1}s`,
                animationIterationCount: "infinite",
              }}
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: [
                    "#22c55e",
                    "#4ade80",
                    "#86efac",
                    "#fbbf24",
                    "#f97316",
                  ][Math.floor(Math.random() * 5)],
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-card"
            onClick={() => navigateTo("home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-foreground font-semibold text-lg flex-1">
            Status Pembayaran
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Status hero */}
        <div className="text-center py-8">
          {isPaid ? (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Pembayaran Berhasil! 🎉
              </h2>
              <p className="text-muted-foreground">
                E-tiket Anda sudah siap. Silakan cek tiket Anda.
              </p>
            </>
          ) : isRefunded || isCancelled ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Pembayaran Ditolak
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Pembayaran tidak dapat diverifikasi. Silakan coba lagi.
              </p>
            </>
          ) : isExpired ? (
            <>
              <div className="w-20 h-20 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Pesanan Expired
              </h2>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Batas waktu pembayaran telah habis. Silakan buat pesanan baru.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Menunggu Pembayaran
              </h2>
              <p className="text-muted-foreground text-sm">
                Silakan selesaikan pembayaran Anda
              </p>
              <Badge
                variant="outline"
                className="mt-3 text-yellow-400 border-yellow-500/50 animate-pulse"
              >
                <Clock className="w-3 h-3 mr-1" />
                Menunggu
              </Badge>
            </>
          )}
        </div>

        {/* Timeline */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">
              Proses Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="py-4">
            <div className="space-y-0">
              {TIMELINE_STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep;
                const isCompleted = i < currentStep;
                const isPending = i > currentStep;

                return (
                  <div key={step.label} className="flex gap-3">
                    {/* Icon column */}
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                          isCompleted &&
                            "bg-green-500",
                          isActive &&
                            "bg-yellow-500 ring-4 ring-yellow-500/20",
                          isPending && "bg-border"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-foreground" />
                        ) : (
                          <Icon
                            className={cn(
                              "w-4 h-4",
                              isActive
                                ? "text-foreground"
                                : "text-muted-foreground/70"
                            )}
                          />
                        )}
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 h-10",
                            isCompleted ? "bg-green-500" : "bg-border"
                          )}
                        />
                      )}
                    </div>

                    {/* Label column */}
                    <div className="pb-10">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          isCompleted && "text-green-400",
                          isActive && "text-foreground",
                          isPending && "text-muted-foreground/70"
                        )}
                      >
                        {step.label}
                      </p>
                      {isActive && !isPaid && !isNegative && (
                        <p className="text-xs text-yellow-400/70 mt-0.5">
                          Sedang diproses...
                        </p>
                      )}
                      {isCompleted && (
                        <p className="text-xs text-muted-foreground mt-0.5">Selesai</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order details with fee breakdown */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Kode Pesanan</span>
              <span className="text-foreground font-mono text-sm">
                {typedOrder.orderCode}
              </span>
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Event</span>
              <span className="text-foreground text-sm">{eventTitle}{eventCity ? ` • ${eventCity}` : ''}</span>
            </div>
            <Separator className="bg-border" />
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">{formatRupiah(subTotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Biaya Admin ({adminFeePercent}%)</span>
                <span className="text-foreground">{formatRupiah(adminFee)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">PPN ({ppnPercent}%)</span>
                <span className="text-foreground">{formatRupiah(taxAmount)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-400">Diskon</span>
                  <span className="text-green-400">-{formatRupiah(discountAmount)}</span>
                </div>
              )}
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-foreground font-bold text-sm">Total Bayar</span>
              <span className="text-green-400 font-bold">
                {formatRupiah(typedOrder.totalAmount)}
              </span>
            </div>
            <Separator className="bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Metode Pembayaran</span>
              <span className="text-foreground text-sm">{paymentMethod}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status history */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">
              Riwayat Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="text-green-400 border-green-500/50 text-xs shrink-0"
              >
                {typedOrder.createdAt
                  ? new Date(typedOrder.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "--:--"}
              </Badge>
              <span className="text-foreground/80 text-sm">Pesanan dibuat</span>
            </div>
            {isPaid && (
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-400 border-0 text-xs shrink-0">
                  {typedOrder.paidAt
                    ? new Date(typedOrder.paidAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--"}
                </Badge>
                <span className="text-foreground/80 text-sm">
                  Pembayaran berhasil diverifikasi
                </span>
              </div>
            )}
            {(isRefunded || isCancelled) && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="destructive"
                  className="text-xs shrink-0"
                >
                  Ditolak
                </Badge>
                <span className="text-foreground/80 text-sm">
                  Pembayaran ditolak
                </span>
              </div>
            )}
            {isExpired && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-muted-foreground border-muted-foreground/70 text-xs shrink-0"
                >
                  Expired
                </Badge>
                <span className="text-foreground/80 text-sm">
                  Batas waktu pembayaran habis
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="space-y-3 pb-8">
          {isPaid && (
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white h-12 font-semibold"
              onClick={() => navigateTo("eticket", typedOrder.id)}
            >
              <Ticket className="w-4 h-4 mr-2" />
              Lihat E-Tiket
            </Button>
          )}
          {(isRefunded || isCancelled) && (
            <Button
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black h-12 font-semibold"
              onClick={() => navigateTo("payment", typedOrder.id)}
            >
              Coba Bayar Lagi
            </Button>
          )}
          {isExpired && (
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white h-12 font-semibold"
              onClick={() => navigateTo("checkout")}
            >
              Buat Pesanan Baru
            </Button>
          )}
          <Button
            variant="outline"
            className="w-full border-border text-foreground/80 hover:bg-card hover:text-foreground h-12"
            onClick={() => navigateTo("home")}
          >
            <Home className="w-4 h-4 mr-2" />
            Kembali ke Beranda
          </Button>
        </div>
      </main>
    </div>
  );
}
