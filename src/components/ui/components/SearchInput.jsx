import { inputStyle } from "../styles.js";

export default function SearchInput({ value, onChange, placeholder = "Search…" }) {
  return (
    <input
      style={inputStyle}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
