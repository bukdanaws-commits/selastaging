'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, MapPin, Edit2, Save, X, Plus, ImageIcon } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'

// ─── Mock event data (in production, fetched via useOrganizerEvent hook) ──────
const MOCK_EVENT = {
  id: 'evt-001',
  title: 'Sheila On 7 — Melompat Lebih Tinggi',
  slug: 'sheila-on-7-melompat-lebih-tinggi',
  description: 'Konser spesial Sheila On 7 dalam rangka tur "Melompat Lebih Tinggi" di Jakarta.',
  date: '2025-06-22',
  time: '19:00',
  venue: 'GBK Madya',
  city: 'Jakarta',
  address: 'Jl. Gerbang Pemuda, Senayan, Tanah Abang, Jakarta Pusat',
  posterUrl: '/images/poster-placeholder.png',
  status: 'published' as 'draft' | 'pending_approval' | 'published' | 'completed',
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'DRAFT', className: 'bg-gray-500/15 text-gray-400 border-gray-500/20' },
  pending_approval: { label: 'PENDING APPROVAL', className: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  published: { label: 'PUBLISHED', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  completed: { label: 'COMPLETED', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
}

interface EventFormData {
  title: string
  slug: string
  description: string
  date: string
  time: string
  venue: string
  city: string
  address: string
  posterUrl: string
}

const EMPTY_FORM: EventFormData = {
  title: '',
  slug: '',
  description: '',
  date: '',
  time: '',
  venue: '',
  city: '',
  address: '',
  posterUrl: '',
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function MyEventPage() {
  const [hasEvent, setHasEvent] = useState(true) // Toggle for demo
  const [event] = useState(MOCK_EVENT)
  const [isEditing, setIsEditing] = useState(false)
  const [form, setForm] = useState<EventFormData>({
    title: event.title,
    slug: event.slug,
    description: event.description,
    date: event.date,
    time: event.time,
    venue: event.venue,
    city: event.city,
    address: event.address,
    posterUrl: event.posterUrl,
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleFieldChange = (field: keyof EventFormData, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'title') {
        updated.slug = generateSlug(value)
      }
      return updated
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsLoading(false)
    setIsEditing(false)
  }

  // ─── Create Event (no active event) ────────────────────────────────────────
  if (!hasEvent) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Event</h1>
          <p className="text-[#7FB3AE] mt-1">Buat event baru untuk mulai menjual tiket</p>
        </div>

        <Card className="bg-[#111918] border-white/5">
          <CardHeader className="pb-4">
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00A39D]" />
              Create Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Event Name *</Label>
                <Input
                  placeholder="e.g. Sheila On 7 Concert"
                  value={form.title}
                  onChange={e => handleFieldChange('title', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Slug</Label>
                <Input
                  placeholder="auto-generated-slug"
                  value={form.slug}
                  readOnly
                  className="bg-[#0A0F0E]/60 border-white/10 text-white/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Description</Label>
              <Textarea
                placeholder="Deskripsi event..."
                value={form.description}
                onChange={e => handleFieldChange('description', e.target.value)}
                className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30 min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#7FB3AE] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Date *
                </Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => handleFieldChange('date', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Time *
                </Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => handleFieldChange('time', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#7FB3AE] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Venue *
                </Label>
                <Input
                  placeholder="e.g. GBK Madya"
                  value={form.venue}
                  onChange={e => handleFieldChange('venue', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">City *</Label>
                <Input
                  placeholder="e.g. Jakarta"
                  value={form.city}
                  onChange={e => handleFieldChange('city', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Address</Label>
              <Input
                placeholder="Full address"
                value={form.address}
                onChange={e => handleFieldChange('address', e.target.value)}
                className="bg-[#0A0F0E] border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Poster Image</Label>
              <div className="border-2 border-dashed border-white/10 rounded-lg p-8 text-center hover:border-[#00A39D]/30 transition-colors cursor-pointer">
                <ImageIcon className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-sm text-[#7FB3AE]">Click to upload poster</p>
                <p className="text-xs text-white/30 mt-1">PNG, JPG, max 5MB</p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={() => { setIsLoading(true); setTimeout(() => { setIsLoading(false); setHasEvent(true); }, 500) }}
                disabled={isLoading || !form.title || !form.date || !form.venue || !form.city}
                className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white"
              >
                {isLoading ? 'Saving...' : 'Create Event as Draft'}
              </Button>
              <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/20">
                Status: DRAFT
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Event Detail View ────────────────────────────────────────────────────
  const statusConfig = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.draft

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">My Event</h1>
          <p className="text-[#7FB3AE] mt-1">Kelola event kamu</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
        </div>
      </div>

      {!isEditing ? (
        <Card className="bg-[#111918] border-white/5">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">{event.title}</h2>
                <p className="text-sm text-[#7FB3AE] font-mono mt-1">/{event.slug}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-[#00A39D]/30 text-[#00A39D] hover:bg-[#00A39D]/10"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            </div>

            <p className="text-sm text-white/70">{event.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-[#00A39D]" />
                <span className="text-[#7FB3AE]">{formatDateTime(`${event.date}T${event.time}:00`)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-[#00A39D]" />
                <span className="text-[#7FB3AE]">{event.venue}, {event.city}</span>
              </div>
              <div className="flex items-center gap-2 text-sm sm:col-span-2">
                <MapPin className="w-4 h-4 text-[#00A39D]" />
                <span className="text-white/60">{event.address}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#111918] border-white/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#00A39D]" />
                Edit Event
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="text-[#7FB3AE] hover:text-white">
                  <X className="w-4 h-4 mr-1" /> Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-[#00A39D] hover:bg-[#00A39D]/90 text-white"
                >
                  <Save className="w-4 h-4 mr-1" /> {isLoading ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Event Name *</Label>
                <Input
                  value={form.title}
                  onChange={e => handleFieldChange('title', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Slug</Label>
                <Input
                  value={form.slug}
                  readOnly
                  className="bg-[#0A0F0E]/60 border-white/10 text-white/50"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[#7FB3AE]">Description</Label>
              <Textarea
                value={form.description}
                onChange={e => handleFieldChange('description', e.target.value)}
                className="bg-[#0A0F0E] border-white/10 text-white min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => handleFieldChange('date', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Time</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => handleFieldChange('time', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Venue</Label>
                <Input
                  value={form.venue}
                  onChange={e => handleFieldChange('venue', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">City</Label>
                <Input
                  value={form.city}
                  onChange={e => handleFieldChange('city', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#7FB3AE]">Address</Label>
                <Input
                  value={form.address}
                  onChange={e => handleFieldChange('address', e.target.value)}
                  className="bg-[#0A0F0E] border-white/10 text-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
