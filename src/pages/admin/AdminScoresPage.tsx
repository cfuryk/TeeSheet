import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { golferScoreService } from '@/services/golferScoreService'
import { Spinner, Card, Button, Input } from '@/components/ui'
import { formatDate, formatHandicap } from '@/lib/formatters'
import type { GolferScore } from '@/types'

export function AdminScoresPage() {
  const navigate = useNavigate()
  const [scores, setScores] = useState<GolferScore[]>([])
  const [loading, setLoading] = useState(true)
  const [filterName, setFilterName] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editGross, setEditGross] = useState('')
  const [editNet, setEditNet] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    return golferScoreService.onAllScoresSnapshot((s) => {
      setScores(s)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return scores.filter((s) => {
      if (filterName && !s.golferName.toLowerCase().includes(filterName.toLowerCase())) return false
      if (filterCourse && !s.courseName.toLowerCase().includes(filterCourse.toLowerCase())) return false
      if (filterDate) {
        const scoreDate = s.date.toDate().toISOString().slice(0, 10)
        if (scoreDate !== filterDate) return false
      }
      return true
    })
  }, [scores, filterName, filterCourse, filterDate])

  function startEdit(s: GolferScore) {
    setEditingId(s.scoreId)
    setEditGross(String(s.grossScore))
    setEditNet(s.netScore != null ? String(s.netScore) : '')
  }

  async function handleSave(s: GolferScore) {
    const gross = parseInt(editGross)
    if (isNaN(gross)) return
    const net = editNet !== '' ? parseInt(editNet) : null
    setSaving(true)
    await golferScoreService.updateScore(s.scoreId, {
      grossScore: gross,
      netScore: net,
    })
    setSaving(false)
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-brand">Admin Scores</h2>
        <Button variant="primary" size="sm" onClick={() => navigate('/admin')}>Back</Button>
      </div>

      {/* Filters */}
      <Card className="p-4 flex flex-col gap-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Filters</p>
        <div className="grid grid-cols-1 gap-3">
          <Input
            placeholder="Golfer name"
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
          />
          <Input
            placeholder="Course name"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          />
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
        {(filterName || filterCourse || filterDate) && (
          <button
            className="text-xs text-muted hover:text-brand text-left"
            onClick={() => { setFilterName(''); setFilterCourse(''); setFilterDate('') }}
          >
            Clear filters
          </button>
        )}
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted">No scores found.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((s) => (
            <Card key={s.scoreId} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 mr-3">
                  <p className="font-semibold text-brand truncate">{s.golferName}</p>
                  <p className="text-sm text-muted truncate">{s.courseName} — {s.teeName}</p>
                  <p className="text-xs text-muted">{formatDate(s.date)}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {editingId === s.scoreId ? (
                    <div className="flex flex-col gap-2 items-end">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Gross</span>
                        <Input
                          type="number"
                          value={editGross}
                          onChange={(e) => setEditGross(e.target.value)}
                          className="w-20 py-1 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted">Net</span>
                        <Input
                          type="number"
                          value={editNet}
                          onChange={(e) => setEditNet(e.target.value)}
                          className="w-20 py-1 text-sm"
                          placeholder="—"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" loading={saving} onClick={() => handleSave(s)}>Save</Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="text-2xl font-bold text-brand">{s.grossScore}</span>
                      {s.netScore != null && <span className="text-sm text-muted">Net {s.netScore}</span>}
                      <Button size="sm" variant="secondary" onClick={() => startEdit(s)}>Edit</Button>
                    </>
                  )}
                </div>
              </div>
              <div className="pt-2 border-t border-card-border flex items-center gap-3">
                <p className="text-xs text-muted">
                  Differential: <span className="text-brand">{formatHandicap(s.differential)}</span>
                </p>
                <p className="text-xs text-muted capitalize">{s.source}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
