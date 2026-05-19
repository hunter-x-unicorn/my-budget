import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

/** True if any transaction references this category (by id or legacy name). */
export async function categoryHasTransactions(
  ctx: DbCtx,
  userId: Id<"users">,
  category: Doc<"categories">,
): Promise<boolean> {
  const byId = await ctx.db
    .query("transactions")
    .withIndex("by_category", (q) => q.eq("categoryId", category._id))
    .first();
  if (byId !== null) return true;

  // Legacy rows without categoryId — narrow scan per user (personal budget scale).
  const legacyRows = await ctx.db
    .query("transactions")
    .withIndex("by_user_date", (q) => q.eq("userId", userId))
    // eslint-disable-next-line @convex-dev/no-filter-in-query -- legacy orphan check
    .filter((q) =>
      q.and(
        q.eq(q.field("categoryId"), undefined),
        q.eq(q.field("type"), category.type),
      ),
    )
    .collect();

  const nameLower = category.name.toLowerCase();
  return legacyRows.some(
    (tx) => (tx.category ?? "").toLowerCase() === nameLower,
  );
}
