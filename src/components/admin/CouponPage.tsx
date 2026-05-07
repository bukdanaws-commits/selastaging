'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { cn, formatRupiah } from '@/lib/utils'
import { toast } from 'sonner'
import { useScopedData } from '@/hooks/use-scoped-data'
import { Skeleton } from '@/components/ui/skeleton'
import { couponApi, PaginatedData } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Percent,
  Coins,
  Copy,
  Globe,
  MapPin,
  X,
  Loader2,
} from 'lucide-react'

import type {
  ICoupon,
  ICouponCategoryConfig,
  CouponDiscountType,
  CouponScope,
  CouponStatus,
} from '@/lib/types'

// ─── STATIC REFERENCE DATA (used in form dropdowns) ────────────────────────

const FALLBACK_EVENTS = [
  { id: 'evt-sheila-on7-jakarta', name: 'Sheila On 7 - Melompat Lebih Tinggi' },
  { id: 'evt-sheila-on7-surabaya', name: 'Sheila On 7 - Surabaya Concert' },
]

const TICKET_CATEGORIES = [
  'VVIP PIT', 'VIP ZONE', 'FESTIVAL', 'CAT 1', 'CAT 2', 'CAT 3',
  'CAT 4', 'CAT 5', 'CAT 6',
]

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── STATUS HELPERS ──────────────────────────────────────────────────────────

