// Canary — EOC Command Dashboard
// Design: Monolith / Precision Studio (stitch/monolith_studio/DESIGN.md)
// Layout: App Shell with icon-rail sidebar + main content + sticky AI panel

const metrics = [
  {
    label: "Active Incidents",
    value: "03",
    sub: "+1/hr",
    subColor: "text-error",
    accent: true,
  },
  {
    label: "Agent Actions",
    value: "12",
    sub: "Pending approval",
    subColor: "text-tertiary",
    accent: false,
  },
  {
    label: "MTTR Estimate",
    value: "8.4m",
    sub: "avg",
    subColor: "text-on-surface-variant",
    accent: false,
  },
  {
    label: "System Health",
    value: "96%",
    sub: "✓",
    subColor: "text-tertiary",
    accent: false,
  },
];

const signalCards = [
  {
    tag: "CRITICAL // RDS",
    tagColor: "text-error",
    title: "Database Replica Lag",
    desc: "Replication lag on us-east-1 RDS cluster exceeded 45s threshold. Primary health check degraded. Potential data-loss window open.",
    source: "Telemetry Validated",
    credibility: 97,
    credibilityColor: "bg-tertiary",
    time: "1:42m ago",
    icon: "storage",
  },
  {
    tag: "LIVE // ECS",
    tagColor: "text-error",
    title: "Container Fleet Degraded",
    desc: "3 of 12 ECS tasks in us-west-2 unhealthy. ALB health checks failing. Traffic shifted to remaining capacity at 78% load.",
    source: "CloudWatch Alerts",
    credibility: 91,
    credibilityColor: "bg-tertiary",
    time: "4:08m ago",
    icon: "cloud_queue",
  },
  {
    tag: "SOCIAL // X",
    tagColor: "text-on-surface-variant",
    title: "Latency Reports Spike",
    desc: "Volume spike in mentions of 'slow' and 'down' from accounts linked to customer segment. 480 unique mentions in 10m window.",
    source: "Social Intelligence",
    credibility: 61,
    credibilityColor: "bg-error",
    time: "7:55m ago",
    icon: "person_search",
  },
  {
    tag: "VERIFIED // ROUTE53",
    tagColor: "text-tertiary",
    title: "DNS Failover Triggered",
    desc: "Route 53 health check failed for api.acme.com. Automatic failover to secondary region initiated. Propagation in progress.",
    source: "Verified Signal",
    credibility: 99,
    credibilityColor: "bg-tertiary",
    time: "11:20m ago",
    icon: "dns",
  },
  {
    tag: "MONITOR // VPC",
    tagColor: "text-on-surface-variant",
    title: "Anomalous Egress Traffic",
    desc: "VPC flow logs show 4× baseline egress from subnet 10.0.4.0/24 to external IPs. Doesn't match known deployment patterns.",
    source: "Traffic Monitor",
    credibility: 54,
    credibilityColor: "bg-error",
    time: "18:33m ago",
    icon: "network_check",
  },
  {
    tag: null,
    title: null,
    desc: null,
    source: null,
    credibility: 0,
    credibilityColor: "",
    time: null,
    icon: "hourglass_empty",
    empty: true,
  },
];

const auditLog = [
  { actor: "Triage Agent", action: "Root cause isolated to RDS replication slot overflow.", time: "1m" },
  { actor: "Orchestrator", action: "Recovery Agent dispatched to execute replica promotion runbook.", time: "2m" },
  { actor: "Base", action: "Runbook step 3/7 complete. Promoting read replica to primary.", time: "4m" },
];

const navItems = [
  { icon: "sensors", label: "Dashboard", active: true },
  { icon: "search_activity", label: "Signal Feed", active: false },
  { icon: "description", label: "Runbooks", active: false },
  { icon: "verified_user", label: "Compliance", active: false },
  { icon: "terminal", label: "Agent Logs", active: false },
];

