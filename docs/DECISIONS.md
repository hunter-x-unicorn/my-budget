# Архитектурные решения (ADR-lite)

## categoryId без денормализованного `category`

**Решение:** в `transactions` хранится только `categoryId`. Имя категории подставляется при чтении (join с `categories`).

**Почему:** при переименовании категории история и аналитика показывали старое имя. Вариант «патчить все transactions при rename» хуже по объёму записей и гонкам.

**Миграция:** internal mutation `linkLegacyTransactions` привязывает старые записи без `categoryId` по паре `type` + имя из поля `category` (legacy). После миграции поле `category` удалено из схемы.

## month — 0-based (как в JavaScript `Date`)

`month: 0` = январь, `11` = декабрь. Совпадает с `Date.getMonth()` на клиенте и сервере.

Валидаторы: `month` в диапазоне 0–11, `year` в разумном диапазоне (2000–2100).

## dateKey — формат `YYYY-M-D`

Единый ключ дня для ячеек таблицы: `` `${year}-${month}-${day}` `` где **все три компонента 0-based для month**, day — число дня 1…31.

Пример: 15 марта 2026 → `2026-2-15` (month=2).

**Не путать** с ISO `YYYY-MM-DD` для `<input type="date">` на клиенте — там month 1-based в строке.

Функции: `convex/lib/dates.ts`, `src/shared/lib/dates.ts` (зеркало для UI).

## timestamp операции

`date` — Unix ms. При создании клиент передаёт полночь/local noon выбранного дня (`fromDateInputValue`). Fallback `Date.now()` только если дата не передана (редко).

## cells в tableForMonth — массив, не Record

Convex не поддерживает объекты с динамическими ключами (в т.ч. кириллица) в ответах query. Агрегаты таблицы — `cells: Array<{ categoryId, date, income, expense }>`.

## monthBundle — один query на месяц

Вместо трёх отдельных запросов (`listForMonth`, `summaryForMonth`, `tableForMonth`) — `transactions.monthBundle` возвращает transactions + summary + table за один проход по индексу `by_user_date`.

## seed категорий

`categories.bootstrap` — идемпотентная mutation, один вызов из `BudgetApp` при входе. Не вызывается из `AddTab` / `AccountTab`.

`seedDefaultsIfEmpty` — internal (для cron/админ-задач при необходимости).

## ensureDefaults удалён

Публичная `ensureDefaults` заменена на `bootstrap`.
