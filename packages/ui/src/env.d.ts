declare const __MOCK__: boolean;
declare module "virtual:gitask-filter-logic" {
  import type { FilterLogic } from "@host-src/filter-logic.ts";
  export const rangeDate: FilterLogic["rangeDate"];
  export const rangeNorm: FilterLogic["rangeNorm"];
  export const rangeActive: FilterLogic["rangeActive"];
  export const taskDate: FilterLogic["taskDate"];
  export const inRange: FilterLogic["inRange"];
  export const filterBoard: FilterLogic["filterBoard"];
  export const countTasks: FilterLogic["countTasks"];
}
declare module "virtual:gitask-list-logic" {
  import type { ListLogic } from "@host-src/views/list-logic.ts";
  export const LIST_COLUMNS: ListLogic["LIST_COLUMNS"];
  export const listRows: ListLogic["listRows"];
  export const listSort: ListLogic["listSort"];
  export const listFilter: ListLogic["listFilter"];
  export const listOptions: ListLogic["listOptions"];
  export const listView: ListLogic["listView"];
}
