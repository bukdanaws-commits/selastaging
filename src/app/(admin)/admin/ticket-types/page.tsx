'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit2, Trash2, Ticket } from 'lucide-react'
import { formatRupiah } from '@/lib/utils'

// ─── Mock Ticket Types ──────────────────────────────────────────────────────
const INITIAL_TICKET_TYPES = [
  { id: 'tt-1', name: 'VVIP PIT', price: 3500000, quota: 200, sold: 180, tier: 'floor', emoji: '👑', benefits: ['Meet & Greet', 'VIP Lounge', 'Free Merchandise'] },
  { id: 'tt-2', name: 'VIP ZONE', price: 2800000, quota: 500, sold: 420, tier: 'floor', emoji: '⭐', benefits: ['VIP Area Access', 'Free Drink'] },
  { id: 'tt-3', name: 'FESTIVAL', price: 2200000, quota: 1000, sold: 850, tier: 'floor', emoji: '🎫', benefits: ['Festival Area'] },
  { id: 'tt-4', name: 'CAT 1', price: 1750000, quota: 2000, sold: 1700, tier: 'tribun', emoji: '🎫', benefits: ['Tribun Category 1'] },
  { id: 'tt-5', name: 'CAT 2', price: 1400000, quota: 3000, sold: 2600, tier: 'tribun', emoji: '🎫', benefits: ['Tribun Category 2'] },
  { id: 'tt-6', name: 'CAT 3', price: 1100000, quota: 3000, sold: 2400, tier: 'tribun', emoji: '🎫', benefits: ['Tribun Category 3'] },
  { id: 'tt-7', name: 'CAT 4', price: 850000, quota: 3500, sold: 2200, tier: 'tribun', emoji: '🎫', benefits: ['Tribun Category 4'] },
  { id: 'tt-8', name: 'CAT 5', price: 550000, quota: 4200, sold: 2100, tier: 'tribun', emoji: '🎫', benefits: ['Tribun Category 5'] },
  { id: 'tt-9', name: 'CAT 6', price: 350000, quota: 3900, sold: 1400, tier: 'tribun', emoji: '🎫', benefits: ['Tribun Category 6'] },
]

interface TicketType {
  id: string
  name: string
  price: number
  quota: number
  sold: number
  tier: string
  emoji: string
  benefits: string[]
}

export default function TicketTypesPage() {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(INITIAL_TICKET_TYPES)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', price: '', quota: '', tier: 'floor', benefits: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', price: '', quota: '', tier: 'floor', benefits: '' })
    setDialogOpen(true)
  }

  const openEdit = (tt: TicketType) => {
    setEditingId(tt.id)
    setForm({
      name: tt.name,
      price: String(tt.price),
      quota: String(tt.quota),
      tier: tt.tier,
      benefits: tt.benefits.join('\n'),
    })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name || !form.price || !form.quota) return

    if (editingId) {
      setTicketTypes(prev =>
        prev.map(tt =>
          tt.id === editingId
            ? {
                ...tt,
                name: form.name,
                price: parseInt(form.price),
                quota: parseInt(form.quota),
                tier: form.tier,
                benefits: form.benefits.split('\n').filter(Boolean),
              }
            : tt
        )
      )
    } else {
      const newType: TicketType = {
        id: `tt-${Date.now()}`,
        name: form.name,
        price: parseInt(form.price),
        quota: parseInt(form.quota),
        sold: 0,
        tier: form.tier,
        emoji: '🎫',
        benefits: form.benefits.split('\n').filter(Boolean),
      }
      setTicketTypes(prev => [...prev, newType])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setTicketTypes(prev => prev.filter(tt => tt.id !== id))
    setDeleteId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ticket Types</h1>
          <p className="text-muted-foreground mt-1">Kelola tipe tiket event kamu</p>
        </div>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-foreground">
          <Plus className="w-4 h-4 mr-1" /> Add Type
        </Button>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground text-right">Price</TableHead>
                  <TableHead className="text-muted-foreground text-right">Quota</TableHead>
                  <TableHead className="text-muted-foreground text-right">Sold</TableHead>
                  <TableHead className="text-muted-foreground text-right">Available</TableHead>
                  <TableHead className="text-muted-foreground">Tier</TableHead>
                  <TableHead className="text-muted-foreground">Benefits</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketTypes.map((tt) => {
                  const available = tt.quota - tt.sold
                  const pct = tt.quota > 0 ? (tt.sold / tt.quota) * 100 : 0
                  return (
                    <TableRow key={tt.id} className="border-border hover:bg-accent/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{tt.emoji}</span>
                          <span className="text-foreground font-medium">{tt.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-foreground font-semibold">
                        {formatRupiah(tt.price)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{tt.quota.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right text-foreground">{tt.sold.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right">
                        <span className={available < 100 ? 'text-red-400 font-medium' : 'text-emerald-400'}>
                          {available.toLocaleString('id-ID')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={tt.tier === 'floor' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-purple-500/15 text-purple-400 border-purple-500/20'}>
                          {tt.tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px] truncate">
                          {tt.benefits.slice(0, 2).map((b, i) => (
                            <span key={i} className="text-xs text-muted-foreground block truncate">{b}</span>
                          ))}
                          {tt.benefits.length > 2 && <span className="text-xs text-foreground/40">+{tt.benefits.length - 2} more</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(tt)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60 hover:text-red-400" onClick={() => setDeleteId(tt.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">Total Types</p>
            <p className="text-xl font-bold text-foreground">{ticketTypes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">Total Quota</p>
            <p className="text-xl font-bold text-foreground">{ticketTypes.reduce((s, t) => s + t.quota, 0).toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">Total Sold</p>
            <p className="text-xl font-bold text-primary">{ticketTypes.reduce((s, t) => s + t.sold, 0).toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-muted-foreground">Revenue</p>
            <p className="text-xl font-bold text-amber-400">{formatRupiah(ticketTypes.reduce((s, t) => s + t.price * t.sold, 0))}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-input text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingId ? 'Edit Ticket Type' : 'Add Ticket Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Name *</Label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. VVIP PIT" className="bg-background border-input text-foreground placeholder:text-muted-foreground/50" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Price (IDR) *</Label>
                <Input type="number" value={form.price} onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))} placeholder="3500000" className="bg-background border-input text-foreground placeholder:text-muted-foreground/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Quota *</Label>
                <Input type="number" value={form.quota} onChange={e => setForm(prev => ({ ...prev, quota: e.target.value }))} placeholder="200" className="bg-background border-input text-foreground placeholder:text-muted-foreground/50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Tier</Label>
              <div className="flex gap-2">
                {['floor', 'tribun'].map(t => (
                  <button key={t} onClick={() => setForm(prev => ({ ...prev, tier: t }))} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${form.tier === t ? 'bg-primary text-foreground' : 'bg-accent text-muted-foreground hover:bg-accent'}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Benefits (one per line)</Label>
              <Textarea value={form.benefits} onChange={e => setForm(prev => ({ ...prev, benefits: e.target.value }))} placeholder="Meet & Greet&#10;VIP Lounge&#10;Free Merchandise" className="bg-background border-input text-foreground placeholder:text-muted-foreground/50 min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-muted-foreground">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.price || !form.quota} className="bg-primary hover:bg-primary/90 text-foreground">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-card border-input text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Delete Ticket Type?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-muted-foreground">Cancel</Button>
            <Button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 hover:bg-red-600 text-foreground">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
