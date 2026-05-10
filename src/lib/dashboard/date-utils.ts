import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  subMonths,
  formatISO 
} from "date-fns";

export type DatePreset = 
  | "today" 
  | "yesterday" 
  | "last7days" 
  | "last30days" 
  | "thisMonth" 
  | "lastMonth" 
  | "custom";

export function getDateRange(preset: DatePreset, from?: string, to?: string) {
  const now = new Date();
  
  let startDate: Date;
  let endDate: Date = endOfDay(now);

  switch (preset) {
    case "today":
      startDate = startOfDay(now);
      break;
    case "yesterday":
      startDate = startOfDay(subDays(now, 1));
      endDate = endOfDay(subDays(now, 1));
      break;
    case "last7days":
      startDate = startOfDay(subDays(now, 7));
      break;
    case "last30days":
      startDate = startOfDay(subDays(now, 30));
      break;
    case "thisMonth":
      startDate = startOfMonth(now);
      break;
    case "lastMonth":
      startDate = startOfMonth(subMonths(now, 1));
      endDate = endOfMonth(subMonths(now, 1));
      break;
    case "custom":
      startDate = from ? startOfDay(new Date(from)) : startOfDay(subDays(now, 30));
      endDate = to ? endOfDay(new Date(to)) : endOfDay(now);
      break;
    default:
      startDate = startOfDay(subDays(now, 30));
  }

  return {
    from: formatISO(startDate),
    to: formatISO(endDate)
  };
}
