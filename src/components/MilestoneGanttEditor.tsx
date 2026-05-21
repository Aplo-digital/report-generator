import { useState, useRef, useCallback, useEffect } from 'react'
import { GripVertical, Trash2, Plus } from 'lucide-react'
import type { MilestoneDef } from '../types'
import { uid } from '../utils'

const CELL_W = 80
const ROW_H = 52
const NAME_W = 228
const HEADER_H = 40

const TEAL = '#0d9488'
const GHOST_COLOR = '#6b7280'

const colorFor = () => TEAL

type DragOp =
  | { kind: 'create'; id: string; anchor: number; current: number }
  | { kind: 'move'; id: string; dur: number; anchorOffset: number }
  | { kind: 'resize-start'; id: string; endWeek: number }
  | { kind: 'resize-end'; id: string; startWeek: number }

interface Props {
  milestones: MilestoneDef[]
  onChange: (milestones: MilestoneDef[]) => void
}

export function MilestoneGanttEditor({ milestones, onChange }: Props) {
  const [drag, setDrag] = useState<DragOp | null>(null)
  const [ghostRow, setGhostRow] = useState<{ id: string; week: number } | null>(null)
  const [rowDrag, setRowDrag] = useState<{ from: number; over: number } | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const maxWeek = milestones.reduce((m, ms) => Math.max(m, ms.endWeek ?? 0), 0)
  const numCols = Math.max(maxWeek + 5, 14)

  const xToWeek = (clientX: number) => {
    const rect = scrollRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0
    const x = clientX - rect.left + scrollLeft - NAME_W
    return Math.floor(Math.max(0, x) / CELL_W)
  }

  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!drag) return
      const week = xToWeek(e.clientX)

      if (drag.kind === 'create') {
        setDrag((d) => (d?.kind === 'create' ? { ...d, current: week } : d))
      } else if (drag.kind === 'move') {
        const newStart = Math.max(0, week - drag.anchorOffset)
        onChange(
          milestones.map((m) =>
            m.id === drag.id ? { ...m, startWeek: newStart, endWeek: newStart + drag.dur } : m,
          ),
        )
      } else if (drag.kind === 'resize-start') {
        const newStart = Math.max(0, Math.min(week, drag.endWeek - 1))
        onChange(milestones.map((m) => (m.id === drag.id ? { ...m, startWeek: newStart } : m)))
      } else if (drag.kind === 'resize-end') {
        const newEnd = Math.max(drag.startWeek + 1, week + 1)
        onChange(milestones.map((m) => (m.id === drag.id ? { ...m, endWeek: newEnd } : m)))
      }
    },
    [drag, milestones, onChange],
  )

  const handleWindowMouseUp = useCallback(
    (e: MouseEvent) => {
      if (drag?.kind === 'create') {
        const week = xToWeek(e.clientX)
        const start = Math.min(drag.anchor, week)
        const end = Math.max(drag.anchor, week) + 1
        onChange(milestones.map((m) => (m.id === drag.id ? { ...m, startWeek: start, endWeek: end } : m)))
      }
      setDrag(null)
    },
    [drag, milestones, onChange],
  )

  useEffect(() => {
    if (!drag) return
    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove)
      window.removeEventListener('mouseup', handleWindowMouseUp)
    }
  }, [drag, handleWindowMouseMove, handleWindowMouseUp])

  const handleTimelineMouseDown = (e: React.MouseEvent, ms: MilestoneDef) => {
    if ((e.target as HTMLElement).closest('[data-name-col]')) return
    e.preventDefault()
    const week = xToWeek(e.clientX)

    const placed = ms.startWeek !== null && ms.endWeek !== null

    if (!placed) {
      setDrag({ kind: 'create', id: ms.id, anchor: week, current: week })
      return
    }

    const rect = scrollRef.current?.getBoundingClientRect()
    if (!rect) return
    const scrollLeft = scrollRef.current?.scrollLeft ?? 0
    const x = e.clientX - rect.left + scrollLeft - NAME_W

    const barLeft = ms.startWeek! * CELL_W
    const barRight = ms.endWeek! * CELL_W
    const EDGE = 10

    if (x >= barLeft && x <= barRight) {
      if (x - barLeft < EDGE) {
        setDrag({ kind: 'resize-start', id: ms.id, endWeek: ms.endWeek! })
      } else if (barRight - x < EDGE) {
        setDrag({ kind: 'resize-end', id: ms.id, startWeek: ms.startWeek! })
      } else {
        setDrag({
          kind: 'move',
          id: ms.id,
          dur: ms.endWeek! - ms.startWeek!,
          anchorOffset: week - ms.startWeek!,
        })
      }
    }
  }

  const addMilestone = () =>
    onChange([...milestones, { id: uid(), name: '', startWeek: null, endWeek: null }])

  const removeMilestone = (id: string) => onChange(milestones.filter((m) => m.id !== id))

  const updateName = (id: string, name: string) =>
    onChange(milestones.map((m) => (m.id === id ? { ...m, name } : m)))

  const handleRowDrop = (toIdx: number) => {
    if (!rowDrag || rowDrag.from === toIdx) {
      setRowDrag(null)
      return
    }
    const reordered = [...milestones]
    const [moved] = reordered.splice(rowDrag.from, 1)
    reordered.splice(toIdx, 0, moved)
    onChange(reordered)
    setRowDrag(null)
  }

  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden select-none">
      <div ref={scrollRef} className="overflow-x-auto">
        <div style={{ minWidth: NAME_W + numCols * CELL_W }}>

          {/* ── Header ── */}
          <div
            className="flex border-b border-border bg-muted/55"
            style={{ height: HEADER_H }}
          >
            <div
              style={{ width: NAME_W, flexShrink: 0 }}
              className="sticky left-0 z-10 bg-muted border-r border-border flex items-center px-3"
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Milestone
              </span>
            </div>
            {Array.from({ length: numCols }, (_, i) => (
              <div
                key={i}
                style={{ width: CELL_W, flexShrink: 0 }}
                className="flex items-center justify-center border-r border-border/40 last:border-r-0"
              >
                <span className="text-xs text-muted-foreground font-medium">W{i + 1}</span>
              </div>
            ))}
          </div>

          {/* ── Milestone rows ── */}
          {milestones.length === 0 && (
            <div
              className="flex items-center justify-center text-sm text-muted-foreground"
              style={{ height: ROW_H * 2 }}
            >
              Add a milestone below to get started
            </div>
          )}

          {milestones.map((ms, idx) => {
            const color = colorFor()
            const placed = ms.startWeek !== null && ms.endWeek !== null
            const isCreating = drag?.kind === 'create' && drag.id === ms.id
            const isDraggingRow = rowDrag?.from === idx

            let previewStart: number | null = null
            let previewEnd: number | null = null
            if (isCreating) {
              previewStart = Math.min((drag as { anchor: number; current: number }).anchor, (drag as { anchor: number; current: number }).current)
              previewEnd = Math.max((drag as { anchor: number; current: number }).anchor, (drag as { anchor: number; current: number }).current) + 1
            }

            const showGhost =
              !placed &&
              !isCreating &&
              ghostRow?.id === ms.id &&
              !drag

            return (
              <div
                key={ms.id}
                draggable={!drag}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'move'
                  setRowDrag({ from: idx, over: idx })
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setRowDrag((r) => (r ? { ...r, over: idx } : null))
                }}
                onDrop={() => handleRowDrop(idx)}
                onDragEnd={() => setRowDrag(null)}
                className={[
                  'flex border-b border-border/50 transition-colors last:border-b-0',
                  rowDrag?.over === idx && !isDraggingRow
                    ? 'bg-primary/5 border-primary/30'
                    : 'hover:bg-muted/10',
                  isDraggingRow ? 'opacity-40' : '',
                ].join(' ')}
                style={{ height: ROW_H }}
              >
                {/* Name column */}
                <div
                  data-name-col="true"
                  style={{ width: NAME_W, flexShrink: 0 }}
                  className="sticky left-0 z-10 bg-background border-r border-border flex items-center gap-1.5 px-2"
                >
                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/60 cursor-grab shrink-0" />
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <input
                    value={ms.name}
                    onChange={(e) => updateName(ms.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Milestone name…"
                    className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground"
                  />
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => removeMilestone(ms.id)}
                    className="shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    style={{ opacity: undefined }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>

                </div>



                {/* Timeline canvas */ }
            <div
              className="relative flex-1"
              style={{
                width: numCols * CELL_W,
                cursor: placed ? 'default' : 'crosshair',
              }}
              onMouseDown={(e) => handleTimelineMouseDown(e, ms)}
              onMouseMove={(e) => {
                if (drag) return
                if (!placed) {
                  const week = xToWeek(e.clientX)
                  setGhostRow({ id: ms.id, week })
                }
              }}
              onMouseLeave={() => {
                if (!drag) setGhostRow(null)
              }}
            >
              {/* Grid columns */}
              {Array.from({ length: numCols }, (_, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-r border-border/25"
                  style={{ left: i * CELL_W, width: CELL_W }}
                />
              ))}

              {/* Ghost bar — unplaced + hovering */}
              {showGhost && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-md pointer-events-none transition-none"
                  style={{
                    left: ghostRow!.week * CELL_W + 3,
                    width: CELL_W - 6,
                    height: Math.round(ROW_H * 0.52),
                    backgroundColor: GHOST_COLOR,
                    opacity: 0.35,
                  }}
                />
              )}

              {/* Create-drag preview */}
              {isCreating && previewStart !== null && previewEnd !== null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-md pointer-events-none"
                  style={{
                    left: previewStart * CELL_W + 3,
                    width: Math.max((previewEnd - previewStart) * CELL_W - 6, CELL_W - 6),
                    height: Math.round(ROW_H * 0.52),
                    backgroundColor: color,
                    opacity: 0.55,
                  }}
                />
              )}

              {/* Placed bar */}
              {placed && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 rounded-md flex items-center overflow-visible group/bar"
                  style={{
                    left: ms.startWeek! * CELL_W + 3,
                    width: Math.max((ms.endWeek! - ms.startWeek!) * CELL_W - 6, 8),
                    height: Math.round(ROW_H * 0.52),
                    backgroundColor: color,
                    cursor:
                      drag?.kind === 'move' && drag.id === ms.id ? 'grabbing' : 'grab',
                  }}
                >
                  {/* Left resize handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2.5 rounded-l-md opacity-0 group-hover/bar:opacity-100 transition-opacity flex items-center justify-center cursor-ew-resize"
                    style={{ background: 'rgba(0,0,0,0.18)' }}
                  >
                    <div className="w-0.5 h-3 rounded-full bg-white/60" />
                  </div>

                  {/* Label */}
                  {(ms.endWeek! - ms.startWeek!) * CELL_W > 48 && (
                    <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-white/95 truncate pointer-events-none">
                      {ms.name || 'Untitled'}
                    </span>
                  )}

                  {/* Right resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2.5 rounded-r-md opacity-0 group-hover/bar:opacity-100 transition-opacity flex items-center justify-center cursor-ew-resize"
                    style={{ background: 'rgba(0,0,0,0.18)' }}
                  >
                    <div className="w-0.5 h-3 rounded-full bg-white/60" />
                  </div>
                </div>
              )}

              {/* "Click and drag to place" hint for unplaced, non-hovering rows */}
              {!placed && !isCreating && !showGhost && (
                <div className="absolute inset-0 flex items-center px-3">
                  <span className="text-xs text-muted-foreground/40 select-none">
                    Click &amp; drag to place
                  </span>
                </div>
              )}
            </div>
              </div>
        )
          })}

        {/* ── Add milestone row ── */}
        <div className="flex border-t border-border/50" style={{ height: 44 }}>
          <div
            style={{ width: NAME_W, flexShrink: 0 }}
            className="sticky left-0 bg-background"
          >
            <button
              onClick={addMilestone}
              className="w-full h-full flex items-center gap-2 px-3 text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Milestone
            </button>
          </div>
          <div className="flex-1" />
        </div>

      </div>
    </div>
    </div >
  )
}
