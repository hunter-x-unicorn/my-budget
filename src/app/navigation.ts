import {
  IconAccount,
  IconAdd,
  IconAnalytics,
  IconHistory,
  IconTable,
} from "../shared/ui/NavIcons";

export const TAB_INDEX = {
  table: 0,
  history: 1,
  add: 2,
  analytics: 3,
  account: 4,
} as const;

export const TAB_COUNT = 5;

export const BOTTOM_NAV_TABS = [
  { id: "table", label: "Таблица", Icon: IconTable },
  { id: "history", label: "История", Icon: IconHistory },
  { id: "add", label: "Добавить", Icon: IconAdd, primary: true },
  { id: "analytics", label: "Аналитика", Icon: IconAnalytics },
  { id: "account", label: "Аккаунт", Icon: IconAccount },
] as const;
