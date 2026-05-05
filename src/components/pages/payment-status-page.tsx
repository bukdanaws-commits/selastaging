"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { formatRupiah } from "@/lib/utils";
import type { IOrder, IPaymentStatus } from "@/lib/types";
import { usePageStore } from "@/lib/page-store";
import { cn } from "@/lib/utils";
import { useOrderDetail, usePaymentStatus } from "@/hooks/use-api";

const TIMELINE_STEPS = [
  { label: "Pesanan Dibuat", icon: Ticket },
  { label: "Memilih Pembayaran", icon: FileCheck },
  { label: "Menunggu Pembayaran", icon: Clock },
  { label: "Pembayaran Dikonfirmasi", icon: ShieldCheck },
  { label: "Tiket Aktif", icon: CheckCircle2 },
];

export default function PaymentStatusPage() {
  const { currentOrderId, navigateTo } = usePageStore();

  // ─── Fetch order detail and payment status from API ────────────
  const { data: order, isLoading: orderLoading } = useOrderDetail(currentOrderId || "");
  const { data: paymentStatusData } = usePaymentStatus(currentOrderId || "");

  const typedOrder = order as IOrder | null;
  const typedPaymentStatus = paymentStatusData as IPaymentStatus | null;

  const [showConfetti, setShowConfetti] = useState(false);
  const confettiRef = useRef<HTMLDivElement>(null);

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
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        <span className="ml-3 text-gray-400">Memuat status pesanan...</span>
      </div>
    );
  }

  // ─── Not found state ───────────────────────────────────────────
  if (!typedOrder) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <p className="text-gray-500">Order tidak ditemukan</p>
      </div>
    );
  }

  const isPaid = typedOrder.status === "paid";
  const isRefunded = typedOrder.status === "refunded";
  const isCancelled = typedOrder.status === "cancelled";
  const isExpired = typedOrder.status === "expired";
  const isNegative = isRefunded || isCancelled || isExpired;

  const eventTitle = typedOrder.event?.title || "Event";
  const paymentMethod = typedOrder.paymentMethod || typedOrder.paymentType || typedOrder.paymentChannel || "DOKU";

  return (
    <div className="min-h-screen bg-[#0B0B0F]">
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
      <header className="sticky top-0 z-50 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-[#2A2A35]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-[#16161D]"
            onClick={() => navigateTo("home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-semibold text-lg flex-1">
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
              <h2 className="text-2xl font-bold text-white mb-2">
                Pembayaran Berhasil! 🎉
              </h2>
              <p className="text-gray-400">
                E-tiket Anda sudah siap. Silakan cek tiket Anda.
              </p>
            </>
          ) : isRefunded || isCancelled ? (
            <>
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Pembayaran Ditolak
              </h2>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Pembayaran tidak dapat diverifikasi. Silakan coba lagi.
              </p>
            </>
          ) : isExpired ? (
            <>
              <div className="w-20 h-20 rounded-full bg-gray-500/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-10 h-10 text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Pesanan Expired
              </h2>
              <p className="text-gray-400 text-sm max-w-sm mx-auto">
                Batas waktu pembayaran telah habis. Silakan buat pesanan baru.
              </p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Menunggu Pembayaran
              </h2>
              <p className="text-gray-400 text-sm">
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
        <Card className="bg-[#16161D] border-[#2A2A35]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">
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
                          isPending && "bg-[#2A2A35]"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <Icon
                            className={cn(
                              "w-4 h-4",
                              isActive
                                ? "text-white"
                                : "text-gray-600"
                            )}
                          />
                        )}
                      </div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <div
                          className={cn(
                            "w-0.5 h-10",
                            isCompleted ? "bg-green-500" : "bg-[#2A2A35]"
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
                          isActive && "text-white",
                          isPending && "text-gray-600"
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
                        <p className="text-xs text-gray-500 mt-0.5">Selesai</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Order details */}
        <Card className="bg-[#16161D] border-[#2A2A35]">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Kode Pesanan</span>
              <span className="text-white font-mono text-sm">
                {typedOrder.orderCode}
              </span>
            </div>
            <Separator className="bg-[#2A2A35]" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Event</span>
              <span className="text-white text-sm">{eventTitle}</span>
            </div>
            <Separator className="bg-[#2A2A35]" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Total</span>
              <span className="text-green-400 font-bold">
                {formatRupiah(typedOrder.totalAmount)}
              </span>
            </div>
            <Separator className="bg-[#2A2A35]" />
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Metode</span>
              <span className="text-white text-sm">{paymentMethod}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status history */}
        <Card className="bg-[#16161D] border-[#2A2A35]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">
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
              <span className="text-gray-300 text-sm">Pesanan dibuat</span>
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
                <span className="text-gray-300 text-sm">
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
                <span className="text-gray-300 text-sm">
                  Pembayaran ditolak
                </span>
              </div>
            )}
            {isExpired && (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="text-gray-500 border-gray-600 text-xs shrink-0"
                >
                  Expired
                </Badge>
                <span className="text-gray-300 text-sm">
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
            className="w-full border-[#2A2A35] text-gray-300 hover:bg-[#16161D] hover:text-white h-12"
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
