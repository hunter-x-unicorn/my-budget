import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { action, query } from "./_generated/server";
import { convertToBase } from "./lib/exchange";
import { readCachedRate } from "./exchangeRatesData";

const NBRB_API = "https://api.nbrb.by/exrates";

const rateValidator = v.object({
  scale: v.number(),
  rate: v.number(),
});

type NbrbRateResponse = {
  Cur_Scale: number;
  Cur_OfficialRate: number;
};

/** NBRB expects local calendar midnight as UTC string (see ExRatesSample.html). */
function nbrbOnDateParam(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3) {
    throw new ConvexError("Некорректная дата для курса");
  }
  const [year, month, day] = parts;
  return new Date(year, month, day).toUTCString();
}

async function fetchNbrbRate(
  code: string,
  dateKey: string,
): Promise<{ scale: number; rate: number }> {
  const normalized = code.trim().toUpperCase();
  if (normalized === "BYN") {
    return { scale: 1, rate: 1 };
  }

  const url = new URL(`${NBRB_API}/rates/${encodeURIComponent(normalized)}`);
  url.searchParams.set("parammode", "2");
  url.searchParams.set("ondate", nbrbOnDateParam(dateKey));

  let res: Response;
  try {
    res = await fetch(url.toString());
  } catch {
    throw new ConvexError(
      `Не удалось связаться с API НБРБ для ${normalized}. Проверьте сеть и повторите.`,
    );
  }

  if (!res.ok) {
    if (res.status === 404) {
      throw new ConvexError(
        `Нет официального курса ${normalized} на выбранную дату. Выберите другой день или валюту BYN.`,
      );
    }
    throw new ConvexError(
      `Не удалось получить курс ${normalized} (ответ API ${res.status})`,
    );
  }

  let data: NbrbRateResponse;
  try {
    data = (await res.json()) as NbrbRateResponse;
  } catch {
    throw new ConvexError(`Некорректный ответ API НБРБ для ${normalized}`);
  }
  if (
    typeof data.Cur_Scale !== "number" ||
    typeof data.Cur_OfficialRate !== "number" ||
    data.Cur_Scale <= 0 ||
    data.Cur_OfficialRate <= 0
  ) {
    throw new ConvexError(`Некорректный ответ API для ${normalized}`);
  }

  return { scale: data.Cur_Scale, rate: data.Cur_OfficialRate };
}

/** Cached official NBRB rate for a calendar day (letter ISO code). */
export const lookup = query({
  args: {
    code: v.string(),
    dateKey: v.string(),
  },
  returns: v.union(v.null(), rateValidator),
  handler: async (ctx, { code, dateKey }) => readCachedRate(ctx, code, dateKey),
});

/** Fetch from NBRB if missing, store in cache, return rate. */
export const ensureRate = action({
  args: {
    code: v.string(),
    dateKey: v.string(),
  },
  returns: rateValidator,
  handler: async (
    ctx,
    { code, dateKey },
  ): Promise<{ scale: number; rate: number }> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new ConvexError("Требуется вход");
    }

    const normalized = code.trim().toUpperCase();
    if (normalized === "BYN") {
      return { scale: 1, rate: 1 };
    }

    const cached = (await ctx.runQuery(
      internal.exchangeRatesData.getCachedInternal,
      { code: normalized, dateKey },
    )) as { scale: number; rate: number } | null;
    if (cached !== null) {
      return cached;
    }

    const fetched = await fetchNbrbRate(normalized, dateKey);
    await ctx.runMutation(internal.exchangeRatesData.upsert, {
      dateKey,
      code: normalized,
      scale: fetched.scale,
      rate: fetched.rate,
    });
    return fetched;
  },
});

/** Preview conversion to base currency using cache only (no network). */
export const previewBase = query({
  args: {
    code: v.string(),
    dateKey: v.string(),
    amount: v.number(),
  },
  returns: v.union(
    v.null(),
    v.object({
      amountBase: v.number(),
      scale: v.number(),
      rate: v.number(),
    }),
  ),
  handler: async (ctx, { code, dateKey, amount }) => {
    if (amount <= 0) return null;

    const cached = await readCachedRate(ctx, code, dateKey);
    if (cached === null) return null;
    return {
      amountBase: convertToBase(amount, cached.scale, cached.rate),
      scale: cached.scale,
      rate: cached.rate,
    };
  },
});
