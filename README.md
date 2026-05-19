# Мой бюджет

Личный учёт доходов и расходов: React + Vite + Convex + Convex Auth.

## Быстрый старт

1. Клонировать репозиторий и `npm install`
2. `npx convex dev` — поднять dev backend и сгенерировать `convex/_generated`
3. Настроить JWT для auth (см. [Convex Auth](https://labs.convex.dev/auth)):
   ```bash
   npx convex env set JWT_PRIVATE_KEY "…"
   npx convex env set JWKS '…'
   ```
4. `npm run dev` — фронт (Vite) и Convex параллельно
5. Открыть URL из Vite, зарегистрироваться

Документация: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), [docs/DECISIONS.md](./docs/DECISIONS.md), [docs/RUNBOOK.md](./docs/RUNBOOK.md).

## Скрипты

| Команда             | Описание                                   |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Фронт + `convex dev`                       |
| `npm run build`     | Typecheck + production build               |
| `npm run lint`      | ESLint (+ `@convex-dev/eslint-plugin`)     |
| `npm run format`    | Prettier                                   |
| `npm test`          | Vitest (dates, агрегация таблицы)          |
| `npx convex deploy` | Prod backend (не для локальной разработки) |

## Codegen

Не редактировать `convex/_generated/` вручную. После изменений в `convex/` — только `npx convex dev` или deploy.
