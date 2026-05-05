'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit2, Trash2, LayoutGrid, Eye } from 'lucide-react'

// ─── Mock Sections ──────────────────────────────────────────────────────────
interface Section {
  id: string
  name: string
  capacity: number
  tier: string
  description: string
}

const INITIAL_SECTIONS: Section[] = [
  { id: 's-1', name: 'VVIP PIT', capacity: 200, tier: 'floor', description: 'Very VIP area near stage' },
  { id: 's-2', name: 'VIP Zone', capacity: 500, tier: 'floor', description: 'VIP area in front' },
  { id: 's-3', name: 'Festival A', capacity: 500, tier: 'floor', description: 'Festival standing area A' },
  { id: 's-4', name: 'Festival B', capacity: 500, tier: 'floor', description: 'Festival standing area B' },
  { id: 's-5', name: 'Tribun A', capacity: 2000, tier: 'tribun', description: 'Category 1 tribune' },
  { id: 's-6', name: 'Tribun B', capacity: 3000, tier: 'tribun', description: 'Category 2 tribune' },
  { id: 's-7', name: 'Tribun C', capacity: 3000, tier: 'tribun', description: 'Category 3 tribune' },
  { id: 's-8', name: 'Tribun D', capacity: 3500, tier: 'tribun', description: 'Category 4 tribune' },
  { id: 's-9', name: 'Tribun E', capacity: 4200, tier: 'tribun', description: 'Category 5 tribune' },
  { id: 's-10', name: 'Tribun F', capacity: 3900, tier: 'tribun', description: 'Category 6 tribune' },
]

export default function SeatLayoutPage() {
  const [sections, setSections] = useState<Section[]>(INITIAL_SECTIONS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', capacity: '', tier: 'tribun', description: '' })
  const [showMap, setShowMap] = useState(false)

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', capacity: '', tier: 'tribun', description: '' })
    setDialogOpen(true)
  }

  const openEdit = (s: Section) => {
    setEditingId(s.id)
    setForm({ name: s.name, capacity: String(s.capacity), tier: s.tier, description: s.description })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name || !form.capacity) return
    if (editingId) {
      setSections(prev => prev.map(s => s.id === editingId ? { ...s, name: form.name, capacity: parseInt(form.capacity), tier: form.tier, description: form.description } : s))
    } else {
      setSections(prev => [...prev, { id: `s-${Date.now()}`, name: form.name, capacity: parseInt(form.capacity), tier: form.tier, description: form.description }])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setSections(prev => prev.filter(s => s.id !== id))
  }

  const totalCapacity = sections.reduce((s, sec) => s + sec.capacity, 0)
  const floorCount = sections.filter(s => s.tier === 'floor').length
  const tribunCount = sections.filter(s => s.tier === 'tribun').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Seat Layout</h1>
          <p className="text-[#7FB3AE] mt-1">Konfigurasi layout kursi & section venue</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="border-[#00A39D]/30 text-[#00A39D] hover:bg-[#00A39D]/10" onClick={() => setShowMap(!showMap)}>
            <Eye className="w-4 h-4 mr-1" /> {showMap ? 'List View' : 'Visual Map'}
          </Button>
          <Button onClick={openCreate} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
            <Plus className="w-4 h-4 mr-1" /> Add Section
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Sections</p>
            <p className="text-xl font-bold text-white">{sections.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Capacity</p>
            <p className="text-xl font-bold text-[#00A39D]">{totalCapacity.toLocaleString('id-ID')}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Floor / Tribun</p>
            <p className="text-xl font-bold text-white">{floorCount} / {tribunCount}</p>
          </CardContent>
        </Card>
      </div>

      {!showMap ? (
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[#7FB3AE]">Section</TableHead>
                    <TableHead className="text-[#7FB3AE] text-right">Capacity</TableHead>
                    <TableHead className="text-[#7FB3AE]">Tier</TableHead>
                    <TableHead className="text-[#7FB3AE]">Description</TableHead>
                    <TableHead className="text-[#7FB3AE] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((sec) => (
                    <TableRow key={sec.id} className="border-white/5 hover:bg-white/[0.02]">
                      <TableCell className="text-white font-medium">{sec.name}</TableCell>
                      <TableCell className="text-right text-white">{sec.capacity.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <Badge className={sec.tier === 'floor' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-purple-500/15 text-purple-400 border-purple-500/20'}>
                          {sec.tier.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#7FB3AE] text-sm">{sec.description}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#7FB3AE] hover:text-white" onClick={() => openEdit(sec)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60 hover:text-red-400" onClick={() => handleDelete(sec.id)}>
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
      ) : (
        /* Placeholder Visual Map */
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              {/* Stage */}
              <div className="w-full max-w-2xl bg-gradient-to-r from-amber-500/20 to-amber-500/10 border border-amber-500/20 rounded-t-2xl px-6 py-4 text-center">
                <p className="text-amber-400 font-bold text-sm uppercase tracking-wider">STAGE</p>
              </div>
              {/* Floor Sections */}
              <div className="w-full max-w-2xl grid grid-cols-4 gap-2">
                {sections.filter(s => s.tier === 'floor').map(sec => (
                  <div key={sec.id} className="bg-[#00A39D]/10 border border-[#00A39D]/20 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-[#7FB3AE] uppercase">{sec.tier}</p>
                    <p className="text-sm font-medium text-white">{sec.name}</p>
                    <p className="text-xs text-[#7FB3AE]">{sec.capacity.toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
              {/* Tribun Sections */}
              <div className="w-full max-w-2xl grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {sections.filter(s => s.tier === 'tribun').map(sec => (
                  <div key={sec.id} className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-[#7FB3AE] uppercase">{sec.tier}</p>
                    <p className="text-sm font-medium text-white">{sec.name}</p>
                    <p className="text-xs text-[#7FB3AE]">{sec.capacity.toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-2">Visual seat map — placeholder for interactive editor</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? 'Edit Section' : 'Add Section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Section Name *</Label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Tribun A" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Capacity *</Label>
                <Input type="number" value={form.capacity} onChange={e => setForm(prev => ({ ...prev, capacity: e.target.value }))} placeholder="2000" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Tier</Label>
                <div className="flex gap-2">
                  {['floor', 'tribun'].map(t => (
                    <button key={t} onClick={() => setForm(prev => ({ ...prev, tier: t }))} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${form.tier === t ? 'bg-[#00A39D] text-white' : 'bg-white/5 text-[#7FB3AE] hover:bg-white/10'}`}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Description</Label>
              <Input value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Section description" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.capacity} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
              {editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
