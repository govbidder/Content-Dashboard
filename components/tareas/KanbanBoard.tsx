'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { AnimatePresence } from 'motion/react'
import { Plus } from 'lucide-react'
import { Task, TaskColumnId } from '@/lib/types'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { TaskModal } from './TaskModal'
import { toast } from 'sonner'

// ─── Column config ─────────────────────────────────────────────────────────

const COLUMNS: { id: TaskColumnId; label: string; color: string }[] = [
  { id: 'por-hacer', label: 'Por hacer', color: '#6B7280' },
  { id: 'en-proceso', label: 'En proceso', color: '#B08A4A' },
  { id: 'listo', label: 'Listo', color: '#10B981' },
]

// ─── API shape → UI Task ───────────────────────────────────────────────────

interface ApiTask {
  id: string
  title: string
  description: string
  dueDate: string | null
  labelText: string
  labelColor: string
  columnId: string
  order: number
  createdAt: string
  updatedAt: string
}

function apiToUiTask(t: ApiTask): Task {
  return {
    id: t.id,
    title: t.title,
    description: t.description || undefined,
    dueDate: t.dueDate
      ? new Date(t.dueDate).toISOString().slice(0, 10)
      : undefined,
    label:
      t.labelText && t.labelColor
        ? { text: t.labelText, color: t.labelColor }
        : undefined,
    columnId: t.columnId as TaskColumnId,
    createdAt: t.createdAt,
    order: t.order,
  }
}

// ─── KanbanBoard ───────────────────────────────────────────────────────────

