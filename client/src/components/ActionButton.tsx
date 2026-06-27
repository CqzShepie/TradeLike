type ActionButtonProps = {
  title: string;
  icon: string;
  onClick?: () => void;
};

function ActionButton({
  title,
  icon,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <span className="text-xl">{icon}</span>

      <span className="font-medium">
        {title}
      </span>
    </button>
  );
}

export default ActionButton;