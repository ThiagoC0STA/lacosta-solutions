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
    iconBg: "bg-red-950/50",
    iconColor: "text-red-400",
    borderColor: "border-red-800/60",
    hoverBg: "hover:bg-red-950/40",
    numberColor: "text-red-400 font-bold",
    rowBg: "border-l-4 border-l-red-500",
    rowHover: "hover:bg-muted/10",
  },
  urgent: {
    iconBg: "bg-amber-950/50",
    iconColor: "text-amber-400",
    borderColor: "border-amber-800/60",
    hoverBg: "hover:bg-amber-950/40",
    numberColor: "text-amber-400 font-bold",
    rowBg: "border-l-4 border-l-amber-500",
    rowHover: "hover:bg-muted/10",
  },
  d8to15: {
    iconBg: "bg-blue-950/50",
    iconColor: "text-blue-400",
    borderColor: "border-blue-800/60",
    hoverBg: "hover:bg-blue-950/40",
    numberColor: "text-blue-400",
    rowBg: "border-l-4 border-l-blue-500",
    rowHover: "hover:bg-muted/10",
  },
  d16to30: {
    iconBg: "bg-indigo-950/50",
    iconColor: "text-indigo-400",
    borderColor: "border-indigo-800/60",
    hoverBg: "hover:bg-indigo-950/40",
    numberColor: "text-indigo-400",
    rowBg: "border-l-4 border-l-indigo-500",
    rowHover: "hover:bg-muted/10",
  },
  birthday: {
    iconBg: "bg-purple-950/50",
    iconColor: "text-purple-400",
    borderColor: "border-purple-800/60",
    hoverBg: "hover:bg-purple-950/40",
    numberColor: "text-purple-400",
  },
  default: {
    iconBg: "bg-slate-800/60",
    iconColor: "text-slate-300",
    borderColor: "border-slate-700/60",
    hoverBg: "hover:bg-slate-800/50",
    numberColor: "text-slate-200",
    rowHover: "hover:bg-slate-800/40",
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


