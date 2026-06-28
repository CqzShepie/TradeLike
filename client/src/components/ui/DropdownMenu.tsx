import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";

type DropdownItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

type DropdownMenuProps = {
  items: DropdownItem[];
};

function DropdownMenu({ items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
  }, []);

  return (
    <div
      ref={menuRef}
      className="relative"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 transition hover:bg-slate-100"
      >
        <MoreVertical size={18} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                item.danger
                  ? "text-red-600"
                  : "text-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default DropdownMenu;