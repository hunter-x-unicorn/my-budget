import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function enrichTransactionRows(
  ctx: QueryCtx,
  userId: Id<"users">,
  rows: Doc<"transactions">[],
) {
  const categories = await ctx.db
    .query("categories")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const nameById = new Map(categories.map((c) => [c._id, c.name]));

  const currencyRows = await ctx.db
    .query("currencies")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const currencyById = new Map(currencyRows.map((c) => [c._id, c]));

  const tagRows = await ctx.db
    .query("tags")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const tagNameById = new Map(tagRows.map((t) => [t._id, t.name]));

  return rows.map((row) => {
    const legacyName =
      "category" in row && typeof row.category === "string" ? row.category : undefined;
    const currency = row.currencyId ? currencyById.get(row.currencyId) : undefined;
    const tagNames =
      row.tagIds
        ?.map((id) => tagNameById.get(id))
        .filter((n): n is string => n !== undefined) ?? undefined;

    return {
      _id: row._id,
      _creationTime: row._creationTime,
      userId: row.userId,
      type: row.type,
      amount: row.amount,
      amountBase: row.amountBase,
      categoryId: row.categoryId,
      categoryName:
        row.type === "transfer"
          ? "Перевод"
          : row.categoryId
            ? (nameById.get(row.categoryId) ?? "—")
            : (legacyName ?? "—"),
      currencyId: row.currencyId,
      currencyCode: currency?.code,
      currencySymbol: currency?.symbol,
      tagIds: row.tagIds,
      tagNames: tagNames?.length ? tagNames : undefined,
      note: row.note,
      date: row.date,
    };
  });
}
