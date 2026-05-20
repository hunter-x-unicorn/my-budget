import { useMutation, useQuery } from "convex/react";
import { useCallback, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { formatTableDay } from "../../shared/lib/budget";
import {
  cellsToTsv,
  isInSelection,
  normalizeSelection,
  parseTsv,
  type GridCoord,
  type GridSelection,
} from "./gridUtils";

type RowDef = {
  id: Id<"categories">;
  name: string;
  type: "income" | "expense";
};

type ExcelGridProps = {
  year: number;
  month: number;
  dates: string[];
};

export function ExcelGrid({ year, month, dates }: ExcelGridProps) {
  const categories = useQuery(api.categories.list);
  const bundle = useQuery(api.transactions.queries.monthBundle, { year, month });
  const setCellAmount = useMutation(api.transactions.mutations.setCellAmount);

  const rows: RowDef[] = useMemo(() => {
    const expense = categories?.filter((c) => c.type === "expense") ?? [];
    const income = categories?.filter((c) => c.type === "income") ?? [];
    return [
      ...expense.map((c) => ({ id: c._id, name: c.name, type: "expense" as const })),
      ...income.map((c) => ({ id: c._id, name: c.name, type: "income" as const })),
    ];
  }, [categories]);

  const cellMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const cell of bundle?.table.cells ?? []) {
      const amount =
        rows.find((r) => r.id === cell.categoryId)?.type === "income"
          ? cell.income
          : cell.expense;
      if (amount > 0) {
        map.set(`${cell.categoryId}|${cell.date}`, amount);
      }
    }
    return map;
  }, [bundle?.table.cells, rows]);

  const displayValues = useMemo(() => {
    return rows.map((row) =>
      dates.map((dk) => {
        const v = cellMap.get(`${row.id}|${dk}`);
        return v !== undefined ? String(Math.round(v * 100) / 100) : "";
      }),
    );
  }, [rows, dates, cellMap]);

  const [scale, setScale] = useState(1);
  const [selection, setSelection] = useState<GridSelection>(null);
  const [editing, setEditing] = useState<GridCoord | null>(null);
  const [editValue, setEditValue] = useState("");
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const commitCell = useCallback(
    async (row: number, col: number, raw: string) => {
      const cat = rows[row];
      const dateKey = dates[col];
      if (!cat || !dateKey) return;
      const value = parseFloat(raw.replace(",", "."));
      const amount = Number.isNaN(value) ? 0 : value;
      await setCellAmount({ categoryId: cat.id, dateKey, amount });
    },
    [rows, dates, setCellAmount],
  );

  const startEdit = (row: number, col: number) => {
    setEditing({ row, col });
    setEditValue(displayValues[row]?.[col] ?? "");
    setSelection({ anchor: { row, col }, focus: { row, col } });
  };

  const onCopy = async () => {
    const box = normalizeSelection(selection);
    if (!box) return;
    const tsv = cellsToTsv(displayValues, box);
    try {
      await navigator.clipboard.writeText(tsv);
    } catch {
      /* ignore */
    }
  };

  const onPaste = async () => {
    const box = normalizeSelection(selection);
    if (!box) return;
    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return;
    }
    const grid = parseTsv(text);
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < (grid[r]?.length ?? 0); c++) {
        const tr = box.r0 + r;
        const tc = box.c0 + c;
        if (tr < rows.length && tc < dates.length) {
          await commitCell(tr, tc, grid[r]![c] ?? "");
        }
      }
    }
  };

  const onTouchStartPinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), scale };
    }
  };

  const onTouchMovePinch = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0]!.clientX - e.touches[1]!.clientX;
      const dy = e.touches[0]!.clientY - e.touches[1]!.clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchRef.current.dist;
      setScale(Math.min(2, Math.max(0.45, pinchRef.current.scale * ratio)));
    }
  };

  const onTouchEndPinch = () => {
    pinchRef.current = null;
  };

  if (categories === undefined) {
    return <p className="empty-state">Загрузка…</p>;
  }

  return (
    <div className="excel-grid-root">
      <div className="excel-toolbar">
        <button type="button" className="btn-icon btn-icon--sm" onClick={() => setScale((s) => Math.max(0.45, s - 0.1))}>
          −
        </button>
        <span className="excel-zoom-label">{Math.round(scale * 100)}%</span>
        <button type="button" className="btn-icon btn-icon--sm" onClick={() => setScale((s) => Math.min(2, s + 0.1))}>
          +
        </button>
        <button type="button" className="excel-tool-btn" disabled={!selection} onClick={() => void onCopy()}>
          Копировать
        </button>
        <button type="button" className="excel-tool-btn" disabled={!selection} onClick={() => void onPaste()}>
          Вставить
        </button>
      </div>

      <div
        ref={scrollRef}
        className="excel-scroll"
        onTouchStart={onTouchStartPinch}
        onTouchMove={onTouchMovePinch}
        onTouchEnd={onTouchEndPinch}
      >
        <div className="excel-scale" style={{ transform: `scale(${scale})`, transformOrigin: "0 0" }}>
          <table className="excel-table">
            <thead>
              <tr>
                <th className="excel-corner">Категория</th>
                {dates.map((dk) => {
                  const [, , dayStr] = dk.split("-");
                  return (
                    <th key={dk} className="excel-date">
                      {formatTableDay(year, month, Number(dayStr))}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.id}>
                  <th scope="row" className={`excel-cat excel-cat--${row.type}`}>
                    {row.name}
                  </th>
                  {dates.map((dk, ci) => {
                    const selected = isInSelection(ri, ci, selection);
                    const isEdit = editing?.row === ri && editing?.col === ci;
                    return (
                      <td
                        key={dk}
                        className={`excel-cell ${selected ? "excel-cell--selected" : ""} excel-cell--${row.type}`}
                        onPointerDown={() => {
                          setSelection({ anchor: { row: ri, col: ci }, focus: { row: ri, col: ci } });
                        }}
                        onPointerEnter={(e) => {
                          if (e.buttons !== 1) return;
                          setSelection((sel) =>
                            sel
                              ? { anchor: sel.anchor, focus: { row: ri, col: ci } }
                              : { anchor: { row: ri, col: ci }, focus: { row: ri, col: ci } },
                          );
                        }}
                        onClick={() => startEdit(ri, ci)}
                      >
                        {isEdit ? (
                          <input
                            className="excel-cell-input"
                            type="text"
                            inputMode="decimal"
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => {
                              void commitCell(ri, ci, editValue).then(() => setEditing(null));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                              if (e.key === "Escape") setEditing(null);
                            }}
                          />
                        ) : (
                          <span className="excel-cell-value">
                            {displayValues[ri]?.[ci] ?? ""}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
