import { SectionCard, ProgressBar } from "../../components/ui/UI.jsx";
import { LEAD_STAGES as RAW_LEAD_STAGES } from "../../config/crmConfig.js";

const STAGE_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#94a3b8","#34d399"];
// Normalize — config exports plain strings, we need objects
const LEAD_STAGES = RAW_LEAD_STAGES.map((s, i) =>
  typeof s === "string" ? { id: s, label: s, color: STAGE_COLORS[i % STAGE_COLORS.length] } : s
);

function fmtValue(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

export default function LeadsPipeline({ leads, onNavigate }) {
  const pipeline = LEAD_STAGES.map(stage => ({
    ...stage,
    count: leads.filter(l => l.stage === stage.id || l.stage === stage.label).length,
    value: leads.filter(l => l.stage === stage.id || l.stage === stage.label).reduce((sum, l) => sum + (Number(l.value) || 0), 0),
  }));

  const totalValue = leads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const maxCount = Math.max(...pipeline.map(p => p.count), 1);
  const wonCount = leads.filter(l => l.stage === "won" || l.status === "Won").length;
  const winRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  return (
    <SectionCard style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>
          Leads Pipeline
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {leads.length > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: "#10b981", background: "rgba(16,185,129,0.1)", borderRadius: 6, padding: "2px 7px" }}>
              {winRate}% win rate
            </span>
          )}
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
            {fmtValue(totalValue)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pipeline.map(stage => (
          <div
            key={stage.id}
            onClick={() => onNavigate?.("leads", stage.id)}
            style={{ cursor: onNavigate ? "pointer" : "default" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5, color: "var(--text-muted)", fontWeight: 500 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: stage.color, display: "inline-block", flexShrink: 0 }} />
                {stage.label}
              </span>
              <span style={{ display: "flex", gap: 8, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>{stage.count}</span>
                {stage.value > 0 && <span style={{ color: stage.color, fontWeight: 600 }}>{fmtValue(stage.value)}</span>}
              </span>
            </div>
            <ProgressBar value={stage.count} max={maxCount} color={stage.color} />
          </div>
        ))}
      </div>
      {leads.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
          No leads yet — add your first lead to get started.
        </div>
      )}
    </SectionCard>
  );
}
