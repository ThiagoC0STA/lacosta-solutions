export type StatusColor = "overdue" | "urgent" | "d8to15" | "d16to30" | "birthday" | "default";

export interface ColorScheme {
  iconBg: string;
  iconColor: string;
  borderColor: string;
  hoverBg: string;
  numberColor: string;
  rowBg?: string;
  rowHover?: string;
}

export const statusColors: Record<StatusColor, ColorScheme> = {
  overdue: {
    iconBg: "bg-red-100 dark:bg-red-500/20",
    iconColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-200 dark:border-red-500/30",
    hoverBg: "hover:bg-red-50/80 dark:hover:bg-red-500/25",
    numberColor: "text-red-700 dark:text-red-400",
    rowBg: "bg-red-50/50 dark:bg-red-500/15",
    rowHover: "hover:bg-red-50 dark:hover:bg-red-500/20",
  },
  urgent: {
    iconBg: "bg-orange-100 dark:bg-orange-500/20",
    iconColor: "text-orange-700 dark:text-orange-400",
    borderColor: "border-orange-200 dark:border-orange-500/30",
    hoverBg: "hover:bg-orange-50/80 dark:hover:bg-orange-500/25",
    numberColor: "text-orange-700 dark:text-orange-400",
    rowBg: "bg-orange-50/50 dark:bg-orange-500/15",
    rowHover: "hover:bg-orange-50 dark:hover:bg-orange-500/20",
  },
  d8to15: {
    iconBg: "bg-blue-100 dark:bg-blue-500/20",
    iconColor: "text-blue-700 dark:text-blue-400",
    borderColor: "border-blue-200 dark:border-blue-500/30",
    hoverBg: "hover:bg-blue-50/80 dark:hover:bg-blue-500/25",
    numberColor: "text-blue-700 dark:text-blue-400",
  },
  d16to30: {
    iconBg: "bg-indigo-100 dark:bg-indigo-500/20",
    iconColor: "text-indigo-700 dark:text-indigo-400",
    borderColor: "border-indigo-200 dark:border-indigo-500/30",
    hoverBg: "hover:bg-indigo-50/80 dark:hover:bg-indigo-500/25",
    numberColor: "text-indigo-700 dark:text-indigo-400",
  },
  birthday: {
    iconBg: "bg-purple-100 dark:bg-purple-500/20",
    iconColor: "text-purple-700 dark:text-purple-400",
    borderColor: "border-purple-200 dark:border-purple-500/30",
    hoverBg: "hover:bg-purple-50/80 dark:hover:bg-purple-500/25",
    numberColor: "text-purple-700 dark:text-purple-400",
  },
  default: {
    iconBg: "bg-slate-100 dark:bg-slate-700",
    iconColor: "text-slate-700 dark:text-slate-200",
    borderColor: "border-slate-200 dark:border-slate-600",
    hoverBg: "hover:bg-slate-50 dark:hover:bg-slate-800",
    numberColor: "text-slate-800 dark:text-slate-100",
    rowHover: "hover:bg-blue-50/50 dark:hover:bg-blue-500/15",
  },
};

export function getStatusColor(status: StatusColor): ColorScheme {
  return statusColors[status] || statusColors.default;
}

export function getStatusFromTitle(title: string): StatusColor {
  if (title === "Vencidos") return "overdue";
  if (title.includes("0-7 dias")) return "urgent";
  if (title.includes("8-15 dias")) return "d8to15";
  if (title.includes("16-30 dias")) return "d16to30";
  if (title.includes("Aniversário")) return "birthday";
  return "default";
}


