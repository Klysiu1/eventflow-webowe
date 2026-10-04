export default function AlertBanner({ alert }) {
  const isCritical = alert.level === "critical";

  const themeClasses = isCritical
    ? "bg-danger/10 border-danger text-danger"
    : "bg-warning/10 border-warning text-warning";

  const label = isCritical ? "KRYTYCZNE" : "OSTRZEŻENIE";

  return (
    <div className={
        `p-4 rounded-lg flex items-center gap-4 border shadow-lg ${themeClasses}`}>
      <span className="font-black tracking-widest uppercase animate-pulse">
        {label}
      </span>
      <span className="text-gray-200">{alert.message}</span>
    </div>
  );
}
