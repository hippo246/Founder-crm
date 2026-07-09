import { SectionCard, FormField, btnStyle, inputStyle } from "../../components/ui/UI.jsx";

export default function AppearanceSection({ settings, setSettings, saveAll, role }) {
  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSettings(p => ({ ...p, [key]: val }));
  };

  return (
    <>
      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>Appearance & Defaults</div>
        <FormField label="Theme">
          <select style={inputStyle} value={settings.theme || "dark"} onChange={set("theme")}>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </FormField>
        <FormField label="Default task view">
          <select style={inputStyle} value={settings.defaultTaskView || "Kanban"} onChange={set("defaultTaskView")}>
            {["Kanban","My Day","Inbox","By Project","All"].map(v => <option key={v}>{v}</option>)}
          </select>
        </FormField>
        <FormField label="Default roadmap phase style">
          <select style={inputStyle} value={settings.defaultPhaseType || "Numeric"} onChange={set("defaultPhaseType")}>
            {["Numeric","Decimal","Lettered","Mixed","Custom"].map(v => <option key={v}>{v}</option>)}
          </select>
        </FormField>
        <FormField label="Default follow-up days">
          <input style={inputStyle} type="number" value={settings.followUpDays || 3} onChange={set("followUpDays")} />
        </FormField>
        <FormField label="Dashboard density">
          <select style={inputStyle} value={settings.dashboardDensity || "Comfortable"} onChange={set("dashboardDensity")}>
            {["Compact","Comfortable","Detailed"].map(v => <option key={v}>{v}</option>)}
          </select>
        </FormField>
        <FormField label="Enable UI animations">
          <input type="checkbox" checked={settings.enableAnimations !== false} onChange={set("enableAnimations")} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
        </FormField>
        <div style={{ marginTop: 8 }}>
          <button style={btnStyle("primary")} onClick={saveAll}>Save</button>
        </div>
      </SectionCard>

      <SectionCard>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>Role Simulation</div>
        <FormField label="Current role">
          <select style={inputStyle} value={settings.role || "Owner"} onChange={set("role")}>
            {["Owner","Admin","Staff","Viewer"].map(r => <option key={r}>{r}</option>)}
          </select>
        </FormField>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.5 }}>
          <strong style={{ color: "var(--text)" }}>Owner</strong> — full access including reset & audit clear<br />
          <strong style={{ color: "var(--text)" }}>Admin</strong> — add/edit/delete, cannot reset data<br />
          <strong style={{ color: "var(--text)" }}>Staff</strong> — add/edit operational records<br />
          <strong style={{ color: "var(--text)" }}>Viewer</strong> — read only
        </div>
        <button style={btnStyle("primary")} onClick={saveAll}>Apply role</button>
      </SectionCard>
    </>
  );
}
