# Архитектура «Мой бюджет»

Личное мобильное веб-приложение учёта доходов и расходов. Проект вырос из шаблона convex-auth-site; продукт — не демо регистрации, а бюджетный трекер.

## Стек

| Слой          | Технология                                                        |
| ------------- | ----------------------------------------------------------------- |
| UI            | React 18, Vite, CSS (без UI-kit)                                  |
| Backend       | [Convex](https://convex.dev) — queries, mutations, real-time      |
| Auth          | [@convex-dev/auth](https://labs.convex.dev/auth) — email + пароль |
| Фронт (prod)  | [Netlify](https://netlify.com) — статика из `dist`                |
| Бэкенд (prod) | `npx convex deploy` с `CONVEX_DEPLOY_KEY`                         |

## Экраны (5 вкладок)

1. **Таблица** — матрица «категории × дни месяца»
2. **История** — список операций за месяц
3. **Добавление** — форма новой операции
4. **Аналитика** — сводка и расходы по категориям
5. **Аккаунт** — email, выход, управление категориями

Навигация: горизонтальный свайп между панелями + нижняя панель с иконками. Deep link: `#table`, `#history`, `#add`, `#analytics`, `#account`.

## Таблицы Convex

### `users` (auth)

Стандартные поля `@convex-dev/auth` + индекс `email`.

### `categories`

- `userId`, `name`, `type` (`income` | `expense`), `order`
- Индексы: `by_user`, `by_user_type`
- При первом запросе списка для пустого пользователя — internal seed дефолтных категорий (не из UI-компонентов)

### `transactions`

- `userId`, `type`, `amount`, `categoryId` (обязательный), `note?`, `date` (timestamp ms)
- Индексы: `by_user_date` (основной для месяца), `by_category`
- Имя категории для отображения — join по `categoryId` на чтении, не денормализация в документе

## Потоки auth

1. Неавторизованный → `AuthForm` (signIn/signUp через Convex Auth)
2. `Authenticated` → `BudgetApp` с вкладками
3. Все public Convex functions проверяют пользователя через `convex/lib/auth.ts`

## Структура репозитория

```
docs/           — ARCHITECTURE, DECISIONS, RUNBOOK
convex/         — schema, auth, categories, transactions/, lib/
src/app/        — App, BudgetApp, navigation
src/features/   — экраны по доменам (table, history, add, analytics, account, auth)
src/shared/     — ui, hooks, lib, types
```

## Переменные окружения

### Convex (dashboard / `npx convex env`)

| Переменная        | Назначение                       |
| ----------------- | -------------------------------- |
| `JWT_PRIVATE_KEY` | Подпись JWT для Convex Auth      |
| `JWKS`            | Публичные ключи для проверки JWT |

Генерация ключей: `node setup.mjs` (если есть в проекте) или документация Convex Auth.

### Netlify (site settings)

| Переменная          | Назначение                                            |
| ------------------- | ----------------------------------------------------- |
| `VITE_CONVEX_URL`   | URL prod deployment Convex (`https://….convex.cloud`) |
| `CONVEX_DEPLOY_KEY` | Ключ для `npx convex deploy` в build hook             |

### Локальная разработка

- `.env.local` — `VITE_CONVEX_URL` от `npx convex dev`
- Не коммитить секреты

## Codegen

После любых изменений в `convex/`:

```bash
npx convex dev
```

Файлы в `convex/_generated/` **не править вручную**. Только codegen.

## Деплой

См. [RUNBOOK.md](./RUNBOOK.md).
