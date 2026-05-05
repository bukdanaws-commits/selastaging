'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Edit2, Trash2, Users, UserPlus } from 'lucide-react'
import { formatDateTimeShort } from '@/lib/utils'

interface Staff {
  id: string
  name: string
  email: string
  phone: string
  role: 'Counter' | 'Gate'
  status: 'active' | 'inactive'
  assignedTo: string
}

const INITIAL_STAFF: Staff[] = [
  { id: 'st-1', name: 'Rizky Aditya', email: 'rizky@seleevent.com', phone: '081234567891', role: 'Counter', status: 'active', assignedTo: 'Counter A' },
  { id: 'st-2', name: 'Dina Safitri', email: 'dina@seleevent.com', phone: '081234567892', role: 'Counter', status: 'active', assignedTo: 'Counter B' },
  { id: 'st-3', name: 'Hendra Wijaya', email: 'hendra@seleevent.com', phone: '081234567893', role: 'Gate', status: 'active', assignedTo: 'Gate Utara' },
  { id: 'st-4', name: 'Lina Marlina', email: 'lina@seleevent.com', phone: '081234567894', role: 'Counter', status: 'active', assignedTo: 'Counter C' },
  { id: 'st-5', name: 'Agus Setiawan', email: 'agus@seleevent.com', phone: '081234567895', role: 'Gate', status: 'active', assignedTo: 'Gate Selatan' },
  { id: 'st-6', name: 'Rina Wati', email: 'rina@seleevent.com', phone: '081234567896', role: 'Counter', status: 'inactive', assignedTo: 'Counter D' },
  { id: 'st-7', name: 'Firmansyah', email: 'firma@seleevent.com', phone: '081234567897', role: 'Gate', status: 'active', assignedTo: 'Gate VIP' },
  { id: 'st-8', name: 'Nurul Aini', email: 'nurul@seleevent.com', phone: '081234567898', role: 'Counter', status: 'active', assignedTo: 'Counter E' },
  { id: 'st-9', name: 'Bayu Pratama', email: 'bayu@seleevent.com', phone: '081234567899', role: 'Gate', status: 'active', assignedTo: 'Gate Timur' },
  { id: 'st-10', name: 'Citra Dewi', email: 'citra@seleevent.com', phone: '081234567800', role: 'Counter', status: 'inactive', assignedTo: 'Counter F' },
]

export default function MyStaffPage() {
  const [staff, setStaff] = useState<Staff[]>(INITIAL_STAFF)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', role: 'Counter' as 'Counter' | 'Gate' })
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const openCreate = () => {
    setEditingId(null)
    setForm({ name: '', email: '', phone: '', role: 'Counter' })
    setDialogOpen(true)
  }

  const openEdit = (s: Staff) => {
    setEditingId(s.id)
    setForm({ name: s.name, email: s.email, phone: s.phone, role: s.role })
    setDialogOpen(true)
  }

  const handleSave = () => {
    if (!form.name || !form.email || !form.phone) return
    if (editingId) {
      setStaff(prev => prev.map(s => s.id === editingId ? { ...s, name: form.name, email: form.email, phone: form.phone, role: form.role } : s))
    } else {
      setStaff(prev => [...prev, { id: `st-${Date.now()}`, ...form, status: 'active', assignedTo: 'Unassigned' }])
    }
    setDialogOpen(false)
  }

  const handleDelete = (id: string) => {
    setStaff(prev => prev.filter(s => s.id !== id))
    setDeleteId(null)
  }

  const activeCount = staff.filter(s => s.status === 'active').length
  const counterCount = staff.filter(s => s.role === 'Counter').length
  const gateCount = staff.filter(s => s.role === 'Gate').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Staff</h1>
          <p className="text-[#7FB3AE] mt-1">Kelola staff counter & gate</p>
        </div>
        <Button onClick={openCreate} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
          <UserPlus className="w-4 h-4 mr-1" /> Add Staff
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Total Staff</p>
            <p className="text-xl font-bold text-white">{staff.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Counter Staff</p>
            <p className="text-xl font-bold text-[#00A39D]">{counterCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-4 text-center">
            <p className="text-[11px] text-[#7FB3AE]">Gate Staff</p>
            <p className="text-xl font-bold text-amber-400">{gateCount}</p>
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
                  <TableHead className="text-[#7FB3AE]">Email</TableHead>
                  <TableHead className="text-[#7FB3AE]">Phone</TableHead>
                  <TableHead className="text-[#7FB3AE]">Role</TableHead>
                  <TableHead className="text-[#7FB3AE]">Status</TableHead>
                  <TableHead className="text-[#7FB3AE]">Assigned To</TableHead>
                  <TableHead className="text-[#7FB3AE] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map(s => (
                  <TableRow key={s.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell className="text-white font-medium">{s.name}</TableCell>
                    <TableCell className="text-[#7FB3AE] text-sm">{s.email}</TableCell>
                    <TableCell className="text-[#7FB3AE] text-sm">{s.phone}</TableCell>
                    <TableCell>
                      <Badge className={s.role === 'Counter'
                        ? 'bg-[#00A39D]/15 text-[#00A39D] border-[#00A39D]/20'
                        : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                      }>
                        {s.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={s.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                        : 'bg-gray-500/15 text-gray-400 border-gray-500/20'
                      }>
                        {s.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#7FB3AE] text-sm">{s.assignedTo}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#7FB3AE] hover:text-white" onClick={() => openEdit(s)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60 hover:text-red-400" onClick={() => setDeleteId(s.id)}>
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">{editingId ? 'Edit Staff' : 'Add Staff'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Name *</Label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Full name" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="email@example.com" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Phone *</Label>
              <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="08xxxxxxxxxx" className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Role</Label>
              <div className="flex gap-2">
                {(['Counter', 'Gate'] as const).map(r => (
                  <button key={r} onClick={() => setForm(prev => ({ ...prev, role: r }))} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${form.role === r ? 'bg-[#00A39D] text-white' : 'bg-white/5 text-[#7FB3AE] hover:bg-white/10'}`}>
                    {r === 'Counter' ? '🛒' : '🚪'} {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name || !form.email || !form.phone} className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white">
              {editingId ? 'Update' : 'Add Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#111918] border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Remove Staff?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[#7FB3AE]">This staff member will be removed from the event.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-[#7FB3AE]">Cancel</Button>
            <Button onClick={() => deleteId && handleDelete(deleteId)} className="bg-red-500 hover:bg-red-600 text-white">Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
