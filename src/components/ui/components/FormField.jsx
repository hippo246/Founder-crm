export default function FormField({ label, required, children }) {
  return (
    <div className="form-field">
      <label className="field-label">{label}{required && <span style={{ color: "var(--danger)", marginLeft: 3 }}>*</span>}</label>
      {children}
    </div>
  );
}
