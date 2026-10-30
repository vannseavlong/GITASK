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
