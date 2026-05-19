# Runbook: Netlify + Convex prod

## Сборка на Netlify

`netlify.toml`:

```toml
[build]
  command = "npx convex deploy --cmd 'npm run build'"
  publish = "dist"
```

Порядок: deploy Convex → `npm run build` (Vite) → публикация `dist/`.

## Переменные Netlify

| Переменная | Где взять |
|------------|-----------|
| `CONVEX_DEPLOY_KEY` | Convex Dashboard → Settings → Deploy Key (prod) |
| `VITE_CONVEX_URL` | URL prod deployment, напр. `https://happy-animal-123.convex.cloud` |

Без `VITE_CONVEX_URL` фронт не подключится к бэкенду (пустой или wrong URL).

## JWT / Auth на prod

В Convex Dashboard (prod deployment) должны быть:

- `JWT_PRIVATE_KEY`
- `JWKS`

Если на Netlify «вошёл», но запросы падают с auth — проверить, что ключи заданы **на том же deployment**, что указан в `VITE_CONVEX_URL`.

Локально те же переменные через `npx convex env set` для dev deployment.

## Типичные ошибки

| Симптом | Действие |
|---------|----------|
| Белый экран / нет данных | Проверить `VITE_CONVEX_URL` в Netlify build env |
| «Требуется вход» на всех запросах | JWT keys на prod; перелогиниться |
| Build падает на convex deploy | `CONVEX_DEPLOY_KEY`, доступ к prod project |
| Типы API не сходятся | `npx convex dev` локально, не править `api.d.ts` вручную |
| Старые операции не в таблице | См. миграции ниже |
| Schema push fails (legacy rows) | Сначала `linkLegacyTransactions`, потом деплой |

### Миграция legacy transactions

Перед деплоем версии с обязательным `categoryId` (без поля `category`):

```bash
npx convex run migrations:linkLegacyTransactions
# если skipped > 0 и записи без имени — удалить сироты:
npx convex run migrations:removeOrphanTransactions
```

Затем `npx convex deploy` / merge.

## Ручной deploy

```bash
# Фронт локально
npm run build

# Бэкенд
npx convex deploy

# Миграция legacy (один раз после обновления)
npx convex run migrations:linkLegacyTransactions
```

## Откат

- Фронт: redeploy предыдущего commit в Netlify
- Convex: dashboard → history / promote previous deployment (если настроено)
