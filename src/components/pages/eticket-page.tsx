"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Home,
  Download,
  Share2,
  Ticket,
  User,
  Calendar,
  MapPin,
  CheckCircle2,
  Copy,
  Loader2,
  CreditCard,
} from "lucide-react";
import { formatRupiah, formatDate } from "@/lib/utils";
import type { IOrder } from "@/lib/types";
import { usePageStore } from "@/lib/page-store";
import { useToast } from "@/hooks/use-toast";
import { useOrderDetail } from "@/hooks/use-api";

const INSTRUCTIONS = [
  {
    icon: Calendar,
    text: "Datang ke venue sebelum waktu mulai",
  },
  {
    icon: Ticket,
    text: "Ke booth Redeem Gelang",
  },
  {
    icon: Share2,
    text: "Tunjukkan QR code ini ke crew",
  },
  {
    icon: CheckCircle2,
    text: "Terima gelang fisik",
  },
  {
    icon: User,
    text: "Gunakan gelang untuk scan masuk",
  },
];

export default function ETicketPage() {
  const { currentOrderId, navigateTo } = usePageStore();
  const { toast } = useToast();

  // ─── Fetch order detail from API ───────────────────────────
  const { data: orderData, isLoading } = useOrderDetail(currentOrderId || "");
  const order = orderData as IOrder | null;

  const [activeTab, setActiveTab] = useState("0");

  // ─── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        <span className="ml-3 text-muted-foreground">Memuat tiket...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Order tidak ditemukan</p>
      </div>
    );
  }

  const tickets = order.tickets || [];
  const activeTicket = tickets[parseInt(activeTab)];

  const eventTitle = order.event?.title || "Event";
  const eventDate = order.event?.date || "";
  const eventCity = order.event?.city || "";
  const eventVenue = order.event?.venue || "";

  // ─── Fee breakdown helpers ─────────────────────────────────────
  const subTotal = order.subTotal ?? (order.totalAmount - Math.round(order.totalAmount * 13 / 113));
  const adminFee = order.adminFee ?? Math.round(subTotal * 2 / 100);
  const taxAmount = order.taxAmount ?? Math.round(subTotal * 11 / 100);
  const discountAmount = order.discountAmount ?? 0;

  const handleDownload = () => {
    toast({ title: "E-tiket berhasil didownload! 📥" });
  };

  const handleShare = () => {
    if (activeTicket) {
      navigator.clipboard.writeText(
        `E-Tiket ${eventTitle} - ${activeTicket.ticketCode}`
      );
      toast({ title: "Link berhasil disalin! 🔗" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-card"
            onClick={() => navigateTo("my-orders")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-foreground font-semibold text-lg flex-1">
            E-Tiket
          </h1>
          <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {order.status === "paid" ? "Aktif" : order.status}
          </Badge>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Order info */}
        <Card className="bg-card border-border">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-foreground font-semibold">{eventTitle}</h2>
                <p className="text-muted-foreground text-sm">
                  {eventDate} • {eventCity}
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-green-400 border-green-500/50 font-mono text-xs"
              >
                {order.orderCode}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Price breakdown */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-400" />
              Rincian Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatRupiah(subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Admin (2%)</span>
              <span className="text-foreground">{formatRupiah(adminFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PPN (11%)</span>
              <span className="text-foreground">{formatRupiah(taxAmount)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400">Diskon</span>
                <span className="text-green-400">-{formatRupiah(discountAmount)}</span>
              </div>
            )}
            <Separator className="bg-border" />
            <div className="flex justify-between font-bold">
              <span className="text-foreground">Total Bayar</span>
              <span className="text-green-400">{formatRupiah(order.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {tickets.length > 0 ? (
          <>
            {/* Ticket tabs */}
            {tickets.length > 1 && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full bg-card border border-border h-auto p-1">
                  {tickets.map((t, i) => (
                    <TabsTrigger
                      key={t.id}
                      value={String(i)}
                      className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white text-muted-foreground text-xs py-2"
                    >
                      {t.ticketTypeName} #{i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Ticket card */}
            {activeTicket && (
              <Card className="bg-card border-border overflow-hidden">
                {/* Top colored bar */}
                <div className="h-1 bg-gradient-to-r from-green-500 to-green-400" />

                <CardContent className="pt-6 space-y-4">
                  {/* Attendee info */}
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground text-sm">Peserta</span>
                    </div>
                    <h3 className="text-foreground text-xl font-bold">
                      {activeTicket.attendeeName}
                    </h3>
                    <div className="flex items-center justify-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-green-400 border-green-500/50 text-xs"
                      >
                        {activeTicket.ticketTypeName}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-blue-400 border-blue-500/50 text-xs"
                      >
                        {activeTicket.status === "active"
                          ? "Aktif"
                          : activeTicket.status}
                      </Badge>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* QR Code */}
                  <div className="flex justify-center py-4">
                    <div className="bg-white p-4 rounded-xl shadow-lg shadow-green-500/10">
                      <QRCodeSVG
                        value={activeTicket.qrData}
                        size={200}
                        level="H"
                        includeMargin={false}
                        fgColor="#0B0B0F"
                        bgColor="#ffffff"
                      />
                    </div>
                  </div>

                  {/* Ticket code */}
                  <div className="text-center space-y-1">
                    <p className="text-muted-foreground text-xs">Kode Tiket</p>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-foreground font-mono text-sm font-bold">
                        {activeTicket.ticketCode}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            activeTicket.ticketCode
                          );
                          toast({ title: "Kode tiket disalin!" });
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator className="bg-border" />

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      onClick={handleDownload}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download E-Tiket
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border text-foreground/80 hover:bg-card hover:text-foreground"
                      onClick={handleShare}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>

                {/* Bottom dashed line effect */}
                <div className="relative">
                  <Separator className="bg-border" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-background" />
                </div>

                <CardContent className="pb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {eventVenue && eventCity ? `${eventVenue}, ${eventCity}` : eventCity || eventVenue}
                    </div>
                    <span>{eventDate}</span>
                    <span>Powered by SELA</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Ticket className="w-12 h-12 text-muted-foreground/70 mx-auto mb-3" />
              <p className="text-muted-foreground">E-tiket belum tersedia</p>
              <p className="text-muted-foreground/70 text-sm mt-1">
                Menunggu pembayaran diverifikasi
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-foreground text-sm">
              Petunjuk di Hari H
            </CardTitle>
            <CardDescription className="text-muted-foreground text-xs">
              Ikuti langkah-langkah berikut untuk masuk venue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {INSTRUCTIONS.map((inst, i) => {
                const Icon = inst.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-green-500 font-bold text-sm">
                        {i + 1}.
                      </span>
                      <span className="text-foreground/80 text-sm">
                        {inst.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Back button */}
        <Button
          variant="outline"
          className="w-full border-border text-foreground/80 hover:bg-card hover:text-foreground h-12 mb-8"
          onClick={() => navigateTo("home")}
        >
          <Home className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Button>
      </main>
    </div>
  );
}
