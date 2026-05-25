import { ConvexError } from "convex/values";

const NBRB_API = "https://api.nbrb.by/exrates/rates";

export type NbrbRateRow = {
  Cur_Abbreviation: string;
  Cur_Scale: number;
  Cur_OfficialRate: number;
  Date: string;
};

/** Our dateKey uses 0-based month, e.g. 2026-4-25. */
export function dateKeyFromNbrbIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    throw new ConvexError("Некорректная дата в ответе НБРБ");
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  return `${year}-${month}-${day}`;
}

/** NBRB expects local calendar midnight as UTC string (ExRatesSample.html). */
export function nbrbOnDateParam(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3) {
    throw new ConvexError("Некорректная дата для курса");
  }
  const [year, month, day] = parts;
  return new Date(year, month, day).toUTCString();
}

export async function fetchAllDailyRates(
  dateKey?: string,
): Promise<{ dateKey: string; rates: Array<{ code: string; scale: number; rate: number }> }> {
  const url = new URL(NBRB_API);
  url.searchParams.set("periodicity", "0");
  if (dateKey !== undefined) {
    url.searchParams.set("ondate", nbrbOnDateParam(dateKey));
  }

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new ConvexError("Не удалось связаться с API НБРБ. Повторите позже.");
  }

  if (!res.ok) {
    throw new ConvexError(`API НБРБ вернул ошибку ${res.status}`);
  }

  let rows: NbrbRateRow[];
  try {
    rows = (await res.json()) as NbrbRateRow[];
  } catch {
    throw new ConvexError("Некорректный ответ API НБРБ");
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ConvexError("API НБРБ не вернул курсы на выбранную дату");
  }

  const resolvedDateKey = dateKey ?? dateKeyFromNbrbIso(rows[0]!.Date);
  const rates: Array<{ code: string; scale: number; rate: number }> = [];

  for (const row of rows) {
    const code = row.Cur_Abbreviation?.trim().toUpperCase();
    if (!code || code === "BYN") continue;
    if (
      typeof row.Cur_Scale !== "number" ||
      typeof row.Cur_OfficialRate !== "number" ||
      row.Cur_Scale <= 0 ||
      row.Cur_OfficialRate <= 0
    ) {
      continue;
    }
    rates.push({
      code,
      scale: row.Cur_Scale,
      rate: row.Cur_OfficialRate,
    });
  }

  if (rates.length === 0) {
    throw new ConvexError("В ответе НБРБ нет пригодных курсов");
  }

  return { dateKey: resolvedDateKey, rates };
}
