"use client";

import React from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Home,
  LogOut,
  User,
  ShoppingBag,
  Ticket,
  Wallet,
  Pencil,
  ChevronRight,
  Mail,
  Phone,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { usePageStore } from "@/lib/page-store";
import { useToast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const authState = useAuthStore() as unknown as Record<string, unknown>;
  const { user, logout } = useAuthStore();
  const { navigateTo } = usePageStore();
  const { toast } = useToast();

  // Prefer API user data over store
  const currentUser = (authState.user as Record<string, unknown> | undefined) ?? (user as unknown as Record<string, unknown> | undefined) ?? {};

  const orders = (authState.orders as any[]) ?? [];
  const myOrders = Array.isArray(orders) ? orders : [];

  // Stats
  const totalOrders = orders.length;
  const totalTickets = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  const totalSpent = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const handleLogout = () => {
    logout();
    toast({ title: "Berhasil logout" });
    navigateTo("home");
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
            onClick={() => navigateTo("home")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white font-semibold text-lg flex-1">
            Profil Saya
          </h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* User info card */}
        <Card className="bg-[#16161D] border-[#2A2A35] overflow-hidden">
          {/* Top gradient */}
          <div className="h-24 bg-gradient-to-r from-green-500/20 to-green-600/10" />
          <CardContent className="relative px-6 pb-6 -mt-10">
            <div className="flex items-end gap-4">
              <Avatar className="w-20 h-20 border-4 border-[#16161D] shadow-lg">
                <AvatarImage src={currentUser?.avatar as string} alt={currentUser?.name as string} />
                <AvatarFallback className="bg-green-500/20 text-green-400 text-xl">
                  {(currentUser?.name as string)
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-1">
                <h2 className="text-white text-xl font-bold">{currentUser?.name as string}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10 -ml-2 h-7 px-2 text-xs"
                  onClick={() =>
                    toast({ title: "Fitur edit profil segera hadir!" })
                  }
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit Profil
                </Button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-gray-600" />
                {currentUser?.email as string}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-gray-600" />
                {currentUser?.phone as string}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-[#16161D] border-[#2A2A35]">
            <CardContent className="pt-4 pb-3 text-center">
              <ShoppingBag className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-white text-xl font-bold">{totalOrders}</p>
              <p className="text-gray-500 text-xs">Pesanan</p>
            </CardContent>
          </Card>
          <Card className="bg-[#16161D] border-[#2A2A35]">
            <CardContent className="pt-4 pb-3 text-center">
              <Ticket className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-white text-xl font-bold">{totalTickets}</p>
              <p className="text-gray-500 text-xs">Tiket</p>
            </CardContent>
          </Card>
          <Card className="bg-[#16161D] border-[#2A2A35]">
            <CardContent className="pt-4 pb-3 text-center">
              <Wallet className="w-5 h-5 text-green-400 mx-auto mb-2" />
              <p className="text-green-400 text-base font-bold">
                {totalSpent > 0
                  ? formatRupiah(totalSpent).replace("Rp", "").trim()
                  : "Rp 0"}
              </p>
              <p className="text-gray-500 text-xs">Total Belanja</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu items */}
        <Card className="bg-[#16161D] border-[#2A2A35]">
          <CardContent className="p-0">
            {/* My orders */}
            <button
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#1E1E28] transition-colors text-left"
              onClick={() => navigateTo("my-orders")}
            >
              <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Pesanan Saya</p>
                <p className="text-gray-500 text-xs">
                  {totalOrders} pesanan • {totalTickets} tiket
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>

            <Separator className="bg-[#2A2A35]" />

            {/* Account info (decorative) */}
            <button
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#1E1E28] transition-colors text-left"
              onClick={() =>
                toast({ title: "Fitur pengaturan akun segera hadir!" })
              }
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">
                  Pengaturan Akun
                </p>
                <p className="text-gray-500 text-xs">
                  Ubah email, password, dan preferensi
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>

            <Separator className="bg-[#2A2A35]" />

            {/* Help (decorative) */}
            <button
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#1E1E28] transition-colors text-left"
              onClick={() =>
                toast({ title: "Halaman bantuan segera hadir!" })
              }
            >
              <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">Bantuan</p>
                <p className="text-gray-500 text-xs">
                  FAQ dan hubungi customer service
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </CardContent>
        </Card>

        {/* Logout button */}
        <Button
          variant="outline"
          className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 h-12 mt-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>

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
