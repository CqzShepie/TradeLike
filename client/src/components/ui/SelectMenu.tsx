import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { classNames } from "./classNames";

export type SelectMenuOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectMenuProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  ariaLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
};

export default function SelectMenu({
  value,
  onChange,
  options,
  ariaLabel = "Select option",
  placeholder = "Select",
  disabled = false,
  hasError = false,
  className,
  buttonClassName,
  menuClassName,
}: SelectMenuProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedOption = options.find(option => option.value === value);
  const enabledOptions = useMemo(() => options.filter(option => !option.disabled), [options]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const selectedIndex = options.findIndex(option => option.value === value && !option.disabled);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options));
  }, [open, options, value]);

  function selectOption(option: SelectMenuOption) {
    if (option.disabled) {
      return;
    }

    onChange(option.value);
    setOpen(false);
  }

  function moveActive(delta: number) {
    if (enabledOptions.length === 0) {
      return;
    }

    let nextIndex = activeIndex;

    for (let count = 0; count < options.length; count++) {
      nextIndex = (nextIndex + delta + options.length) % options.length;

      if (!options[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  }

  return (
    <div ref={rootRef} className={classNames("relative", className)}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-controls={`${id}-listbox`}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen(previous => !previous)}
        onKeyDown={event => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            moveActive(1);
          }

          if (event.key === "ArrowUp") {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            moveActive(-1);
          }

          if (event.key === "Enter" || event.key === " ") {
            if (!open) {
              event.preventDefault();
              setOpen(true);
              return;
            }

            event.preventDefault();
            const option = options[activeIndex];
            if (option) {
              selectOption(option);
            }
          }

          if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className={classNames(
          "flex w-full items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/60 px-4 py-2.5 text-left text-sm font-medium text-white shadow-sm transition",
          "focus:outline-none focus:ring-2 focus:ring-blue-500",
          "disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-slate-900/60 disabled:text-slate-500",
          hasError && "border-red-400/70 focus:border-red-400",
          buttonClassName
        )}
      >
        <span className={classNames("truncate", !selectedOption && "text-slate-500")}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown
          className={classNames("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180 text-blue-300")}
        />
      </button>

      {open && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className={classNames(
            "absolute left-0 right-0 z-[90] mt-2 max-h-72 overflow-auto rounded-xl border border-white/10 bg-slate-950 p-1 shadow-2xl shadow-slate-950/60",
            menuClassName
          )}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={event => event.preventDefault()}
                onClick={() => selectOption(option)}
                className={classNames(
                  "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  selected ? "bg-blue-600 text-white" : "text-slate-200",
                  active && !selected && "bg-slate-800 text-white",
                  option.disabled && "cursor-not-allowed text-slate-600"
                )}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function firstEnabledIndex(options: SelectMenuOption[]) {
  const index = options.findIndex(option => !option.disabled);
  return index >= 0 ? index : 0;
}
