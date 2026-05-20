export type GridCoord = { row: number; col: number };

export type GridSelection = {
  anchor: GridCoord;
  focus: GridCoord;
} | null;

export function normalizeSelection(sel: GridSelection): {
  r0: number;
  r1: number;
  c0: number;
  c1: number;
} | null {
  if (!sel) return null;
  return {
    r0: Math.min(sel.anchor.row, sel.focus.row),
    r1: Math.max(sel.anchor.row, sel.focus.row),
    c0: Math.min(sel.anchor.col, sel.focus.col),
    c1: Math.max(sel.anchor.col, sel.focus.col),
  };
}

export function isInSelection(
  row: number,
  col: number,
  sel: GridSelection,
): boolean {
  const box = normalizeSelection(sel);
  if (!box) return false;
  return row >= box.r0 && row <= box.r1 && col >= box.c0 && col <= box.c1;
}

export function cellsToTsv(
  values: string[][],
  box: { r0: number; r1: number; c0: number; c1: number },
): string {
  const lines: string[] = [];
  for (let r = box.r0; r <= box.r1; r++) {
    const row: string[] = [];
    for (let c = box.c0; c <= box.c1; c++) {
      row.push(values[r]?.[c] ?? "");
    }
    lines.push(row.join("\t"));
  }
  return lines.join("\n");
}

export function parseTsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.split("\t"));
}
