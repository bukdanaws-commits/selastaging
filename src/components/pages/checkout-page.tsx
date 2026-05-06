"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  ShoppingCart,
  User,
  CheckCircle2,
  Ticket,
  Loader2,
  Tag,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { formatRupiah } from "@/lib/utils";
import type { IOrder, IOrderItem, ITicketType, IEvent, CouponValidationResult } from "@/lib/types";
import { useAuthStore } from "@/lib/auth-store";
import { usePageStore } from "@/lib/page-store";
import { useToast } from "@/hooks/use-toast";
import { useCreateOrder, useTicketTypes, useEvent, useFeeConfig } from "@/hooks/use-api";
import { couponApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast as sonnerToast } from "sonner";

const STEPS = ["Pilih Tiket", "Data Peserta", "Konfirmasi & Bayar"];

// ─── Default fee percentages (fallback) ──────────────────────────
const DEFAULT_PLATFORM_FEE_PERCENT = 2;
const DEFAULT_PPN_PERCENT = 11;

// ─── Fallback event slug ──────────────────────────────────────────
const EVENT_SLUG = "sheila-on7-jakarta";

// ─── Local types ──────────────────────────────────────────────────
interface TicketSelection {
  [ticketTypeId: string]: number;
}

interface AttendeeFormData {
  name: string;
  email: string;
  phone: string;
  sameAsFirst: boolean;
}

// ─── Helper functions ─────────────────────────────────────────────
function getAvailableQuota(tt: ITicketType): number {
  return Math.max(0, tt.quota - tt.sold);
}

function getQuotaPercentage(tt: ITicketType): number {
  if (tt.quota === 0) return 0;
  return Math.round((tt.sold / tt.quota) * 100);
}

// ─── Local display type for order items in checkout ───────────────
interface LocalOrderItem {
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export default function CheckoutPage() {
  const { navigateTo } = usePageStore();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const createOrder = useCreateOrder();

  // ─── Fetch event and ticket types ───────────────────────────
  const { data: eventData } = useEvent(EVENT_SLUG);
  const event = (eventData as { event?: IEvent } | null)?.event ?? null;

  // Derive event ID from fetched event or fallback to real UUID
  const eventId = event?.id || "30000000-0000-0000-0000-000000000001";
  const { data: ticketTypesData, isLoading: ticketTypesLoading } = useTicketTypes(eventId);
  const ticketTypes: ITicketType[] = Array.isArray(ticketTypesData) ? (ticketTypesData as ITicketType[]) : [];

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<TicketSelection>({});
  const [attendees, setAttendees] = useState<AttendeeFormData[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Fetch fee config dynamically ────────────────────────────
  const { data: feeConfig, isLoading: feeConfigLoading } = useFeeConfig();
  const PLATFORM_FEE_PERCENT = feeConfig?.defaultAdminFeePercent ?? DEFAULT_PLATFORM_FEE_PERCENT;
  const PPN_PERCENT = feeConfig?.ppnPercent ?? DEFAULT_PPN_PERCENT;

  // ─── Coupon state ────────────────────────────────────────────
  const [couponCode, setCouponCode] = useState("");
  const [couponResult, setCouponResult] = useState<CouponValidationResult | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(null);

  // ─── Derived data ──────────────────────────────────────────────
  const selectedItems = useMemo<LocalOrderItem[]>(() => {
    return Object.entries(selections)
      .filter(([, qty]) => qty > 0)
      .map(([ticketTypeId, quantity]) => {
        const tt = ticketTypes.find((t) => t.id === ticketTypeId);
        return {
          ticketTypeId,
          ticketTypeName: tt?.name || "Unknown",
          quantity,
          price: tt?.price || 0,
          subtotal: (tt?.price || 0) * quantity,
        };
      });
  }, [selections, ticketTypes]);

  const totalTickets = useMemo(
    () => Object.values(selections).reduce((sum, qty) => sum + qty, 0),
    [selections]
  );

  const subTotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.subtotal, 0),
    [selectedItems]
  );

  const adminFee = useMemo(
    () => Math.round(subTotal * PLATFORM_FEE_PERCENT / 100),
    [subTotal, PLATFORM_FEE_PERCENT]
  );

  const taxAmount = useMemo(
    () => Math.round(subTotal * PPN_PERCENT / 100),
    [subTotal, PPN_PERCENT]
  );

  const discountAmount = useMemo(
    () => couponResult?.valid ? couponResult.discountAmount : 0,
    [couponResult]
  );

