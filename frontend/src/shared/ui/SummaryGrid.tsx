import type { LucideIcon } from "lucide-react";

export interface SummaryCardItem {
  key: string;
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone: "primary" | "slate" | "info" | "violet" | "success" | "danger" | "warning";
}

export function SummaryGrid({
  items,
  activeKey,
  onSelect,
  loading = false,
  className = "",
  columns,
}: {
  items: SummaryCardItem[];
  activeKey?: string;
  onSelect?: (key: string) => void;
  loading?: boolean;
  className?: string;
  columns?: number;
}) {
  return (
    <section
      className={`project-summary-grid ${className}`}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      aria-label="Statistika"
    >
      {items.map((item) => {
        const isSelected = activeKey !== undefined && activeKey === item.key;
        const Component = onSelect ? "button" : "article";
        return (
          <Component
            key={item.key}
            type={onSelect ? "button" : undefined}
            onClick={onSelect ? () => onSelect(item.key) : undefined}
            className={`card project-summary-card ${onSelect ? "clickable" : ""} ${isSelected ? "selected is-active" : ""}`}
            aria-pressed={onSelect ? isSelected : undefined}
          >
            <span className={`project-summary-icon tone-${item.tone}`}>
              <item.icon size={20} />
            </span>
            <span className="project-summary-copy">
              <span className="project-summary-label">{item.label}</span>
              <strong>{loading ? "—" : item.value}</strong>
              {item.hint && <small>{item.hint}</small>}
            </span>
            <span className={`project-summary-spark tone-${item.tone}`} aria-hidden>
              <i /><i /><i /><i /><i />
            </span>
          </Component>
        );
      })}
    </section>
  );
}
