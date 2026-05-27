import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query } from "./_generated/server";
import { getOptionalUserId, requireUserId } from "./lib/auth";
import {
  hasCaseInsensitiveDuplicate,
  nextOrder,
  normalizeEntityName,
} from "./lib/crud";
import { syncAccountSnapshots } from "./lib/accountSnapshots";
import { convertToBase, getCachedRate } from "./lib/exchange";
import { todayDateKeyMinsk } from "./lib/exchangeSync";
import { roundMoney } from "./lib/money";

export const accountDocValidator = v.object({
  _id: v.id("accounts"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  balance: v.number(),
  order: v.number(),
  isDefault: v.optional(v.boolean()),
  lastRecalculatedAt: v.optional(v.number()),
});

const DEFAULT_ACCOUNT_NAME = "Текущий";

async function insertDefaultAccount(ctx: MutationCtx, userId: Id<"users">) {
  await ctx.db.insert("accounts", {
    userId,
    name: DEFAULT_ACCOUNT_NAME,
    balance: 0,
    order: 0,
    isDefault: true,
  });
}

/** Idempotent seed — «Текущий» with balance 0. */
export const bootstrap = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing === null) {
      await insertDefaultAccount(ctx, userId);
    }
    return null;
  },
});

/** Idempotent rebuild of daily account snapshots (analytics chart). */
export const syncSnapshots = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await syncAccountSnapshots(ctx, userId);
    return null;
  },
});

export const list = query({
  args: {},
  returns: v.array(accountDocValidator),
  handler: async (ctx) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) return [];

    const rows = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return rows.sort((a, b) => a.order - b.order);
  },
});

export const create = mutation({
  args: { name: v.string() },
  returns: v.id("accounts"),
  handler: async (ctx, { name }) => {
    const userId = await requireUserId(ctx);
    const trimmed = normalizeEntityName(
      name,
      "Введите название счёта",
      "Слишком длинное название",
    );

    const siblings = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (hasCaseInsensitiveDuplicate(siblings, (a) => a.name, trimmed)) {
      throw new ConvexError("Такой счёт уже есть");
    }

    return await ctx.db.insert("accounts", {
      userId,
      name: trimmed,
      balance: 0,
      order: nextOrder(siblings),
    });
  },
});

const balanceEntryValidator = v.object({
  currencyId: v.id("currencies"),
  code: v.string(),
  symbol: v.string(),
  name: v.string(),
  balance: v.number(),
});

/** Per-currency balances for «Настройка счёта». */
export const settingsBundle = query({
  args: { accountId: v.id("accounts") },
  returns: v.object({
    accountId: v.id("accounts"),
    accountName: v.string(),
    entries: v.array(balanceEntryValidator),
  }),
  handler: async (ctx, { accountId }) => {
    const userId = await getOptionalUserId(ctx);
    if (userId === null) {
      return { accountId, accountName: "", entries: [] };
    }

    const account = await ctx.db.get(accountId);
    if (account === null || account.userId !== userId) {
      throw new ConvexError("Счёт не найден");
    }

    const currencies = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const stored = await ctx.db
      .query("accountBalances")
      .withIndex("by_account", (q) => q.eq("accountId", accountId))
      .collect();
    const byCurrency = new Map(stored.map((r) => [r.currencyId, r.balance]));

    const entries = currencies
      .sort((a, b) => a.order - b.order)
      .map((c) => ({
        currencyId: c._id,
        code: c.code,
        symbol: c.symbol,
        name: c.name,
        balance: byCurrency.get(c._id) ?? 0,
      }));

    return {
      accountId,
      accountName: account.name,
      entries,
    };
  },
});

/** Перерасчёт: остаток в каждой валюте → сумма в базовой валюте на счёте. */
export const saveBalances = mutation({
  args: {
    accountId: v.id("accounts"),
    balances: v.array(
      v.object({
        currencyId: v.id("currencies"),
        balance: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { accountId, balances }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(accountId);
    if (account === null || account.userId !== userId) {
      throw new ConvexError("Счёт не найден");
    }

    const currencies = await ctx.db
      .query("currencies")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const base = currencies.sort((a, b) => a.order - b.order)[0];
    if (base === undefined) {
      throw new ConvexError("Добавьте валюту");
    }

    const dateKey = todayDateKeyMinsk();
    let totalBase = 0;

    for (const row of balances) {
      if (row.balance < 0) {
        throw new ConvexError("Сумма не может быть отрицательной");
      }
      const currency = currencies.find((c) => c._id === row.currencyId);
      if (currency === undefined) {
        throw new ConvexError("Валюта не найдена");
      }

      const rounded = roundMoney(row.balance);
      const existing = await ctx.db
        .query("accountBalances")
        .withIndex("by_account_currency", (q) =>
          q.eq("accountId", accountId).eq("currencyId", row.currencyId),
        )
        .unique();

      if (existing !== null) {
        await ctx.db.patch(existing._id, { balance: rounded });
      } else {
        await ctx.db.insert("accountBalances", {
          userId,
          accountId,
          currencyId: row.currencyId,
          balance: rounded,
        });
      }

      if (currency.code === base.code) {
        totalBase = roundMoney(totalBase + rounded);
      } else {
        const rate = await getCachedRate(ctx, dateKey, currency.code);
        if (rate === null) {
          throw new ConvexError(
            `Нет курса ${currency.code} на сегодня. Откройте «Валюта» после синхронизации курсов.`,
          );
        }
        totalBase = roundMoney(
          totalBase + convertToBase(rounded, rate.scale, rate.rate),
        );
      }
    }

    await ctx.db.patch(accountId, {
      balance: totalBase,
      lastRecalculatedAt: Date.now(),
    });
    await syncAccountSnapshots(ctx, userId);
    return null;
  },
});

export const remove = mutation({
  args: { id: v.id("accounts") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(id);
    if (account === null || account.userId !== userId) {
      throw new ConvexError("Счёт не найден");
    }
    if (account.isDefault) {
      throw new ConvexError("Нельзя удалить основной счёт «Текущий»");
    }

    const siblings = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (siblings.length <= 1) {
      throw new ConvexError("Нельзя удалить последний счёт");
    }

    const balanceRows = await ctx.db
      .query("accountBalances")
      .withIndex("by_account", (q) => q.eq("accountId", id))
      .collect();
    for (const row of balanceRows) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.delete(id);

    const sorted = siblings
      .filter((a) => a._id !== id)
      .sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i++) {
      await ctx.db.patch(sorted[i]!._id, { order: i });
    }
    return null;
  },
});
