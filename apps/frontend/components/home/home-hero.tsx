import type { HomeOverview } from "./home-types"

function normalizeTitle(title: string) {
  if (/^buen inicio/i.test(title)) {
    return title.replace(/^buen inicio/i, "Bienvenido")
  }

  return title
}

export function HomeHero({
  hero,
  locationMeta,
}: {
  hero: HomeOverview["hero"]
  locationMeta: string
}) {
  return (
    <header className="space-y-2">
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--ops-text-muted)]">
          {hero.eyebrow}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--ops-text)] md:text-[2rem]">
          {normalizeTitle(hero.title)}
        </h1>
      </div>

      {locationMeta ? (
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
          {locationMeta}
        </p>
      ) : null}
    </header>
  )
}
