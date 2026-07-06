// Engineer strengths showcase — grouped by team.

export default function EngineerRoster({ roster }) {
  const teams = Object.entries(roster.byTeam).filter(([, members]) => members.length > 0);

  return (
    <section className="space-y-8">
      <header>
        <h2 className="font-label-caps text-label-caps text-primary">ENGINEER STRENGTHS</h2>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Who brings what — mapped to team and Planning Group. Use this when matching funded work
          to the right skillset, not just an open slot.
        </p>
        <p className="mt-1 font-data-mono text-data-mono text-xs text-on-surface-variant">
          {roster.total} engineers · synthetic demo roster
        </p>
      </header>

      {teams.map(([team, members]) => (
        <div key={team} className="technical-border p-4">
          <h3 className="font-label-caps text-label-caps text-primary mb-4">
            {team}
            <span className="text-on-surface-variant font-data-mono text-data-mono text-xs ml-2">
              ({members.length})
            </span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {members.map((eng) => (
              <article
                key={eng.id}
                className="border border-outline-variant p-4 bg-surface-container-lowest"
              >
                <div className="flex flex-wrap justify-between gap-2 items-baseline">
                  <div>
                    <div className="font-headline-sm text-headline-sm text-primary">{eng.name}</div>
                    <div className="font-data-mono text-data-mono text-xs text-on-surface-variant mt-0.5">
                      {eng.id} · {eng.role}
                    </div>
                  </div>
                  <span className="font-data-mono text-data-mono text-xs text-secondary border border-secondary px-2 py-0.5">
                    {eng.talentProfile}
                  </span>
                </div>
                <p className="mt-3 text-sm text-on-surface font-body-md text-body-md leading-snug">
                  {eng.strength}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {eng.skillset.map((skill) => (
                    <span
                      key={skill}
                      className="font-data-mono text-data-mono text-[10px] uppercase tracking-wide border border-outline-variant px-1.5 py-0.5 text-on-surface-variant"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-3 font-data-mono text-data-mono text-[10px] text-on-surface-variant">
                  {eng.planningGroup} · fp {eng.envelope.fingerprint.slice(0, 8)}
                </div>
              </article>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}