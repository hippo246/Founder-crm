import { SectionCard, FormField, btnStyle, inputStyle } from "../../components/ui/UI.jsx";

export default function BusinessSection({ settings, setSettings, saveAll }) {
  const set = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setSettings(p => ({ ...p, [key]: val }));
  };

  return (
    <SectionCard>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text)", marginBottom: 14 }}>Business Profile</div>
      <FormField label="Business / System name">
        <input style={inputStyle} value={settings.businessName || ""} onChange={set("businessName")} />
      </FormField>
      <FormField label="Owner name">
        <input style={inputStyle} value={settings.ownerName || ""} onChange={set("ownerName")} />
      </FormField>
      <FormField label="Owner email">
        <input style={inputStyle} type="email" value={settings.ownerEmail || ""} onChange={set("ownerEmail")} />
      </FormField>
      <FormField label="Owner phone">
        <input style={inputStyle} value={settings.ownerPhone || ""} onChange={set("ownerPhone")} />
      </FormField>
      <FormField label="Business address">
        <textarea style={{ ...inputStyle, minHeight: 60 }} value={settings.ownerAddress || ""} onChange={set("ownerAddress")} />
      </FormField>
      <FormField label="Website">
        <input style={inputStyle} value={settings.businessWebsite || ""} onChange={set("businessWebsite")} placeholder="https://" />
      </FormField>
      <FormField label="Business ID / GSTIN (optional)">
        <input style={inputStyle} value={settings.businessId || ""} onChange={set("businessId")} />
      </FormField>
      <FormField label="Tax ID / VAT Number">
        <input style={inputStyle} value={settings.taxId || ""} onChange={set("taxId")} />
      </FormField>
      <FormField label="Registration Number / CIN">
        <input style={inputStyle} value={settings.registrationNumber || ""} onChange={set("registrationNumber")} />
      </FormField>
      <FormField label="Support Email">
        <input style={inputStyle} type="email" value={settings.supportEmail || ""} onChange={set("supportEmail")} />
      </FormField>
      <FormField label="Support Phone">
        <input style={inputStyle} value={settings.supportPhone || ""} onChange={set("supportPhone")} />
      </FormField>
      <div style={{ marginTop: 8 }}>
        <button style={btnStyle("primary")} onClick={saveAll}>Save</button>
      </div>
    </SectionCard>
  );
}
