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

  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    balance: v.number(),
    order: v.number(),
    isDefault: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),

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
