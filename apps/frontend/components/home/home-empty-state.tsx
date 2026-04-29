export function HomeEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="ops-empty-state-compact rounded-2xl px-4 py-5">
      <p className="text-sm font-semibold text-[var(--ops-text)]">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[var(--ops-text-muted)]">{description}</p>
    </div>
  )
}
