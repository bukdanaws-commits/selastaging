'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit2, Trash2, DoorOpen } from 'lucide-react'

interface Gate {
  id: string
  name: string
  type: 'entry' | 'exit' | 'both'
  capacityPerMin: number
  status: 'active' | 'inactive' | 'closed'
  staffCount: number
}

const INITIAL_GATES: Gate[] = [
  { id: 'g-1', name: 'Gate Utara', type: 'entry', capacityPerMin: 40, status: 'active', staffCount: 1 },
  { id: 'g-2', name: 'Gate Selatan', type: 'entry', capacityPerMin: 35, status: 'active', staffCount: 1 },
  { id: 'g-3', name: 'Gate Timur', type: 'entry', capacityPerMin: 30, status: 'active', staffCount: 1 },
  { id: 'g-4', name: 'Gate Barat', type: 'exit', capacityPerMin: 40, status: 'active', staffCount: 1 },
  { id: 'g-5', name: 'Gate VIP', type: 'entry', capacityPerMin: 15, status: 'active', staffCount: 1 },
  { id: 'g-6', name: 'Gate Festival', type: 'entry', capacityPerMin: 25, status: 'active', staffCount: 1 },
  { id: 'g-7', name: 'Gate Tribun A', type: 'entry', capacityPerMin: 30, status: 'active', staffCount: 1 },
  { id: 'g-8', name: 'Gate Tribun B', type: 'both', capacityPerMin: 20, status: 'active', staffCount: 1 },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  closed: 'bg-red-500/15 text-red-400 border-red-500/20',
}

const TYPE_COLORS: Record<string, string> = {
  entry: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  exit: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  both: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
}

export default function MyGatesPage() {
  const [gates, setGates] = useState<Gate[]>(INITIAL_GATES)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'entry' as 'entry' | 'exit' | 'both', capacityPerMin: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', type: 'entry', capacityPerMin: '' })
    setDialogOpen(true)
  }

  const openEdit = (g: Gate) => {
    setEditingId(g.id)
    setForm({ name: g.name, type: g.type, capacityPerMin: String(g.capacityPerMin) })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name || !form.capacityPerMin) return
    if (editingId) {
      setGates(prev => prev.map(g => g.id === editingId ? { ...g, name: form.name, type: form.type, capacityPerMin: parseInt(form.capacityPerMin) } : g))
    } else {
      setGates(prev => [...prev, { id: `g-${Date.now()}`, ...form, capacityPerMin: parseInt(form.capacityPerMin), status: 'inactive', staffCount: 0 }])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setGates(prev => prev.filter(g => g.id !== id))
    setDeleteId(null)
  }

  const activeCount = gates.filter(g => g.status === 'active').length
  const totalCapacity = gates.reduce((s, g) => s + g.capacityPerMin, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Gates</h1>
          <p className="text-[#7FB3AE] mt-1">Kelola gate masuk & keluar</p>
        </div>
        <Button onClick={openCreate} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Gate
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Gates</p>
            <p className="text-xl font-bold text-white">{gates.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Active</p>
            <p className="text-xl font-bold text-emerald-400">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Capacity</p>
            <p className="text-xl font-bold text-[#00A39D]">{totalCapacity}/min</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#111918] border-white/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-[#7FB3AE]">Name</TableHead>
                  <TableHead className="text-[#7FB3AE]">Type</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Capacity/min</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Staff</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gates.map(g => (
                  <TableRow key={g.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="text-white font-medium flex items-center gap-2">
                      <DoorOpen className="w-4 h-4 text-[#00A39D]" />
                      {g.name}
                    </TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[g.type]}>{g.type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-white">{g.capacityPerMin}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[g.status]}>{g.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-white">{g.staffCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#7FB3AE] hover:text-white" onClick={() => openEdit(g)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60 hover:text-red-400" onClick={() => setDeleteId(g.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? 'Edit Gate' : 'Add Gate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Gate Name *</Label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Gate Barat" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Type</Label>
              <div className="flex gap-2">
                {(['entry', 'exit', 'both'] as const).map(t => (
                  <button key={t} onClick={() => setForm(prev => ({ ...prev, type: t }))} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${form.type === t ? 'bg-[#00A39D] text-white' : 'bg-white/5 text-[#7FB3AE] hover:bg-white/10'}`}>
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Capacity (per min) *</Label>
              <Input type="number" value={form.capacityPerMin} onChange={e => setForm(prev => ({ ...prev, capacityPerMin: e.target.value }))} placeholder="30" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.capacityPerMin} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Gate?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7FB3AE]">This gate will be permanently removed.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 hover:bg-red-600 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
