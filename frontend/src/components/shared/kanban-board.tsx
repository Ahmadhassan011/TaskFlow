"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { PriorityBadge } from "@/components/shared/status-badge";
import { TASK_COLUMNS, type KanbanColumn } from "@/lib/constants";
import type { Task, TaskStatus } from "@/types";

const columnColors: Record<TaskStatus, string> = {
  TODO: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  IN_REVIEW: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  DONE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

interface KanbanBoardProps {
  tasks: Task[];
  onTaskMoved: (taskId: string, newStatus: TaskStatus) => void;
}

function TaskCard({ task }: { task: Task }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: task.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Link
        href={`/dashboard/tasks/${task.id}`}
        className="block rounded-lg border bg-card p-3 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
      >
        <div className="flex items-start gap-2">
          <button
            className="mt-0.5 cursor-grab text-muted-foreground touch-none"
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{task.title}</p>
            {task.labels && task.labels.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {task.labels.slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
                {task.labels.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{task.labels.length - 3}
                  </span>
                )}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <PriorityBadge priority={task.priority} />
                {task.dueDate && (
                  <span
                    className={`flex items-center gap-0.5 text-[10px] ${
                      isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    <Calendar className="size-2.5" />
                    {new Date(task.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
              </div>
              {task.assignee && (
                <Avatar size="sm" className="size-5">
                  {/* 8px: avatar is size-5 (20px), 10px would overflow */}
                  <AvatarFallback className="text-[8px]">
                    {getInitials(task.assignee.name)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function DroppableColumn({
  column,
  tasks,
}: {
  column: KanbanColumn;
  tasks: Task[];
}) {
  return (
    <div className="min-w-[85vw] snap-start space-y-2 md:min-w-0">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {column.label}
        </CardTitle>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>
      <SortableContext
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="min-h-[200px] space-y-2 rounded-lg bg-muted/30 p-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function KanbanBoard({ tasks, onTaskMoved }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const tasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  const activeTask = tasks.find((t) => t.id === activeId);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    const overData = over.data.current;
    let newStatus: TaskStatus;

    if (overData?.status) {
      newStatus = overData.status as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      newStatus = overTask?.status || activeTask.status;
    }

    if (newStatus === activeTask.status) return;

    onTaskMoved(activeTask.id, newStatus);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="grid gap-4 overflow-x-auto snap-x snap-mandatory md:snap-none md:grid-cols-2 lg:grid-cols-4"
        aria-label="Task board"
        role="region"
        aria-live="polite"
      >
        {TASK_COLUMNS.map((col) => (
          <DroppableColumn
            key={col.status}
            column={col}
            tasks={tasksByStatus(col.status)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask && (
          <div className="rounded-lg border bg-card p-3 shadow-lg">
            <p className="text-sm font-medium">{activeTask.title}</p>
            {activeTask.assignee && (
              <p className="mt-1 text-xs text-muted-foreground">
                {activeTask.assignee.name}
              </p>
            )}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
