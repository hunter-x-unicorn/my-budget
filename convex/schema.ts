import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
  }).index("email", ["email"]),

  currencies: defineTable({
    userId: v.id("users"),
    code: v.string(),
    name: v.string(),
    symbol: v.string(),
    order: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_code", ["userId", "code"]),

  tags: defineTable({
    userId: v.id("users"),
    name: v.string(),
    order: v.number(),
  }).index("by_user", ["userId"]),

  /** Official NBRB rates — global cache for all users (dateKey + ISO code). */
  exchangeRates: defineTable({
    dateKey: v.string(),
    code: v.string(),
    scale: v.number(),
    rate: v.number(),
  })
    .index("by_date_code", ["dateKey", "code"])
    .index("by_date", ["dateKey"]),

  /** Marks that all daily NBRB rates were stored for dateKey. */
  exchangeRateSyncs: defineTable({
    dateKey: v.string(),
    syncedAt: v.number(),
    rateCount: v.number(),
  }).index("by_dateKey", ["dateKey"]),

  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    /** Total in base currency (first currency by order), from per-currency balances. */
    balance: v.number(),
    order: v.number(),
    isDefault: v.optional(v.boolean()),
    /** Unix ms — set on «Перерасчёт»; absent until first recalc. */
    lastRecalculatedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  /** Actual balance per currency after «Перерасчёт». */
  accountBalances: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    currencyId: v.id("currencies"),
    balance: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_account_currency", ["accountId", "currencyId"]),

  /** End-of-day «текущий счёт» in base currency (for analytics chart). */
  accountDailySnapshots: defineTable({
    userId: v.id("users"),
    accountId: v.id("accounts"),
    dateKey: v.string(),
    balance: v.number(),
  })
    .index("by_account", ["accountId"])
    .index("by_account_date", ["accountId", "dateKey"]),

  categories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    type: v.union(v.literal("income"), v.literal("expense")),
    order: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("income"),
      v.literal("expense"),
      v.literal("transfer"),
    ),
    amount: v.number(),
    /** Amount in user's base currency (first currency by order); for analytics. */
    amountBase: v.optional(v.number()),
    currencyId: v.optional(v.id("currencies")),
    tagIds: v.optional(v.array(v.id("tags"))),
    /** Required for new rows; legacy rows may omit until migrations run. */
    categoryId: v.optional(v.id("categories")),
    /** @deprecated Legacy string category — removed by migrations. */
    category: v.optional(v.string()),
    note: v.optional(v.string()),
    date: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_user_currency", ["userId", "currencyId"])
    .index("by_category", ["categoryId"]),
});

export default schema;
