import * as React from "react";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  className = "",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div
      className={`flex flex-col gap-4 ${centered ? "items-center text-center" : "items-start text-left"} ${className}`}
    >
      {eyebrow ? (
        <span className="eyebrow flex items-center gap-3">
          <span className="h-px w-8 bg-gold" />
          {eyebrow}
          {centered ? <span className="h-px w-8 bg-gold" /> : null}
        </span>
      ) : null}
      <h2 className="text-balance font-display text-4xl leading-tight md:text-5xl">{title}</h2>
      {intro ? (
        <p className={`text-muted-foreground ${centered ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>
          {intro}
        </p>
      ) : null}
    </div>
  );
}
