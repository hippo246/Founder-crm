import PropTypes from "prop-types";
import { SectionCard, FormField, btnStyle, inputStyle } from "../../components/ui/UI.jsx";

const ROLE_OPTIONS = ["Owner", "Admin", "Staff", "Viewer"];

const ROLE_DESCRIPTIONS = {
  Owner: "Full access including reset & audit clear",
  Admin: "Add/edit/delete — cannot reset data",
  Staff: "Add/edit operational records only",
  Viewer: "Read-only access",
};

const SECTION_TITLE_STYLE = {
  fontWeight: 700,
  fontSize: "var(--font-size-sm, 13px)",
  color: "var(--text)",
  marginBottom: "var(--space-3, 14px)",
};

const HINT_STYLE = {
  fontSize: "var(--font-size-xs, 12px)",
  color: "var(--text-muted)",
  marginBottom: "var(--space-3, 14px)",
  lineHeight: 1.5,
};

export default function RoleSection({ settings, setSettings, saveAll, isSaving }) {
  const handleRoleChange = (e) => {
    setSettings((p) => ({ ...p, role: e.target.value }));
  };

  const currentRole = settings.role || "Owner";

  return (
    <SectionCard>
      <div style={SECTION_TITLE_STYLE}>Role simulation</div>
      <FormField label="Current role" htmlFor="role-select">
        <select
          id="role-select"
          style={inputStyle}
          value={currentRole}
          onChange={handleRoleChange}
          aria-describedby="role-description"
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </FormField>
      <p id="role-description" style={HINT_STYLE}>
        {ROLE_DESCRIPTIONS[currentRole]}
      </p>
      <button
        style={btnStyle("primary")}
        onClick={saveAll}
        disabled={isSaving}
        aria-busy={isSaving}
      >
        {isSaving ? "Applying…" : "Apply role"}
      </button>
    </SectionCard>
  );
}

RoleSection.propTypes = {
  settings: PropTypes.shape({
    role: PropTypes.oneOf(["Owner", "Admin", "Staff", "Viewer"]),
  }).isRequired,
  setSettings: PropTypes.func.isRequired,
  saveAll: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
};