export default function Dashboard() {
  return (
    <div className="flex min-h-dvh bg-background text-on-background">

      {/* ── Icon-rail sidebar (desktop only) ─────────────────────────── */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 flex-col py-4 w-14 bg-surface-container-low border-r border-outline-variant/15 group hover:w-72 transition-all duration-300 ease-in-out overflow-hidden"
        aria-label="Primary navigation"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-4 px-4 mb-8 overflow-hidden">
          <div className="min-w-[24px] flex justify-center">
            <span className="material-symbols-outlined text-tertiary">sensors</span>
          </div>
          <span className="font-bold uppercase tracking-widest text-xs text-on-surface whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            Canary
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 px-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-4 px-2 py-2.5 rounded-lg transition-all ${
                item.active
                  ? "bg-surface-container-high text-tertiary"
                  : "text-on-surface/60 hover:text-on-surface hover:bg-surface-container-high"
              }`}
              aria-label={item.label}
              aria-current={item.active ? "page" : undefined}
            >
              <div className="min-w-[24px] flex justify-center">
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              </div>
              <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        {/* Operator identity */}
        <div className="px-3 pt-4 border-t border-outline-variant/15 flex items-center gap-3 overflow-hidden">
          <div className="min-w-[32px] h-8 w-8 rounded-lg bg-tertiary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-tertiary text-[18px]">account_circle</span>
          </div>
          <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            <span className="text-sm font-semibold text-on-surface">Operator 01</span>
            <span className="text-[10px] text-on-surface-variant">Lead Engineer</span>
          </div>
        </div>
      </aside>

      {/* ── Main content area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:pl-14">

        {/* ── Top App Bar ──────────────────────────────────────────── */}
        <header className="fixed top-0 left-0 right-0 lg:left-14 z-40 h-14 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/15 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary lg:hidden">sensors</span>
            <h1 className="font-bold text-base tracking-tighter text-on-surface">
              Canary
              <span className="font-normal text-on-surface-variant ml-2 text-sm hidden sm:inline">
                | INC-001
              </span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-6" aria-label="Section navigation">
            <a className="text-xs font-semibold tracking-widest uppercase text-tertiary px-2 py-1" href="#">Dashboard</a>
            <a className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-colors px-2 py-1 rounded" href="#">Runbooks</a>
            <a className="text-xs font-semibold tracking-widest uppercase text-on-surface-variant hover:text-on-surface hover:bg-surface-bright/50 transition-colors px-2 py-1 rounded" href="#">Compliance</a>
          </nav>

          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-tertiary" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-tertiary hidden sm:block">Live</span>
            </div>
            <div className="h-8 w-8 rounded-lg bg-surface-container-high border border-outline-variant/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">account_circle</span>
            </div>
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────── */}
        <main className="pt-20 pb-24 px-4 sm:px-6 max-w-7xl mx-auto w-full space-y-10">

          {/* ── Metrics bento row ──────────────────────────────────── */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-label="Key metrics">
            {metrics.map((m) => (
              <div
                key={m.label}
                className={`bg-surface-container-low p-5 rounded-xl flex flex-col justify-between ${
                  m.accent ? "border-l-2 border-tertiary" : ""
                }`}
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.2rem] text-on-surface-variant">
                  {m.label}
                </span>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-on-surface">{m.value}</span>
                  <span className={`text-xs font-medium ${m.subColor}`}>{m.sub}</span>
                </div>
              </div>
            ))}
          </section>

          {/* ── Main two-column content ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT — System topology + signal stream ─────────────── */}
            <div className="lg:col-span-7 space-y-10">

              {/* Incident header card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 p-7 bg-surface-container-low border border-outline-variant/15 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.2rem] text-error">
                        Active Incident
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-on-surface">
                      RDS Cluster Degradation
                    </h2>
                    <p className="text-on-surface-variant text-sm leading-relaxed max-w-md">
                      Replication failure on primary us-east-1 database cluster. Blast radius: 3 downstream services. RTO window: 12 minutes.
                    </p>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      className="bg-tertiary-gradient px-5 py-2 rounded-lg text-white font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
                      aria-label="Deploy response"
                    >
                      <span className="material-symbols-outlined text-[16px]">emergency</span>
                      Deploy Recovery
                    </button>
                    <button
                      className="px-5 py-2 bg-secondary-container text-on-secondary-container font-semibold text-sm rounded-lg hover:bg-surface-bright transition-colors"
                      aria-label="View full incident report"
                    >
                      Full Report
                    </button>
                  </div>
                </div>

                {/* Global system status mini-card */}
                <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-xl p-5 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                        System Load
                      </span>
                      <span className="material-symbols-outlined text-tertiary text-[18px]">shield</span>
                    </div>
                    {[
                      { label: "CPU Cluster", pct: 68 },
                      { label: "DB Connections", pct: 89, warn: true },
                      { label: "Signal Integrity", pct: 96 },
                    ].map((bar) => (
                      <div key={bar.label} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-on-surface-variant">{bar.label}</span>
                          <span className={bar.warn ? "text-error" : "text-on-surface"}>{bar.pct}%</span>
                        </div>
                        <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${bar.warn ? "bg-error" : "bg-tertiary"}`}
                            style={{ width: `${bar.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-outline-variant/15 mt-2">
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      OPERATOR: 01 // STATION: ALPHA
                    </span>
                  </div>
                </div>
              </div>

              {/* Signal feed filters */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-on-surface">Live Signal Stream</h3>
                    <p className="text-on-surface-variant text-xs mt-0.5">Correlated signals within active blast radius</p>
                  </div>
                  <button className="text-tertiary text-xs font-bold uppercase tracking-widest hover:bg-surface-bright/50 px-3 py-1.5 rounded-lg transition-colors">
                    View All
                  </button>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-thin mb-6">
                  {["All Signals", "CloudWatch", "Social Intel", "Telemetry", "Logs", "Sat-Comms"].map((f, i) => (
                    <button
                      key={f}
                      className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-colors ${
                        i === 0
                          ? "bg-tertiary text-white"
                          : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>

                {/* Signal cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {signalCards.map((card, i) => (
                    <article
                      key={i}
                      className="bg-surface-container-low border border-outline-variant/15 rounded-xl overflow-hidden group hover:border-outline-variant/30 transition-colors"
                    >
                      {card.empty ? (
                        <div className="h-36 flex flex-col items-center justify-center opacity-30">
                          <span className="material-symbols-outlined text-4xl text-outline-variant animate-pulse">
                            hourglass_empty
                          </span>
                          <p className="text-[10px] font-bold tracking-[0.3rem] uppercase text-outline-variant mt-2">
                            Awaiting Feed…
                          </p>
                        </div>
                      ) : (
                        <div className="p-5 space-y-3">
                          {/* Tag + time */}
                          <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-bold tracking-widest uppercase ${card.tagColor}`}>
                              {card.tag}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-mono">{card.time}</span>
                          </div>

                          {/* Icon + title */}
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-surface-container-highest flex items-center justify-center shrink-0 mt-0.5">
                              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">{card.icon}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-on-surface uppercase tracking-tight">
                                {card.title}
                              </h4>
                              <p className="text-xs text-on-surface-variant leading-relaxed mt-1 line-clamp-2">
                                {card.desc}
                              </p>
                            </div>
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-3 border-t border-outline-variant/10">
                            <span className="text-[10px] font-bold tracking-widest uppercase text-on-surface-variant">
                              {card.source}
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[9px] uppercase tracking-tighter text-on-surface-variant">
                                AI Credibility
                              </span>
                              <div className="w-14 h-1 bg-surface-container-high rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${card.credibilityColor}`}
                                  style={{ width: `${card.credibility}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — Sticky AI recommendation panel ─────────────── */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-20 space-y-5">

                {/* AI Strategy card */}
                <div className="bg-surface-container-high rounded-2xl p-7 border border-outline-variant/20 shadow-[0_0_32px_0_rgba(231,229,228,0.08)]">
                  <div className="flex items-center gap-3 mb-7">
                    <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-tertiary">neurology</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-[0.2rem]">
                        AI Strategy Recommendation
                      </p>
                      <p className="text-tertiary text-sm font-medium">Confidence Score: 91.7%</p>
                    </div>
                  </div>

                  {/* Action sequence */}
                  <div className="space-y-5 mb-8">
                    <div className="p-5 bg-surface-container-lowest rounded-xl border-l-2 border-tertiary">
                      <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mb-2">
                        Action Sequence
                      </p>
                      <p className="text-on-surface text-base font-medium leading-snug">
                        Promote us-east-1 read replica to primary; reroute application traffic via Route 53 weighted policy.
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3">
                      {[
                        { label: "Data Loss Exposure", value: "~8s RPO" },
                        { label: "Estimated RTO", value: "4.2 min" },
                        { label: "Success Probability", value: "High" },
                        { label: "Affected Services", value: "3 of 11" },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex justify-between items-center text-sm border-b border-outline-variant/10 pb-2 last:border-0"
                        >
                          <span className="text-on-surface-variant">{stat.label}</span>
                          <span className="text-on-surface font-mono">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA buttons — destructive action requires explicit confirm */}
                  <button
                    className="w-full py-3.5 rounded-xl bg-tertiary-gradient text-white font-bold text-sm tracking-widest uppercase shadow-lg shadow-tertiary/20 hover:opacity-90 transition-all flex items-center justify-center gap-3 group active:scale-95 duration-100"
                    aria-label="Approve replica promotion and traffic failover"
                  >
                    Approve Failover
                    <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                      chevron_right
                    </span>
                  </button>
                  <button
                    className="w-full mt-3 py-2.5 rounded-xl bg-surface-container-highest text-on-surface-variant font-semibold text-xs tracking-widest uppercase hover:text-on-surface transition-colors"
                    aria-label="Dismiss recommendation and override manually"
                  >
                    Dismiss &amp; Manual Override
                  </button>
                </div>

                {/* Active comms / audit log */}
                <div className="bg-surface-container-low rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                      Agent Audit Log
                    </span>
                    <span className="text-[10px] text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  </div>
                  <div className="space-y-3">
                    {auditLog.map((entry, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0 mt-1.5" />
                        <p className="text-xs text-on-surface/80">
                          <span className="font-bold text-on-surface">{entry.actor}:</span>{" "}
                          {entry.action}{" "}
                          <span className="text-on-surface-variant font-mono">{entry.time}m ago</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Runbook progress */}
                <div className="bg-surface-container-low rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                      Runbook: RDS Failover v3.1
                    </span>
                    <span className="text-[10px] text-tertiary font-mono">3 / 7</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { step: "Verify replica health", done: true },
                      { step: "Pause application writes", done: true },
                      { step: "Promote replica to primary", done: true },
                      { step: "Update connection strings", done: false, active: true },
                      { step: "Re-enable application writes", done: false },
                      { step: "Validate data integrity", done: false },
                      { step: "Close incident", done: false },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                            s.done
                              ? "bg-tertiary/20"
                              : s.active
                              ? "bg-surface-container-highest border border-tertiary/40"
                              : "bg-surface-container-highest"
                          }`}
                        >
                          {s.done ? (
                            <span className="material-symbols-outlined text-tertiary text-[12px]">check</span>
                          ) : s.active ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/50" />
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            s.done
                              ? "line-through text-on-surface-variant"
                              : s.active
                              ? "text-on-surface font-medium"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {s.step}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── Bottom nav bar (mobile) ───────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 w-full flex justify-around items-center h-16 bg-surface/80 backdrop-blur-xl border-t border-outline-variant/15 z-50 lg:hidden"
        aria-label="Mobile navigation"
      >
        {[
          { icon: "sensors", label: "Home", active: true },
          { icon: "search_activity", label: "Feed", active: false },
          { icon: "explore", label: "Map", active: false },
          { icon: "shield", label: "Secure", active: false },
        ].map((item) => (
          <button
            key={item.label}
            className={`flex flex-col items-center justify-center transition-all active:scale-95 ${
              item.active ? "text-tertiary scale-110" : "text-outline-variant hover:text-on-surface"
            }`}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
          >
            <span
              className="material-symbols-outlined"
              style={item.active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {item.icon}
            </span>
            <span className="text-[8px] font-semibold tracking-[0.1rem] uppercase mt-1">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
