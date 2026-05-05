'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit2, Trash2, Store } from 'lucide-react'

interface Counter {
  id: string
  name: string
  location: string
  status: 'active' | 'inactive' | 'closed'
  staffCount: number
}

const INITIAL_COUNTERS: Counter[] = [
  { id: 'c-1', name: 'Counter A', location: 'Lobby Utara', status: 'active', staffCount: 1 },
  { id: 'c-2', name: 'Counter B', location: 'Lobby Selatan', status: 'active', staffCount: 1 },
  { id: 'c-3', name: 'Counter C', location: 'Gate A', status: 'active', staffCount: 1 },
  { id: 'c-4', name: 'Counter D', location: 'Gate B', status: 'inactive', staffCount: 0 },
  { id: 'c-5', name: 'Counter E', location: 'Gate VIP', status: 'active', staffCount: 1 },
  { id: 'c-6', name: 'Counter F', location: 'Lobby Utara', status: 'active', staffCount: 1 },
  { id: 'c-7', name: 'Counter G', location: 'Festival Zone', status: 'active', staffCount: 1 },
  { id: 'c-8', name: 'Counter H', location: 'Gate C', status: 'closed', staffCount: 0 },
  { id: 'c-9', name: 'Counter I', location: 'Gate D', status: 'active', staffCount: 1 },
  { id: 'c-10', name: 'Counter J', location: 'Lobby Selatan', status: 'inactive', staffCount: 0 },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  inactive: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  closed: 'bg-red-500/15 text-red-400 border-red-500/20',
}

export default function MyCountersPage() {
  const [counters, setCounters] = useState<Counter[]>(INITIAL_COUNTERS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', location: '' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', location: '' })
    setDialogOpen(true)
  }

  const openEdit = (c: Counter) => {
    setEditingId(c.id)
    setForm({ name: c.name, location: c.location })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name || !form.location) return
    if (editingId) {
      setCounters(prev => prev.map(c => c.id === editingId ? { ...c, name: form.name, location: form.location } : c))
    } else {
      setCounters(prev => [...prev, { id: `c-${Date.now()}`, ...form, status: 'inactive', staffCount: 0 }])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setCounters(prev => prev.filter(c => c.id !== id))
    setDeleteId(null)
  }

  const activeCount = counters.filter(c => c.status === 'active').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Counters</h1>
          <p className="text-[#7FB3AE] mt-1">Kelola counter penukaran gelang</p>
        </div>
        <Button onClick={openCreate} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Counter
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Counters</p>
            <p className="text-xl font-bold text-white">{counters.length}</p>
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
            <p className="text-[11px] text-[#7FB3AE]">Total Staff</p>
            <p className="text-xl font-bold text-[#00A39D]">{counters.reduce((s, c) => s + c.staffCount, 0)}</p>
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
                  <TableHead className="text-[#7FB3AE]">Location</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Staff</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counters.map(c => (
                  <TableRow key={c.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="text-white font-medium flex items-center gap-2">
                      <Store className="w-4 h-4 text-[#00A39D]" />
                      {c.name}
                    </TableCell>
                    <TableCell className="text-[#7FB3AE]">{c.location}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[c.status]}>{c.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-white">{c.staffCount}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#7FB3AE] hover:text-white" onClick={() => openEdit(c)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60 hover:text-red-400" onClick={() => setDeleteId(c.id)}>
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
            <DialogTitle className="text-white">{editingId ? 'Edit Counter' : 'Add Counter'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Counter Name *</Label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Counter K" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Location *</Label>
              <Input value={form.location} onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g. Lobby Barat" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.location} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Counter?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7FB3AE]">This counter will be permanently removed.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 hover:bg-red-600 text-white">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
