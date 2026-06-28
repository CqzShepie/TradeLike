import type { HTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  padded?: boolean;
} & HTMLAttributes<HTMLDivElement>;

function Card({
  children,
  className = "",
  padded = true,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-slate-200 bg-white shadow-sm transition-all",
        padded ? "p-6" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;