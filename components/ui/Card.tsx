import { forwardRef } from "react";
import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

function join(...cls: Array<string | false | undefined | null>) {
  return cls.filter(Boolean).join(" ");
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={join(
        "bg-card border border-border",
        "rounded-[var(--radius-lg)]",
        "shadow-[var(--shadow-1)]",
        "transition-[box-shadow,transform]",
        "duration-[var(--dur-base)] ease-[var(--ease-spring)]",
        "hover:-translate-y-[2px] hover:shadow-[var(--shadow-2)]",
        className
      )}
      {...props}
    />
  );
});
