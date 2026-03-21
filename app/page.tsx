export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      <main className="max-w-3xl mx-auto px-8 py-24">

        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🐦</span>
            <span className="text-sm font-mono tracking-widest text-zinc-500 uppercase">Canary</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight leading-tight mb-6">
            AI-Native Disaster<br />Intelligence Platform
          </h1>
          <p className="text-xl text-zinc-400 leading-relaxed max-w-xl">
            Detects, reasons about, and responds to disasters — before they become catastrophes.
          </p>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2 mb-16">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-sm text-zinc-500">System operational · Monitoring active</span>
        </div>

        {/* Core capabilities */}
        <div className="grid grid-cols-1 gap-px bg-zinc-800 border border-zinc-800 rounded-xl overflow-hidden mb-16">
          {[
            {
              label: "Multimodal Ingestion",
              desc: "Voice memos, photos, social posts, and live camera feeds synthesized into a unified operating picture.",
            },
            {
              label: "Multi-Agent Triage",
              desc: "Orchestrator routes alerts to specialist agents — root cause, blast radius, RTO/RPO — automatically.",
            },
            {
              label: "Human-in-the-Loop",
              desc: "Agents handle detection and safe remediation autonomously. Irreversible actions always require human approval.",
            },
            {
              label: "Social Intelligence",
              desc: "Real-time X, Reddit, and Instagram signal analysis. Citizens become involuntary field reporters.",
            },
            {
              label: "Camera Feed AI",
              desc: "Continuous Gemini Vision analysis on keyframes. Flooding, fire spread, structural collapse detected automatically.",
            },
            {
              label: "Compliance Automation",
              desc: "SOC 2, DORA, ISO 22301, HIPAA evidence generated continuously. Audit prep in hours, not weeks.",
            },
          ].map((item) => (
            <div key={item.label} className="bg-zinc-950 px-6 py-5">
              <p className="text-sm font-semibold text-white mb-1">{item.label}</p>
              <p className="text-sm text-zinc-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Stack */}
        <div className="mb-16">
          <p className="text-xs font-mono tracking-widest text-zinc-600 uppercase mb-4">Stack</p>
          <div className="flex flex-wrap gap-2">
            {[
              "Next.js 15",
              "Vercel AI SDK 6",
              "Gemini 2.0 Flash",
              "Vercel Fluid Compute",
              "Vercel Blob",
              "shadcn/ui",
              "Tailwind CSS",
              "TypeScript",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 text-xs font-mono bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-full"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <div className="border-t border-zinc-900 pt-10">
          <p className="text-zinc-600 text-sm leading-relaxed max-w-lg">
            A canary in a coal mine detects danger before it&apos;s visible — giving the people who matter a chance to act before the situation becomes unrecoverable.
          </p>
        </div>

      </main>
    </div>
  );
}
