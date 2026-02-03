import React from "react";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "plain" | "stroke";
  interactive?: boolean;
};

export const GXCard = React.forwardRef<HTMLDivElement, Props>(function GXCard(
  { variant = "stroke", interactive = true, className = "", ...props },
  ref
) {
  const v = variant === "stroke" ? "gx-stroke" : "gx-plain";
  const i = interactive ? "gx-hover" : "";
  return <div ref={ref} className={`gx-card ${v} ${i} ${className}`} {...props} />;
});

GXCard.displayName = "GXCard";
