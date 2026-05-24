/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as categories from "../categories.js";
import type * as currencies from "../currencies.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_crud from "../lib/crud.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_money from "../lib/money.js";
import type * as lib_validators from "../lib/validators.js";
import type * as migrations from "../migrations.js";
import type * as tags from "../tags.js";
import type * as transactions_analytics from "../transactions/analytics.js";
import type * as transactions_mapRows from "../transactions/mapRows.js";
import type * as transactions_mutations from "../transactions/mutations.js";
import type * as transactions_queries from "../transactions/queries.js";
import type * as transactions_table from "../transactions/table.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  categories: typeof categories;
  currencies: typeof currencies;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/categories": typeof lib_categories;
  "lib/crud": typeof lib_crud;
  "lib/dates": typeof lib_dates;
  "lib/money": typeof lib_money;
  "lib/validators": typeof lib_validators;
  migrations: typeof migrations;
  tags: typeof tags;
  "transactions/analytics": typeof transactions_analytics;
  "transactions/mapRows": typeof transactions_mapRows;
  "transactions/mutations": typeof transactions_mutations;
  "transactions/queries": typeof transactions_queries;
  "transactions/table": typeof transactions_table;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
