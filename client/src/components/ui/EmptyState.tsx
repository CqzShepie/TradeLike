type EmptyStateProps = {
  title: string;
  description?: string;
};

function EmptyState({
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-8 py-12 text-center">
      <h3 className="text-lg font-semibold text-slate-900">
        {title}
      </h3>

      {description && (
        <p className="mt-2 text-sm text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

export default EmptyState;