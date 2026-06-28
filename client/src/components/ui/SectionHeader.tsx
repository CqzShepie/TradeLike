import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

function SectionHeader({
  title,
  subtitle,
  action,
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}

export default SectionHeader;