import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

/** True if any transaction references this category by categoryId. */
export async function categoryHasTransactions(
  ctx: DbCtx,
  category: Doc<"categories">,
): Promise<boolean> {
  const used = await ctx.db
    .query("transactions")
    .withIndex("by_category", (q) => q.eq("categoryId", category._id))
    .first();
  return used !== null;
}
