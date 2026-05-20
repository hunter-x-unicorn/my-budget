import { useState } from "react";

export type DraggableItem = {
  id: string;
  label: string;
  sublabel?: string;
};

type DraggableListProps = {
  items: DraggableItem[];
  onReorder: (orderedIds: string[]) => void;
  onRename?: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  accent?: "expense" | "income" | "neutral";
};

export function DraggableList({
  items,
  onReorder,
  onRename,
  onDelete,
  accent = "neutral",
}: DraggableListProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function reorder(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    onReorder(ids);
  }

  function startRename(item: DraggableItem) {
    if (!onRename) return;
    setEditingId(item.id);
    setEditValue(item.label);
  }

  function commitRename(id: string) {
    const trimmed = editValue.trim();
    if (trimmed && onRename) onRename(id, trimmed);
    setEditingId(null);
  }

  return (
    <ul className="drag-list">
      {items.map((item) => {
        const isDragging = dragId === item.id;
        const isOver = overId === item.id && dragId !== item.id;
        return (
          <li
            key={item.id}
            className={`drag-item drag-item--${accent} ${isDragging ? "drag-item--dragging" : ""} ${isOver ? "drag-item--over" : ""}`}
            draggable
            onDragStart={() => setDragId(item.id)}
            onDragEnd={() => {
              setDragId(null);
              setOverId(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOverId(item.id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) reorder(dragId, item.id);
              setDragId(null);
              setOverId(null);
            }}
          >
            <span className="drag-handle" aria-hidden>
              ⠿
            </span>
            {editingId === item.id ? (
              <input
                className="drag-rename-input"
                value={editValue}
                autoFocus
                maxLength={40}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => commitRename(item.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(item.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="drag-label"
                onClick={() => (onRename ? startRename(item) : undefined)}
                disabled={!onRename}
              >
                <span>{item.label}</span>
                {item.sublabel && <span className="drag-sublabel">{item.sublabel}</span>}
              </button>
            )}
            <button
              type="button"
              className="drag-delete"
              aria-label={`Удалить ${item.label}`}
              onClick={() => onDelete(item.id)}
            >
              ×
            </button>
          </li>
        );
      })}
    </ul>
  );
}
