import { Hexagon } from "lucide-react";
import { Link } from "react-router-dom";
import { classNames } from "../ui/classNames";

type LogoProps = {
  tone?: "light" | "dark";
  className?: string;
};

function Logo({ tone = "light", className }: LogoProps) {
  return (
    <Link
      to="/"
      className={classNames(
        "inline-flex flex-none items-center gap-3 whitespace-nowrap font-bold transition hover:opacity-90",
        className
      )}
    >
      <span
        className={classNames(
          "inline-flex h-10 w-10 items-center justify-center rounded-2xl border",
          tone === "dark"
            ? "border-blue-500/30 bg-blue-500/15 text-blue-300 shadow-sm shadow-blue-950/30"
            : "border-blue-200 bg-blue-50 text-blue-600"
        )}
      >
        <Hexagon className="h-5 w-5" strokeWidth={2.4} />
      </span>
      <span
        className={classNames(
          "whitespace-nowrap text-[1.05rem] leading-none tracking-[0.01em] sm:text-[1.15rem]",
          tone === "dark" ? "text-white" : "text-slate-950"
        )}
      >
        <span className="font-extrabold">TRADE</span>
        <span className="font-extrabold text-blue-400">LIKE</span>
      </span>
    </Link>
  );
}

export default Logo;
