import { useCallback, useState } from "react";
import PropTypes from "prop-types";
import { SectionCard, FormField, btnStyle, inputStyle } from "../../components/ui/UI.jsx";
import RoleSection from "./RoleSection.jsx";

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_VIEW_OPTIONS   = ["Kanban", "My Day", "Inbox", "By Project", "All"];
const PHASE_STYLE_OPTIONS = ["Numeric", "Decimal", "Lettered", "Mixed", "Custom"];
const DENSITY_OPTIONS     = ["Compact", "Comfortable", "Detailed"];

const FOLLOW_UP_MIN = 1;
const FOLLOW_UP_MAX = 90;

// ─── Design tokens (fall back to raw values when CSS vars are not wired up) ──

const SECTION_TITLE_STYLE = {
  fontWeight: 700,
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--text)",
  marginBottom: "var(--space-3, 14px)",
};

const SAVE_ROW_STYLE = {
  marginTop: "var(--space-2, 8px)",
  display: "flex",
  alignItems: "center",
  gap: "var(--space-2, 8px)",
};

const SAVED_HINT_STYLE = {
  fontSize: "var(--font-size-xs, 12px)",
  color: "var(--color-success, #4caf50)",
};

const DIRTY_HINT_STYLE = {
  fontSize: "var(--font-size-xs, 12px)",
  color: "var(--text-muted)",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AppearanceSection({ settings, setSettings, saveAll }) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt,  setSavedAt]  = useState(null);
  const [isDirty,  setIsDirty]  = useState(false);
  const [error,    setError]    = useState(null);

  const set = useCallback((key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSettings((p) => ({ ...p, [key]: val }));
    setIsDirty(true);
    setSavedAt(null);
  }, [setSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await saveAll();
      setSavedAt(new Date());
      setIsDirty(false);
    } catch (err) {
      setError(err?.message || "Save failed — please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SectionCard>
        <div style={SECTION_TITLE_STYLE}>Appearance &amp; defaults</div>

        <FormField label="Theme" htmlFor="theme-select">
          <select
            id="theme-select"
            style={inputStyle}
            value={settings.theme}
            onChange={set("theme")}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>
        </FormField>

        <FormField label="Default task view" htmlFor="task-view-select">
          <select
            id="task-view-select"
            style={inputStyle}
            value={settings.defaultTaskView}
            onChange={set("defaultTaskView")}
          >
            {TASK_VIEW_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </FormField>

        <FormField label="Default roadmap phase style" htmlFor="phase-style-select">
          <select
            id="phase-style-select"
            style={inputStyle}
            value={settings.defaultPhaseType}
            onChange={set("defaultPhaseType")}
          >
            {PHASE_STYLE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </FormField>

        <FormField label="Default follow-up days" htmlFor="follow-up-days">
          <input
            id="follow-up-days"
            style={inputStyle}
            type="number"
            min={FOLLOW_UP_MIN}
            max={FOLLOW_UP_MAX}
            value={settings.followUpDays}
            onChange={set("followUpDays")}
            aria-describedby="follow-up-days-hint"
          />
          <span
            id="follow-up-days-hint"
            style={{ fontSize: "var(--font-size-xs, 12px)", color: "var(--text-muted)" }}
          >
            {FOLLOW_UP_MIN}–{FOLLOW_UP_MAX} days
          </span>
        </FormField>

        <FormField label="Dashboard density" htmlFor="density-select">
          <select
            id="density-select"
            style={inputStyle}
            value={settings.dashboardDensity}
            onChange={set("dashboardDensity")}
          >
            {DENSITY_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </FormField>

        <FormField label="UI animations" htmlFor="animations-toggle">
          <label
            htmlFor="animations-toggle"
            style={{ display: "flex", alignItems: "center", gap: "var(--space-1, 6px)", cursor: "pointer" }}
          >
            <input
              id="animations-toggle"
              type="checkbox"
              checked={settings.enableAnimations}
              onChange={set("enableAnimations")}
              style={{ width: 16, height: 16, accentColor: "var(--accent)" }}
            />
            <span style={{ fontSize: "var(--font-size-xs, 12px)", color: "var(--text-muted)" }}>
              Enable animations
            </span>
          </label>
        </FormField>

        <div style={SAVE_ROW_STYLE}>
          <button
            style={btnStyle("primary")}
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            aria-busy={isSaving}
          >
            {isSaving ? "Saving…" : "Save changes"}
          </button>

          {isDirty && !isSaving && (
            <span style={DIRTY_HINT_STYLE} role="status">Unsaved changes</span>
          )}
          {savedAt && !isDirty && (
            <span style={SAVED_HINT_STYLE} role="status">
              Saved at {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          {error && (
            <span style={{ fontSize: "var(--font-size-xs, 12px)", color: "var(--color-error, #e53935)" }} role="alert">
              {error}
            </span>
          )}
        </div>
      </SectionCard>

      <RoleSection
        settings={settings}
        setSettings={setSettings}
        saveAll={saveAll}
      />
    </>
  );
}

AppearanceSection.propTypes = {
  settings: PropTypes.shape({
    theme:            PropTypes.oneOf(["dark", "light"]).isRequired,
    defaultTaskView:  PropTypes.oneOf(["Kanban", "My Day", "Inbox", "By Project", "All"]).isRequired,
    defaultPhaseType: PropTypes.oneOf(["Numeric", "Decimal", "Lettered", "Mixed", "Custom"]).isRequired,
    followUpDays:     PropTypes.number.isRequired,
    dashboardDensity: PropTypes.oneOf(["Compact", "Comfortable", "Detailed"]).isRequired,
    enableAnimations: PropTypes.bool.isRequired,
    role:             PropTypes.oneOf(["Owner", "Admin", "Staff", "Viewer"]),
  }).isRequired,
  setSettings: PropTypes.func.isRequired,
  saveAll:     PropTypes.func.isRequired,
};
