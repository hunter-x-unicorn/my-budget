/**
 * TEMPORARY — fetch NBRB in the browser (CORS allowed). Delete with src/temp/.
 */

type NbrbRow = {
  Cur_Abbreviation: string;
  Cur_Scale: number;
  Cur_OfficialRate: number;
  Date: string;
};

export type NbrbRateInput = {
  code: string;
  scale: number;
  rate: number;
};

function nbrbOnDateParam(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month, day).toUTCString();
}

function dateKeyFromIso(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) throw new Error("Некорректная дата в ответе НБРБ");
  return `${Number(match[1])}-${Number(match[2]) - 1}-${Number(match[3])}`;
}

export async function fetchNbrbRatesForDay(dateKey: string): Promise<{
  dateKey: string;
  rates: NbrbRateInput[];
}> {
  const url = new URL("https://api.nbrb.by/exrates/rates");
  url.searchParams.set("periodicity", "0");
  url.searchParams.set("ondate", nbrbOnDateParam(dateKey));

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new Error("Нет связи с api.nbrb.by");
  }

  if (!res.ok) {
    throw new Error(`НБРБ ответил ${res.status} на ${dateKey}`);
  }

  const rows = (await res.json()) as NbrbRow[];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`НБРБ не вернул курсы на ${dateKey}`);
  }

  const resolvedKey = dateKeyFromIso(rows[0]!.Date);
  const rates: NbrbRateInput[] = [];

  for (const row of rows) {
    const code = row.Cur_Abbreviation?.trim().toUpperCase();
    if (!code || code === "BYN") continue;
    if (row.Cur_Scale <= 0 || row.Cur_OfficialRate <= 0) continue;
    rates.push({
      code,
      scale: row.Cur_Scale,
      rate: row.Cur_OfficialRate,
    });
  }

  if (rates.length === 0) {
    throw new Error(`Пустой список курсов на ${dateKey}`);
  }

  return { dateKey: resolvedKey, rates };
}
