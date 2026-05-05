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
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
        <span className="ml-3 text-gray-400">Memuat tiket...</span>
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

  const tickets = order.tickets || [];
  const activeTicket = tickets[parseInt(activeTab)];

  const eventTitle = order.event?.title || "Event";
  const eventDate = order.event?.date || "";
  const eventCity = order.event?.city || "";

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
    <div className="min-h-screen bg-[#0B0B0F]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0B0F]/95 backdrop-blur-md border-b border-[#2A2A35]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white hover:bg-[#16161D]"
            onClick={() => navigateTo("my-orders")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-semibold text-lg flex-1">
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
        <Card className="bg-[#16161D] border-[#2A2A35]">
          <CardContent className="pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-semibold">{eventTitle}</h2>
                <p className="text-gray-400 text-sm">
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

        {tickets.length > 0 ? (
          <>
            {/* Ticket tabs */}
            {tickets.length > 1 && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full bg-[#16161D] border border-[#2A2A35] h-auto p-1">
                  {tickets.map((t, i) => (
                    <TabsTrigger
                      key={t.id}
                      value={String(i)}
                      className="flex-1 data-[state=active]:bg-green-500 data-[state=active]:text-white text-gray-400 text-xs py-2"
                    >
                      {t.ticketTypeName} #{i + 1}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}

            {/* Ticket card */}
            {activeTicket && (
              <Card className="bg-[#16161D] border-[#2A2A35] overflow-hidden">
                {/* Top colored bar */}
                <div className="h-1 bg-gradient-to-r from-green-500 to-green-400" />

                <CardContent className="pt-6 space-y-4">
                  {/* Attendee info */}
                  <div className="text-center space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400 text-sm">Peserta</span>
                    </div>
                    <h3 className="text-white text-xl font-bold">
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

                  <Separator className="bg-[#2A2A35]" />

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
                    <p className="text-gray-500 text-xs">Kode Tiket</p>
                    <div className="flex items-center justify-center gap-1">
                      <p className="text-white font-mono text-sm font-bold">
                        {activeTicket.ticketCode}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-gray-500 hover:text-white"
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

                  <Separator className="bg-[#2A2A35]" />

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
                      className="border-[#2A2A35] text-gray-300 hover:bg-[#16161D] hover:text-white"
                      onClick={handleShare}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>

                {/* Bottom dashed line effect */}
                <div className="relative">
                  <Separator className="bg-[#2A2A35]" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#0B0B0F]" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-[#0B0B0F]" />
                </div>

                <CardContent className="pb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {eventCity}
                    </div>
                    <span>{eventDate}</span>
                    <span>Powered by SELA</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="bg-[#16161D] border-[#2A2A35]">
            <CardContent className="py-12 text-center">
              <Ticket className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">E-tiket belum tersedia</p>
              <p className="text-gray-600 text-sm mt-1">
                Menunggu pembayaran diverifikasi
              </p>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-[#16161D] border-[#2A2A35]">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">
              Petunjuk di Hari H
            </CardTitle>
            <CardDescription className="text-gray-500 text-xs">
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
                      <span className="text-gray-300 text-sm">
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
          className="w-full border-[#2A2A35] text-gray-300 hover:bg-[#16161D] hover:text-white h-12 mb-8"
          onClick={() => navigateTo("home")}
        >
          <Home className="w-4 h-4 mr-2" />
          Kembali ke Beranda
        </Button>
      </main>
    </div>
  );
}
