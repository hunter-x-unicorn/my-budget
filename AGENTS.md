# AGENTS.md — «Мой бюджет»

Продукт: **мобильное веб-приложение личного бюджета** (доходы/расходы), не демо auth-site.

Пакет npm: `my-budget`.

## Convex

Перед правками в `convex/` **прочитать** `convex/_generated/ai/guidelines.md`.

После изменений Convex — **только** `npx convex dev` / deploy для codegen. **Не коммитить** ручные правки `convex/_generated/api.d.ts` и server stubs.

## Карта папок

| Путь | Содержимое |
|------|------------|
| `docs/` | ARCHITECTURE, DECISIONS, RUNBOOK |
| `convex/schema.ts` | Таблицы users, categories, transactions |
| `convex/lib/` | auth, dates, validators |
| `convex/categories.ts` | CRUD категорий, seed internal |
| `convex/transactions/` | monthBundle, create, remove, table |
| `convex/migrations.ts` | internal миграции данных |
| `convex/_generated/` | **Не трогать** (кроме запуска codegen) |
| `src/app/` | App, BudgetApp, navigation |
| `src/features/` | Экраны: table, history, add, analytics, account, auth |
| `src/shared/ui/` | MonthNavigator, SummaryStrip, BottomNav |
| `src/shared/hooks/` | useSwipeTabs, useMonth |
| `src/shared/lib/` | formatMoney, dates |
| `src/styles/` | tokens.css, layout/nav/summary/… modules, index.css |

## Именование

- Экраны: `TableScreen`, не `TableTab` (legacy имена могут остаться до полного rename)
- Convex: `list`, `create`, `remove`, `move`; seed — `seedDefaultsIfEmpty` (internal)
- Не возвращать из query `Record` с динамическими ключами — только массивы

## Документация

- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — продукт, стек, таблицы, env
- [docs/DECISIONS.md](./docs/DECISIONS.md) — dateKey, categoryId, monthBundle
- [docs/RUNBOOK.md](./docs/RUNBOOK.md) — Netlify, prod keys

## Skills

`npx convex ai-files install` — Convex agent skills в `.agents/skills/`.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns.

<!-- convex-ai-end -->