export function KanbanBoard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [modalConfig, setModalConfig] = useState<{
    open: boolean
    task?: Task | null
    defaultColumnId?: TaskColumnId
  }>({ open: false })
  const dragSnapshotRef = useRef<Task[] | null>(null)

  // ── Initial fetch ────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch('/api/tasks')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<{ tasks: ApiTask[] }>
      })
      .then(({ tasks: apiTasks }) => {
        if (!cancelled) setTasks(apiTasks.map(apiToUiTask))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          toast.error(`Error al cargar tareas: ${msg}`)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ── DnD sensors ──────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
    dragSnapshotRef.current = tasks
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeTask = tasks.find((t) => t.id === activeId)
    if (!activeTask) return

    const overColumn = COLUMNS.find((c) => c.id === overId)
    if (overColumn && activeTask.columnId !== overColumn.id) {
      setTasks((prev) =>
        prev.map((t) => t.id === activeId ? { ...t, columnId: overColumn.id } : t),
      )
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    const snapshot = dragSnapshotRef.current
    dragSnapshotRef.current = null

    if (!over) {
      if (snapshot) setTasks(snapshot)
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) {
      if (snapshot) setTasks(snapshot)
      return
    }

    setTasks((prev) => {
      const activeTask = prev.find((t) => t.id === activeId)
      const overTask = prev.find((t) => t.id === overId)
      const overColumn = COLUMNS.find((c) => c.id === overId)

      if (!activeTask) return prev

      let updated = prev

      if (overColumn) {
        updated = prev.map((t) =>
          t.id === activeId ? { ...t, columnId: overColumn.id } : t,
        )
      } else if (overTask && activeTask.columnId === overTask.columnId) {
        const colTasks = prev.filter((t) => t.columnId === activeTask.columnId)
        const activeIdx = colTasks.findIndex((t) => t.id === activeId)
        const overIdx = colTasks.findIndex((t) => t.id === overId)
        const reordered = arrayMove(colTasks, activeIdx, overIdx).map((t, i) => ({
          ...t,
          order: i,
        }))
        const otherTasks = prev.filter((t) => t.columnId !== activeTask.columnId)
        updated = [...otherTasks, ...reordered]
      }

      const baseline = snapshot ?? prev
      const changedTasks = updated.filter((t) => {
        const orig = baseline.find((p) => p.id === t.id)
        return orig && (orig.columnId !== t.columnId || orig.order !== t.order)
      })

      if (changedTasks.length > 0) {
        Promise.all(
          changedTasks.map((t) =>
            fetch(`/api/tasks/${t.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ columnId: t.columnId, order: t.order }),
            }).then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`)
            }),
          ),
        ).catch(() => {
          if (snapshot) setTasks(snapshot)
          toast.error('No se pudo guardar — se revirtieron los cambios')
        })
      }

      return updated
    })
  }

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreateModal = (columnId: TaskColumnId = 'por-hacer') => {
    setModalConfig({ open: true, task: null, defaultColumnId: columnId })
  }

  const openEditModal = useCallback((task: Task) => {
    setModalConfig({ open: true, task })
  }, [])

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleSave = useCallback(
    async (data: Omit<Task, 'id' | 'createdAt' | 'order'> & { id?: string }) => {
      if (data.id) {
        // Update
        try {
          const res = await fetch(`/api/tasks/${data.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              description: data.description ?? '',
              dueDate: data.dueDate
                ? new Date(data.dueDate + 'T00:00:00').toISOString()
                : null,
              labelText: data.label?.text ?? '',
              labelColor: data.label?.color ?? '',
              columnId: data.columnId,
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const { task: apiTask } = (await res.json()) as { task: ApiTask }
          setTasks((prev) =>
            prev.map((t) => t.id === data.id ? apiToUiTask(apiTask) : t),
          )
          toast.success('Tarea actualizada')
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          toast.error(`Error al actualizar tarea: ${msg}`)
        }
      } else {
        // Create
        const colTasks = tasks.filter((t) => t.columnId === data.columnId)
        try {
          const res = await fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: data.title,
              description: data.description ?? '',
              dueDate: data.dueDate
                ? new Date(data.dueDate + 'T00:00:00').toISOString()
                : null,
              labelText: data.label?.text ?? '',
              labelColor: data.label?.color ?? '',
              columnId: data.columnId,
              order: colTasks.length,
            }),
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const { task: apiTask } = (await res.json()) as { task: ApiTask }
          setTasks((prev) => [...prev, apiToUiTask(apiTask)])
          toast.success('Tarea creada')
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err)
          toast.error(`Error al crear tarea: ${msg}`)
        }
      }
    },
    [tasks],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const deleted = tasks.find((t) => t.id === id)
      // Optimistic remove
      setTasks((prev) => prev.filter((t) => t.id !== id))
      try {
        const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        if (deleted) {
          toast.success('Tarea eliminada', {
            action: {
              label: 'Deshacer',
              onClick: async () => {
                try {
                  const r = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: deleted.title,
                      description: deleted.description ?? '',
                      dueDate: deleted.dueDate
                        ? new Date(deleted.dueDate + 'T00:00:00').toISOString()
                        : null,
                      labelText: deleted.label?.text ?? '',
                      labelColor: deleted.label?.color ?? '',
                      columnId: deleted.columnId,
                      order: deleted.order,
                    }),
                  })
                  if (!r.ok) throw new Error(`HTTP ${r.status}`)
                  const { task: apiTask } = (await r.json()) as { task: ApiTask }
                  setTasks((prev) =>
                    [...prev, apiToUiTask(apiTask)].sort((a, b) => a.order - b.order),
                  )
                } catch {
                  toast.error('No se pudo deshacer')
                }
              },
            },
          })
        }
      } catch (err: unknown) {
        // Rollback
        if (deleted) setTasks((prev) => [...prev, deleted].sort((a, b) => a.order - b.order))
        const msg = err instanceof Error ? err.message : String(err)
        toast.error(`Error al eliminar tarea: ${msg}`)
      }
    },
    [tasks],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>Tareas</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Organiza tu flujo de trabajo de contenido
          </p>
        </div>
        <button
          onClick={() => openCreateModal()}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={15} />
          Nueva tarea
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Cargando tareas…
          </span>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex xl:grid xl:grid-cols-3 gap-5 flex-1 min-h-0 overflow-x-auto xl:overflow-x-visible -mx-6 px-6 xl:mx-0 xl:px-0">
            {COLUMNS.map((col) => {
              const colTasks = tasks
                .filter((t) => t.columnId === col.id)
                .sort((a, b) => a.order - b.order)
              return (
                <div key={col.id} className="shrink-0 xl:shrink w-[280px] xl:w-auto min-h-0 flex flex-col">
                  <KanbanColumn
                    id={col.id}
                    title={col.label}
                    tasks={colTasks}
                    accentColor={col.color}
                    onAddTask={openCreateModal}
                    onEditTask={openEditModal}
                  />
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div style={{ transform: 'rotate(2deg)', opacity: 0.95 }}>
                <TaskCard task={activeTask} onClick={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <AnimatePresence>
        {modalConfig.open && (
          <TaskModal
            key="task-modal"
            task={modalConfig.task}
            defaultColumnId={modalConfig.defaultColumnId}
            onSave={handleSave}
            onDelete={modalConfig.task ? handleDelete : undefined}
            onClose={() => setModalConfig({ open: false })}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
