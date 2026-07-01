type LoadingStateProps = {
  title?: string;
  description?: string;
  tone?: "light" | "dark";
};

export default function LoadingState({
  title = "Loading",
  description = "Fetching the latest information.",
  tone = "dark",
}: LoadingStateProps) {
  const isDark = tone === "dark";

  return (
    <div
      className={
        isDark
          ? "rounded-2xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/20"
          : "rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"
      }
    >
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      <h3 className={isDark ? "mt-4 text-base font-bold text-white" : "mt-4 text-base font-bold text-slate-950"}>
        {title}
      </h3>
      <p className={isDark ? "mt-2 text-sm leading-6 text-slate-400" : "mt-2 text-sm leading-6 text-slate-500"}>
        {description}
      </p>
    </div>
  );
}
