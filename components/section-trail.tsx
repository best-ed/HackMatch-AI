import Link from "next/link";

type TrailItem = {
  href?: string;
  label: string;
};

export function SectionTrail({ items }: { items: TrailItem[] }) {
  return (
    <nav aria-label="Section trail" className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span className="inline-flex items-center gap-2" key={`${item.label}-${index}`}>
            {item.href && !isLast ? (
              <Link className="rounded-sm outline-none ring-primary/20 transition hover:text-foreground focus-visible:ring-4" href={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-foreground" : undefined}>{item.label}</span>
            )}
            {!isLast ? <span aria-hidden="true">/</span> : null}
          </span>
        );
      })}
    </nav>
  );
}
