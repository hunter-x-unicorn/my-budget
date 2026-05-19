import { v } from "convex/values";

export const transactionType = v.union(
  v.literal("income"),
  v.literal("expense"),
);

export const categoryType = v.union(v.literal("income"), v.literal("expense"));

export const monthArgs = {
  year: v.number(),
  month: v.number(),
};

export const summaryValidator = v.object({
  income: v.number(),
  expense: v.number(),
  balance: v.number(),
});

export const tableCellValidator = v.object({
  categoryId: v.id("categories"),
  date: v.string(),
  income: v.number(),
  expense: v.number(),
});

export const transactionRowValidator = v.object({
  _id: v.id("transactions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  type: transactionType,
  amount: v.number(),
  categoryId: v.optional(v.id("categories")),
  categoryName: v.string(),
  note: v.optional(v.string()),
  date: v.number(),
});

export const categoryDocValidator = v.object({
  _id: v.id("categories"),
  _creationTime: v.number(),
  userId: v.id("users"),
  name: v.string(),
  type: categoryType,
  order: v.number(),
});