  const totalAmount = useMemo(
    () => Math.max(0, subTotal + adminFee + taxAmount - discountAmount),
    [subTotal, adminFee, taxAmount, discountAmount]
  );

  // ─── Coupon validation handler ──────────────────────────────
  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      sonnerToast.error("Masukkan kode kupon");
      return;
    }

    setIsValidatingCoupon(true);
    setCouponResult(null);

    try {
      const result = await couponApi.validateCoupon({
        code: couponCode.trim().toUpperCase(),
        subtotal: subTotal,
      });

      setCouponResult(result);

      if (result.valid) {
        setAppliedCouponCode(couponCode.trim().toUpperCase());
        sonnerToast.success(`Kupon ${couponCode.trim().toUpperCase()} berhasil diterapkan! Hemat ${formatRupiah(result.discountAmount)}`);
      } else {
        setAppliedCouponCode(null);
        sonnerToast.error(result.message || "Kupon tidak valid");
      }
    } catch (err) {
      setCouponResult({ valid: false, discountAmount: 0, message: "Gagal memvalidasi kupon. Coba lagi." });
      setAppliedCouponCode(null);
      sonnerToast.error("Gagal memvalidasi kupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  }, [couponCode, subTotal]);

  const handleRemoveCoupon = useCallback(() => {
    setCouponCode("");
    setCouponResult(null);
    setAppliedCouponCode(null);
    sonnerToast.info("Kupon dihapus");
  }, []);

  // Reset coupon when subtotal changes (ticket selection changes)
  useEffect(() => {
    if (appliedCouponCode && couponResult?.valid) {
      // Re-validate coupon with new subtotal
      setCouponResult(null);
      setAppliedCouponCode(null);
    }
  }, [subTotal, appliedCouponCode, couponResult]);

  // ─── Ticket selection handlers ─────────────────────────────────
  const updateQty = (ticketTypeId: string, delta: number) => {
    setSelections((prev) => {
      const current = prev[ticketTypeId] || 0;
      const newQty = current + delta;
      const totalOther = Object.entries(prev).reduce(
        (sum, [id, qty]) => (id === ticketTypeId ? sum : sum + qty),
        0
      );

      if (newQty < 0) return prev;
      if (totalOther + newQty > 5) return prev;

      const tt = ticketTypes.find((t) => t.id === ticketTypeId);
      if (tt && newQty > getAvailableQuota(tt)) return prev;

      return { ...prev, [ticketTypeId]: newQty };
    });
  };

  // ─── Step navigation ───────────────────────────────────────────
  const goNext = () => {
    if (step === 0) {
      // Validate ticket selection
      if (totalTickets === 0) {
        toast({ title: "Pilih minimal 1 tiket", variant: "destructive" });
        return;
      }
      // Initialize attendee forms
      const initialAttendees: AttendeeFormData[] = [];
      selectedItems.forEach((item) => {
        for (let i = 0; i < item.quantity; i++) {
          initialAttendees.push({
            name: i === 0 && user ? user.name : "",
            email: i === 0 && user ? user.email : "",
            phone: i === 0 && user ? user.phone || "" : "",
            sameAsFirst: initialAttendees.length > 0,
          });
        }
      });
      setAttendees(initialAttendees);
      setStep(1);
    } else if (step === 1) {
      // Validate attendee data
      for (let i = 0; i < attendees.length; i++) {
        const a = attendees[i];
        if (a.sameAsFirst) continue;
        if (!a.name.trim()) {
          toast({
            title: `Lengkapi nama untuk Tiket #${i + 1}`,
            variant: "destructive",
          });
          return;
        }
        if (!a.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)) {
          toast({
            title: `Email tidak valid untuk Tiket #${i + 1}`,
            variant: "destructive",
          });
          return;
        }
        if (!a.phone.trim() || !/^0\d{8,12}$/.test(a.phone)) {
          toast({
            title: `No. HP tidak valid untuk Tiket #${i + 1}`,
            variant: "destructive",
          });
          return;
        }
      }
      setStep(2);
    } else if (step === 2) {
      if (!termsAccepted) {
        toast({ title: "Setujui syarat dan ketentuan", variant: "destructive" });
        return;
      }
      // Create order via API
      handleCreateOrder();
    }
  };

  const handleCreateOrder = async () => {
    setIsSubmitting(true);
    try {
      // Build order items with attendee info
      const resolvedAttendees = attendees.map((a) => {
        const data = a.sameAsFirst ? attendees[0] : a;
        return {
          name: data.name,
          email: data.email,
          phone: data.phone,
          ticketTypeId: "",
        };
      });

      // Assign ticket types to attendees
      let attendeeIdx = 0;
      const orderItems: { ticketTypeId: string; quantity: number; attendeeName: string; attendeeEmail: string }[] = [];

      selectedItems.forEach((item) => {
        for (let i = 0; i < item.quantity; i++) {
          const attendee = resolvedAttendees[attendeeIdx];
          orderItems.push({
            ticketTypeId: item.ticketTypeId,
            quantity: 1,
            attendeeName: attendee?.name || "",
            attendeeEmail: attendee?.email || "",
          });
          attendeeIdx++;
        }
      });

      const result = await createOrder.mutateAsync({
        eventId,
        items: orderItems,
        couponCode: appliedCouponCode || undefined,
        subTotal,
        adminFee,
        taxAmount,
        discountAmount,
      });

      const order = result as IOrder;
      sonnerToast.success("Pesanan berhasil dibuat!");
      navigateTo("payment", order.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Gagal membuat pesanan";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === 0) {
      navigateTo("home");
    } else {
      setStep(step - 1);
    }
  };

  // ─── Render: Step indicator ────────────────────────────────────
  const renderStepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                      ? "bg-green-500 text-white"
                      : "bg-border text-muted-foreground"
                )}
              >
                {i < step ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 text-center",
                  i <= step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-2 mt-[-1rem]",
                  i < step ? "bg-green-500" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>
      <Progress value={((step + 1) / STEPS.length) * 100} className="h-1" />
    </div>
  );

  // ─── Render: Step 1 - Pilih Tiket ──────────────────────────────
  const renderStep1 = () => {
    if (ticketTypesLoading) {
      return (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
          <span className="ml-3 text-muted-foreground">Memuat tiket...</span>
        </div>
      );
    }

    if (ticketTypes.length === 0) {
      return (
        <Card className="bg-card border-border">
          <CardContent className="py-16 text-center">
            <Ticket className="w-12 h-12 text-muted-foreground/70 mx-auto mb-3" />
            <p className="text-muted-foreground">Tiket belum tersedia</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Coba lagi nanti</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-foreground">Pilih Tiket</h2>
          <Badge variant="outline" className="text-green-400 border-green-500/50">
            <Ticket className="w-3 h-3 mr-1" />
            {totalTickets}/5 tiket
          </Badge>
        </div>

        {ticketTypes.map((tt) => {
          const qty = selections[tt.id] || 0;
          const available = getAvailableQuota(tt);
          const soldPct = getQuotaPercentage(tt);

          return (
            <Card
              key={tt.id}
              className={cn(
                "bg-card border-border transition-all",
                qty > 0 && "border-green-500/50 ring-1 ring-green-500/20"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{tt.emoji || "🎫"}</span>
                    <div>
                      <CardTitle className="text-foreground text-base">
                        {tt.name}
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-sm">
                        {tt.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-green-400 font-bold text-lg">
                      {formatRupiah(tt.price)}
                    </p>
                    <p className="text-muted-foreground text-xs">/tiket</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    {available === 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        Habis Terjual
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          soldPct >= 80
                            ? "text-yellow-400 border-yellow-500/50"
                            : "text-green-400 border-green-500/50"
                        )}
                      >
                        Sisa {available}
                      </Badge>
                    )}
                    <div className="flex gap-1 mt-1">
                      {tt.benefits?.slice(0, 3).map((b) => (
                        <span key={b} className="text-[10px] text-muted-foreground">
                          {b}
                          {b !== tt.benefits?.slice(0, 3).at(-1) && " •"}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-8 h-8 border-border hover:border-green-500 text-foreground"
                      onClick={() => updateQty(tt.id, -1)}
                      disabled={qty === 0}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center text-foreground font-bold text-lg">
                      {qty}
                    </span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="w-8 h-8 border-border hover:border-green-500 text-foreground"
                      onClick={() => updateQty(tt.id, 1)}
                      disabled={available === 0 || totalTickets >= 5}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Running total */}
        <Card className="bg-background border-green-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total</span>
              <div className="text-right">
                <span className="text-green-400 font-bold text-xl">
                  {formatRupiah(subTotal)}
                </span>
                <p className="text-muted-foreground text-xs">
                  {totalTickets} tiket
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ─── Render: Step 2 - Data Peserta ─────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Data Peserta
      </h2>
      <p className="text-muted-foreground text-sm mb-4">
        Lengkapi data untuk setiap tiket yang dipilih
      </p>

      {attendees.map((attendee, index) => {
        const ticketIdx = attendees
          .slice(0, index)
          .filter((a) => !a.sameAsFirst || index === 0).length;
        const ttId = selectedItems[ticketIdx]?.ticketTypeId;
        const tt = ticketTypes.find((t) => t.id === ttId);

        return (
          <Card
            key={index}
            className="bg-card border-border overflow-hidden"
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-400" />
                  <CardTitle className="text-foreground text-sm">
                    Tiket #{index + 1}
                    {tt && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-green-400 border-green-500/50 text-xs"
                      >
                        {tt.emoji || "🎫"} {tt.name}
                      </Badge>
                    )}
                  </CardTitle>
                </div>
                {index > 0 && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`same-as-${index}`}
                      checked={attendee.sameAsFirst}
                      onCheckedChange={(checked) =>
                        setAttendees((prev) =>
                          prev.map((a, i) =>
                            i === index
                              ? { ...a, sameAsFirst: checked === true }
                              : a
                          )
                        )
                      }
                    />
                    <Label
                      htmlFor={`same-as-${index}`}
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      Sama seperti #1
                    </Label>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {(index === 0 || !attendee.sameAsFirst) && (
                <>
                  <div>
                    <Label className="text-muted-foreground text-xs mb-1">
                      Nama Lengkap
                    </Label>
                    <Input
                      placeholder="Masukkan nama lengkap"
                      value={attendee.name}
                      onChange={(e) =>
                        setAttendees((prev) =>
                          prev.map((a, i) =>
                            i === index ? { ...a, name: e.target.value } : a
                          )
                        )
                      }
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs mb-1">
                      Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="email@contoh.com"
                      value={attendee.email}
                      onChange={(e) =>
                        setAttendees((prev) =>
                          prev.map((a, i) =>
                            i === index ? { ...a, email: e.target.value } : a
                          )
                        )
                      }
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                    />
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs mb-1">
                      No. HP
                    </Label>
                    <Input
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      value={attendee.phone}
                      onChange={(e) =>
                        setAttendees((prev) =>
                          prev.map((a, i) =>
                            i === index ? { ...a, phone: e.target.value } : a
                          )
                        )
                      }
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground/70"
                    />
                  </div>
                </>
              )}
              {index > 0 && attendee.sameAsFirst && (
                <div className="bg-background rounded-lg p-3 text-sm text-muted-foreground">
                  Menggunakan data yang sama dengan{" "}
                  <span className="text-foreground font-medium">
                    {attendees[0].name || "Tiket #1"}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  // ─── Render: Step 3 - Konfirmasi ───────────────────────────────
  const renderStep3 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Konfirmasi & Bayar
      </h2>

      {/* Order summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-green-400" />
            Ringkasan Pesanan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-background rounded-lg p-3 space-y-1">
            <p className="text-foreground font-semibold">{event?.title || "Sheila On 7 — JAKARTA"}</p>
            <p className="text-muted-foreground text-sm">
              {event?.date || "2026-04-25"} • {event?.doorsOpen || "16:00 WIB"}
            </p>
            <p className="text-muted-foreground text-sm">
              📍 {event?.venue || "GBK Madya Stadium"}, {event?.city || "Jakarta"}
            </p>
          </div>

          <Separator className="bg-border" />

          {/* Ticket items */}
          {selectedItems.map((item) => (
            <div
              key={item.ticketTypeId}
              className="flex justify-between text-sm"
            >
              <span className="text-foreground/80">
                {item.ticketTypeName} × {item.quantity}
              </span>
              <span className="text-foreground">{formatRupiah(item.subtotal)}</span>
            </div>
          ))}

          <Separator className="bg-border" />

          {/* Price breakdown */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground">{formatRupiah(subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Biaya Admin ({PLATFORM_FEE_PERCENT}%)</span>
              <span className="text-foreground">{formatRupiah(adminFee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PPN ({PPN_PERCENT}%)</span>
              <span className="text-foreground">{formatRupiah(taxAmount)}</span>
            </div>

            {/* Discount line */}
            {discountAmount > 0 && appliedCouponCode && (
              <div className="flex justify-between text-sm">
                <span className="text-green-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  Kupon {appliedCouponCode}
                </span>
                <span className="text-green-400">-{formatRupiah(discountAmount)}</span>
              </div>
            )}
          </div>

          <Separator className="bg-border" />

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="text-foreground font-bold">TOTAL BAYAR</span>
            <span className="text-green-400 font-bold text-2xl">
              {formatRupiah(totalAmount)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Coupon input */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-green-400" />
            Kupon Diskon
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {appliedCouponCode && couponResult?.valid ? (
            /* Applied coupon display */
            <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-green-400 font-semibold text-sm">{appliedCouponCode}</p>
                  <p className="text-green-400/70 text-xs">Hemat {formatRupiah(discountAmount)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                onClick={handleRemoveCoupon}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            /* Coupon input */
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  placeholder="Masukkan kode kupon"
                  value={couponCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    setCouponCode(val);
                    // Clear previous result when typing
                    if (couponResult && !couponResult.valid) {
                      setCouponResult(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleApplyCoupon();
                    }
                  }}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground/70 uppercase"
                  disabled={isValidatingCoupon}
                />
              </div>
              <Button
                variant="outline"
                className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-400"
                onClick={handleApplyCoupon}
                disabled={isValidatingCoupon || !couponCode.trim() || subTotal === 0}
              >
                {isValidatingCoupon ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Terapkan"
                )}
              </Button>
            </div>
          )}

          {/* Error message */}
          {couponResult && !couponResult.valid && couponResult.message && !appliedCouponCode && (
            <div className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/30 rounded-lg p-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{couponResult.message}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendee summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-foreground text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-green-400" />
            Data Peserta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendees.map((a, i) => {
            const data = a.sameAsFirst && i > 0 ? attendees[0] : a;
            const ttId = selectedItems[
              attendees
                .slice(0, i)
                .filter((at) => !at.sameAsFirst || i === 0).length
            ]?.ticketTypeId;
            const tt = ticketTypes.find((t) => t.id === ttId);
            return (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">#{i + 1}</span>
                  <span className="text-foreground">{data.name}</span>
                  {tt && (
                    <Badge
                      variant="outline"
                      className="text-[10px] text-green-400 border-green-500/50"
                    >
                      {tt.name}
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground text-xs">{data.email}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Terms */}
      <Card className="bg-card border-border">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label
                htmlFor="terms"
                className="text-sm text-foreground/80 cursor-pointer leading-relaxed"
              >
                Saya menyetujui{" "}
                <span className="text-green-400">Syarat & Ketentuan</span>{" "}
                yang berlaku
              </Label>
              <div className="mt-2 max-h-32 overflow-y-auto rounded-lg bg-background p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  1. Tiket yang sudah dibeli tidak dapat dikembalikan (non-refundable).
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  2. Wajib membawa identitas sesuai data pemesanan.
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  3. Pembayaran harus diselesaikan sebelum batas waktu.
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  4. E-tiket akan tersedia setelah pembayaran berhasil diverifikasi.
                </p>
                <p className="text-xs text-muted-foreground mb-1">
                  5. Biaya admin {PLATFORM_FEE_PERCENT}% dan PPN {PPN_PERCENT}% berlaku untuk setiap transaksi.
                </p>
                <p className="text-xs text-muted-foreground">
                  6. Penyelenggara berhak menolak masuk jika data tidak sesuai.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-card"
            onClick={goBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-foreground font-semibold text-lg flex-1">
            Checkout
          </h1>
          <Badge
            variant="outline"
            className="text-green-400 border-green-500/50 text-xs"
          >
            Step {step + 1}/{STEPS.length}
          </Badge>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6 pb-28">
        {renderStepIndicator()}
        {step === 0 && renderStep1()}
        {step === 1 && renderStep2()}
        {step === 2 && renderStep3()}
      </main>

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            {step === 2 ? (
              <>
                <p className="text-green-400 font-bold">{formatRupiah(totalAmount)}</p>
                <p className="text-muted-foreground text-xs">
                  {totalTickets} tiket • Termasuk fee & PPN
                  {discountAmount > 0 && ` • Diskon ${formatRupiah(discountAmount)}`}
                </p>
              </>
            ) : (
              <>
                {subTotal > 0 && (
                  <p className="text-green-400 font-bold">{formatRupiah(subTotal)}</p>
                )}
                <p className="text-muted-foreground text-xs">{totalTickets} tiket dipilih</p>
              </>
            )}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                className="border-border text-foreground/80 hover:bg-card hover:text-foreground"
                onClick={() => setStep(step - 1)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Kembali
              </Button>
            )}
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={goNext}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Memproses...
                </>
              ) : step === STEPS.length - 1 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Konfirmasi & Bayar
                </>
              ) : (
                <>
                  Lanjut
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
