const STATUS_STYLES = {
  NORMAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
  ABNORMAL: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  ERROR: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
};

export default function StatusBadge({ status }) {
  const normalized = (status || "ERROR").toUpperCase();
  const style = STATUS_STYLES[normalized] ?? STATUS_STYLES.ERROR;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {normalized}
    </span>
  );
}
