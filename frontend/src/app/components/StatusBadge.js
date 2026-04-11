const STATUS_STYLES = {
  NORMAL:   "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:ring-emerald-800",
  ABNORMAL: "bg-red-100 text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-400 dark:ring-red-800",
  ERROR:    "bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700",
  PENDING:  "bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:ring-amber-800",
};

const DOT = {
  NORMAL:   "bg-emerald-500",
  ABNORMAL: "bg-red-500",
  ERROR:    "bg-slate-400",
  PENDING:  "bg-amber-500",
};

export default function StatusBadge({ status }) {
  const key = (status || "ERROR").toUpperCase();
  const style = STATUS_STYLES[key] ?? STATUS_STYLES.ERROR;
  const dot = DOT[key] ?? DOT.ERROR;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {key}
    </span>
  );
}