function getCouponStatusBadge(status: CouponStatus) {
  const config: Record<CouponStatus, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25' },
    inactive: { label: 'Inactive', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25' },
    expired: { label: 'Expired', className: 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25' },
  }
  const c = config[status]
  return <Badge variant="outline" className={cn('text-xs font-semibold', c.className)}>{c.label}</Badge>
}

function getScopeBadge(scope: CouponScope) {
  return scope === 'global'
    ? <Badge variant="outline" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"><Globe className="w-3 h-3 mr-1" />Global</Badge>
    : <Badge variant="outline" className="text-xs font-semibold bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"><MapPin className="w-3 h-3 mr-1" />Per Event</Badge>
}

function formatDiscountValue(coupon: ICoupon): string {
  if (coupon.discountType === 'percentage') {
    return `${coupon.discountValue}%`
  }
  return formatRupiah(coupon.discountValue)
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// ─── FORM TYPE ───────────────────────────────────────────────────────────────

interface CouponFormData {
  code: string
  name: string
  description: string
  discountType: CouponDiscountType
  discountValue: string
  maxDiscount: string
  scope: CouponScope
  eventId: string
  categoryConfigs: ICouponCategoryConfig[]
  usageLimit: string
  usageLimitPerUser: string
  startsAt: string
  expiresAt: string
  status: CouponStatus
}

const DEFAULT_FORM: CouponFormData = {
  code: '',
  name: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscount: '',
  scope: 'global',
  eventId: '',
  categoryConfigs: [],
  usageLimit: '100',
  usageLimitPerUser: '1',
  startsAt: '',
  expiresAt: '',
  status: 'active',
}

// ─── COUPON FORM DIALOG ─────────────────────────────────────────────────────

function CouponFormDialog({
  open,
  onOpenChange,
  editingCoupon,
  onSave,
  isSaving,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCoupon: ICoupon | null
  onSave: (data: CouponFormData) => void
  isSaving: boolean
}) {
  const [form, setForm] = useState<CouponFormData>(DEFAULT_FORM)

  // Pre-fill when editing
  React.useEffect(() => {
    if (editingCoupon) {
      setForm({
        code: editingCoupon.code,
        name: editingCoupon.name,
        description: editingCoupon.description || '',
        discountType: editingCoupon.discountType,
        discountValue: String(editingCoupon.discountValue),
        maxDiscount: editingCoupon.maxDiscount ? String(editingCoupon.maxDiscount) : '',
        scope: editingCoupon.scope,
        eventId: editingCoupon.eventId || '',
        categoryConfigs: editingCoupon.categoryConfigs.map(c => ({ ...c })),
        usageLimit: String(editingCoupon.usageLimit),
        usageLimitPerUser: String(editingCoupon.usageLimitPerUser),
        startsAt: editingCoupon.startsAt ? editingCoupon.startsAt.slice(0, 16) : '',
        expiresAt: editingCoupon.expiresAt ? editingCoupon.expiresAt.slice(0, 16) : '',
        status: editingCoupon.status,
      })
    } else {
      setForm(DEFAULT_FORM)
    }
  }, [editingCoupon, open])

  const updateField = <K extends keyof CouponFormData>(key: K, value: CouponFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Category config handlers
  const addCategoryConfig = () => {
    setForm(prev => ({
      ...prev,
      categoryConfigs: [...prev.categoryConfigs, { category: '', discountValue: 0, minOrder: 0 }],
    }))
  }

  const removeCategoryConfig = (index: number) => {
    setForm(prev => ({
      ...prev,
      categoryConfigs: prev.categoryConfigs.filter((_, i) => i !== index),
    }))
  }

  const updateCategoryConfig = (index: number, field: keyof ICouponCategoryConfig, value: string | number) => {
    setForm(prev => ({
      ...prev,
      categoryConfigs: prev.categoryConfigs.map((c, i) =>
        i === index ? { ...c, [field]: value } : c
      ),
    }))
  }

  const isValid = form.code && form.name && form.discountValue && form.startsAt && form.expiresAt

  const handleSave = () => {
    if (!isValid) {
      toast.error('Lengkapi semua field wajib')
      return
    }
    onSave(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/15 text-foreground max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            {editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            {editingCoupon ? 'Ubah detail coupon' : 'Buat coupon diskon baru'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-3">
          {/* ═══ Basic Info ═══ */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Basic Info</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Code *</Label>
                <Input
                  value={form.code}
                  onChange={e => updateField('code', e.target.value.toUpperCase())}
                  placeholder="e.g. MEGA50"
                  className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 font-mono uppercase h-9"
                  maxLength={20}
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  placeholder="e.g. Mega Discount 50%"
                  className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 h-9"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Deskripsi singkat coupon..."
                className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 min-h-[50px] resize-none text-sm"
                disabled={isSaving}
              />
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* ═══ Discount Config ═══ */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discount Config</p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Discount Type</Label>
              <div className="flex gap-2">
                {(['percentage', 'nominal'] as CouponDiscountType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => updateField('discountType', t)}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      form.discountType === t
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-muted-foreground hover:bg-accent/80'
                    )}
                  >
                    {t === 'percentage' ? <Percent className="w-3.5 h-3.5" /> : <Coins className="w-3.5 h-3.5" />}
                    {t === 'percentage' ? 'Percentage' : 'Nominal (Rp)'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Discount Value {form.discountType === 'percentage' ? '(%)' : '(Rp)'} *
                </Label>
                <Input
                  type="number"
                  value={form.discountValue}
                  onChange={e => updateField('discountValue', e.target.value)}
                  placeholder={form.discountType === 'percentage' ? '50' : '100000'}
                  className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 h-9"
                  disabled={isSaving}
                />
              </div>
              {form.discountType === 'percentage' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Max Discount (Rp)</Label>
                  <Input
                    type="number"
                    value={form.maxDiscount}
                    onChange={e => updateField('maxDiscount', e.target.value)}
                    placeholder="500000"
                    className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 h-9"
                    disabled={isSaving}
                  />
                </div>
              )}
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* ═══ Scope ═══ */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scope</p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Scope</Label>
              <div className="flex gap-2">
                {(['global', 'event'] as CouponScope[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => updateField('scope', s)}
                    disabled={isSaving}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      form.scope === s
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-muted-foreground hover:bg-accent/80'
                    )}
                  >
                    {s === 'global' ? <Globe className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                    {s === 'global' ? 'Global' : 'Per Event'}
                  </button>
                ))}
              </div>
            </div>
            {form.scope === 'event' && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Event *</Label>
                <Select value={form.eventId} onValueChange={v => updateField('eventId', v)} disabled={isSaving}>
                  <SelectTrigger className="bg-background border-primary/15 text-foreground h-9">
                    <SelectValue placeholder="Pilih event..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-primary/15">
                    {FALLBACK_EVENTS.map(evt => (
                      <SelectItem key={evt.id} value={evt.id} className="text-foreground">
                        {evt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Separator className="bg-primary/10" />

          {/* ═══ Category Configs ═══ */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Category Overrides
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                onClick={addCategoryConfig}
                disabled={isSaving}
              >
                <Plus className="w-3 h-3 mr-1" /> Add
              </Button>
            </div>
            {form.categoryConfigs.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic">No category overrides — global discount applies to all</p>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_100px_100px_32px] gap-2 text-[10px] text-muted-foreground uppercase tracking-wider font-semibold px-1">
                  <span>Category</span>
                  <span>Discount</span>
                  <span>Min Order</span>
                  <span />
                </div>
                {form.categoryConfigs.map((cfg, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_100px_100px_32px] gap-2 items-center">
                    <Select
                      value={cfg.category}
                      onValueChange={v => updateCategoryConfig(idx, 'category', v)}
                    >
                      <SelectTrigger className="bg-background border-primary/15 text-foreground h-8 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-primary/15">
                        {TICKET_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat} className="text-foreground text-xs">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      value={cfg.discountValue || ''}
                      onChange={e => updateCategoryConfig(idx, 'discountValue', Number(e.target.value))}
                      placeholder={form.discountType === 'percentage' ? '%' : 'Rp'}
                      className="bg-background border-primary/15 text-foreground h-8 text-xs"
                      disabled={isSaving}
                    />
                    <Input
                      type="number"
                      value={cfg.minOrder || ''}
                      onChange={e => updateCategoryConfig(idx, 'minOrder', Number(e.target.value))}
                      placeholder="Rp"
                      className="bg-background border-primary/15 text-foreground h-8 text-xs"
                      disabled={isSaving}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400/60 hover:text-red-400"
                      onClick={() => removeCategoryConfig(idx)}
                      disabled={isSaving}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="bg-primary/10" />

          {/* ═══ Usage Limits ═══ */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Usage Limits</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Usage Limit (total) *</Label>
                <Input
                  type="number"
                  value={form.usageLimit}
                  onChange={e => updateField('usageLimit', e.target.value)}
                  placeholder="100"
                  className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 h-9"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Usage Limit Per User *</Label>
                <Input
                  type="number"
                  value={form.usageLimitPerUser}
                  onChange={e => updateField('usageLimitPerUser', e.target.value)}
                  placeholder="1"
                  className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 h-9"
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          <Separator className="bg-primary/10" />

          {/* ═══ Schedule & Status ═══ */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Schedule & Status</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Start Date *</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={e => updateField('startsAt', e.target.value)}
                  className="bg-background border-primary/15 text-foreground h-9 text-sm"
                  disabled={isSaving}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Expiry Date *</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={e => updateField('expiresAt', e.target.value)}
                  className="bg-background border-primary/15 text-foreground h-9 text-sm"
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.status === 'active'}
                onCheckedChange={checked => updateField('status', checked ? 'active' : 'inactive')}
                disabled={isSaving}
              />
              <Label className="text-sm text-foreground">
                {form.status === 'active' ? 'Active' : 'Inactive'}
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isValid || isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                {editingCoupon ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingCoupon ? 'Update' : 'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── DELETE CONFIRMATION DIALOG ─────────────────────────────────────────────

function DeleteCouponDialog({
  coupon,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  coupon: ICoupon | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  isDeleting: boolean
}) {
  if (!coupon) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-primary/15 text-foreground max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-400" />
            Delete Coupon
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="p-3 rounded-lg bg-background border border-border space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Code</span>
            <span className="font-mono text-sm font-bold text-primary">{coupon.code}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Name</span>
            <span className="text-sm text-foreground">{coupon.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Usage</span>
            <span className="text-sm text-foreground">{coupon.usedCount} / {coupon.usageLimit}</span>
          </div>
        </div>
        {coupon.usedCount > 0 && (
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
            <p className="text-xs text-amber-400 font-medium">
              ⚠️ Coupon has been used {coupon.usedCount} times. Deleting will affect existing usage data.
            </p>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-muted-foreground" disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25"
          >
            {isDeleting ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Deleting...</>
            ) : (
              'Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function CouponPage() {
  const { isSuperAdmin, isOrganizer } = useScopedData()
  const { user } = useAuthStore()

  // Data state — loaded from API
  const [coupons, setCoupons] = useState<ICoupon[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Mutation loading states
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [scopeFilter, setScopeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<ICoupon | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ICoupon | null>(null)

  // ── Fetch coupons from API ──
  const fetchCoupons = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const params: Record<string, string> = {}
      // Pass server-side filters if available
      if (statusFilter !== 'all') params.status = statusFilter
      if (scopeFilter !== 'all') params.scope = scopeFilter

      const result = await couponApi.getCoupons(params) as PaginatedData<ICoupon>
      // couponApi returns PaginatedData which has { data, pagination }
      if (result && Array.isArray(result.data)) {
        setCoupons(result.data)
      } else if (Array.isArray(result)) {
        // Fallback if API returns raw array
        setCoupons(result as unknown as ICoupon[])
      } else {
        setCoupons([])
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat data coupon'
      setLoadError(message)
      toast.error('Gagal memuat data coupon', { description: message })
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, scopeFilter])

  // Initial load + refetch when filters change
  useEffect(() => {
    fetchCoupons()
  }, [fetchCoupons])

  // Filtered coupons (client-side search filter on top of API data)
  const filtered = useMemo(() => {
    return coupons.filter(c => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
      return matchSearch
    })
  }, [coupons, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Stats ──
  const totalCoupons = coupons.length
  const activeCoupons = coupons.filter(c => c.status === 'active').length
  const expiredCoupons = coupons.filter(c => c.status === 'expired').length
  const totalUsage = coupons.reduce((s, c) => s + c.usedCount, 0)

  const stats = [
    { label: 'Total Coupons', value: totalCoupons, icon: Tag, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active', value: activeCoupons, icon: CalendarDays, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Expired', value: expiredCoupons, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
    { label: 'Total Usage', value: totalUsage.toLocaleString('id-ID'), icon: Copy, color: 'text-gold', bg: 'bg-gold/10' },
  ]

  // ── CRUD Handlers ──
  const openCreate = () => {
    setEditingCoupon(null)
    setFormOpen(true)
  }

  const openEdit = (coupon: ICoupon) => {
    setEditingCoupon(coupon)
    setFormOpen(true)
  }

  const handleSave = async (formData: CouponFormData) => {
    setIsSaving(true)
    try {
      const couponData: Record<string, unknown> = {
        code: formData.code,
        name: formData.name,
        description: formData.description || undefined,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : undefined,
        scope: formData.scope,
        eventId: formData.scope === 'event' ? formData.eventId : undefined,
        categoryConfigs: formData.categoryConfigs.filter(cfg => cfg.category),
        usageLimit: Number(formData.usageLimit),
        usageLimitPerUser: Number(formData.usageLimitPerUser),
        startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : new Date().toISOString(),
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : new Date().toISOString(),
        status: formData.status,
        organizerId: user?.organizerId || '',
        tenantId: user?.tenantId || '',
      }

      if (editingCoupon) {
        // Update
        await couponApi.updateCoupon(editingCoupon.id, couponData)
        toast.success(`Coupon ${formData.code} berhasil diupdate`)
      } else {
        // Create
        await couponApi.createCoupon(couponData)
        toast.success(`Coupon ${formData.code} berhasil dibuat`)
      }

      setFormOpen(false)
      // Refetch data to get the latest from API
      await fetchCoupons()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menyimpan coupon'
      toast.error(editingCoupon ? 'Gagal mengupdate coupon' : 'Gagal membuat coupon', {
        description: message,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await couponApi.deleteCoupon(deleteTarget.id)
      toast.success(`Coupon ${deleteTarget.code} berhasil dihapus`)
      setDeleteTarget(null)
      // Refetch data
      await fetchCoupons()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal menghapus coupon'
      toast.error('Gagal menghapus coupon', { description: message })
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Loading skeleton ──
  if (isLoading && coupons.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-card border-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-lg" />
                  <div>
                    <Skeleton className="h-3 w-20 mb-1" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="bg-card border-primary/10">
          <CardContent className="p-4">
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
        <Card className="bg-card border-primary/10">
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="p-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-primary/5">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Tag className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {isOrganizer ? 'My Coupons' : 'Coupon Management'}
            </h2>
            <p className="text-muted-foreground text-xs">Kelola coupon diskon untuk event</p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
          disabled={isSaving}
        >
          <Plus className="w-4 h-4 mr-1" /> Create Coupon
        </Button>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-card border-primary/10 hover:border-primary/25 transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.bg)}>
                  <stat.icon className={cn('w-4 h-4', stat.color)} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
                  <p className={cn('text-lg font-bold truncate', stat.color)}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ FILTERS ═══ */}
      <Card className="bg-card border-primary/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kode atau nama coupon..."
                  className="bg-background border-primary/15 text-foreground placeholder:text-muted-foreground/50 pl-9 h-9"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                />
              </div>
            </div>
            <div className="w-full sm:w-40">
              <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="bg-background border-primary/15 text-foreground h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/15">
                  <SelectItem value="all" className="text-foreground">All Status</SelectItem>
                  <SelectItem value="active" className="text-foreground">Active</SelectItem>
                  <SelectItem value="inactive" className="text-foreground">Inactive</SelectItem>
                  <SelectItem value="expired" className="text-foreground">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-40">
              <Select value={scopeFilter} onValueChange={v => { setScopeFilter(v); setCurrentPage(1) }}>
                <SelectTrigger className="bg-background border-primary/15 text-foreground h-9">
                  <SelectValue placeholder="Scope" />
                </SelectTrigger>
                <SelectContent className="bg-card border-primary/15">
                  <SelectItem value="all" className="text-foreground">All Scope</SelectItem>
                  <SelectItem value="global" className="text-foreground">Global</SelectItem>
                  <SelectItem value="event" className="text-foreground">Per Event</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ ERROR STATE ═══ */}
      {loadError && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-400 font-medium">Gagal memuat data coupon</p>
                <p className="text-xs text-muted-foreground">{loadError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchCoupons} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                <Loader2 className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} /> Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ TABLE ═══ */}
      <Card className="bg-card border-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Daftar Coupon
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs mt-1">
                Menampilkan {filtered.length} coupon
              </CardDescription>
            </div>
            {isLoading && coupons.length > 0 && (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-primary/10 hover:bg-transparent">
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Code</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Name</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Type</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-right">Discount</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Scope</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Usage</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4">Status</TableHead>
                  <TableHead className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold h-10 px-4 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow className="border-primary/5">
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Tidak ada coupon ditemukan</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((coupon) => (
                    <TableRow key={coupon.id} className="border-primary/5 hover:bg-primary/5 transition-colors">
                      <TableCell className="px-4 py-3">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {coupon.code}
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <p className="text-sm text-foreground font-medium truncate max-w-[140px]">{coupon.name}</p>
                        {coupon.categoryConfigs.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">{coupon.categoryConfigs.length} category overrides</p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge variant="outline" className={cn(
                          'text-[10px] font-semibold',
                          coupon.discountType === 'percentage'
                            ? 'bg-primary/10 text-primary border-primary/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        )}>
                          {coupon.discountType === 'percentage' ? (
                            <><Percent className="w-2.5 h-2.5 mr-0.5" /> PCT</>
                          ) : (
                            <><Coins className="w-2.5 h-2.5 mr-0.5" /> IDR</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <span className="text-sm text-gold font-semibold">{formatDiscountValue(coupon)}</span>
                        {coupon.discountType === 'percentage' && coupon.maxDiscount && (
                          <p className="text-[10px] text-muted-foreground">max {formatRupiah(coupon.maxDiscount)}</p>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {getScopeBadge(coupon.scope)}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-sm text-foreground font-medium">
                            {coupon.usedCount}<span className="text-muted-foreground">/{coupon.usageLimit}</span>
                          </span>
                          <div className="w-16 h-1 bg-primary/10 rounded-full mt-1 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                coupon.usedCount >= coupon.usageLimit
                                  ? 'bg-red-400'
                                  : coupon.usedCount / coupon.usageLimit > 0.7
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                              )}
                              style={{ width: `${Math.min(100, (coupon.usedCount / coupon.usageLimit) * 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {getCouponStatusBadge(coupon.status)}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => openEdit(coupon)}
                            disabled={isSaving || isDeleting}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400/60 hover:text-red-400"
                            onClick={() => setDeleteTarget(coupon)}
                            disabled={isSaving || isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* ═══ PAGINATION ═══ */}
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10">
              <p className="text-xs text-muted-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-primary/15 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pn: number
                  if (totalPages <= 7) pn = i + 1
                  else if (safePage <= 4) pn = i + 1
                  else if (safePage >= totalPages - 3) pn = totalPages - 6 + i
                  else pn = safePage - 3 + i
                  return (
                    <Button
                      key={pn}
                      variant={safePage === pn ? 'default' : 'outline'}
                      size="sm"
                      className={cn(
                        'h-8 w-8 p-0 text-xs font-semibold',
                        safePage === pn
                          ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                          : 'border-primary/15 text-muted-foreground hover:text-foreground hover:bg-primary/10'
                      )}
                      onClick={() => setCurrentPage(pn)}
                    >
                      {pn}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 border-primary/15 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ DIALOGS ═══ */}
      <CouponFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingCoupon={editingCoupon}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteCouponDialog
        coupon={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  )
}
