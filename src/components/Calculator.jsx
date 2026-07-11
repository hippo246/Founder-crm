import { useState, useEffect } from "react";
import { inputStyle, btnStyle } from "./ui/UI.jsx";
import { convertCurrency } from "../lib/storage.js";

const CURRENCIES = [
  { code: "INR", symbol: "₹" },
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "GBP", symbol: "£" },
  { code: "AED", symbol: "د.إ" },
  { code: "CAD", symbol: "C$" },
  { code: "AUD", symbol: "A$" },
  { code: "SGD", symbol: "S$" }
];

export default function Calculator({ exchangeRates, defaultCurrency }) {
  const [display, setDisplay] = useState("0");
  const [memory, setMemory] = useState("");
  const [operator, setOperator] = useState(null);
  const [fromCurrency, setFromCurrency] = useState(defaultCurrency || "INR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [showConverter, setShowConverter] = useState(false);
  const [conversionValue, setConversionValue] = useState(null);

  const handleNumber = (num) => {
    if (display === "0") {
      setDisplay(num);
    } else {
      setDisplay(display + num);
    }
  };

  const handleDecimal = () => {
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const handleOperator = (op) => {
    setMemory(display);
    setOperator(op);
    setDisplay("0");
  };

  const handleClear = () => {
    setDisplay("0");
    setMemory("");
    setOperator(null);
  };

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay("0");
    }
  };

  const calculate = () => {
    if (!memory || !operator) return;

    const prev = parseFloat(memory);
    const current = parseFloat(display);
    let result;

    switch (operator) {
      case "+":
        result = prev + current;
        break;
      case "-":
        result = prev - current;
        break;
      case "×":
        result = prev * current;
        break;
      case "÷":
        result = current !== 0 ? prev / current : 0;
        break;
      case "%":
        result = (prev * current) / 100;
        break;
      default:
        return;
    }

    setDisplay(result.toString());
    setMemory("");
    setOperator(null);
  };

  // Update conversion value when inputs change
  useEffect(() => {
    if (showConverter) {
      const value = parseFloat(display);
      if (!isNaN(value)) {
        const converted = convertCurrency(value, fromCurrency, toCurrency, exchangeRates);
        setConversionValue(converted);
      }
    }
  }, [display, fromCurrency, toCurrency, showConverter, exchangeRates]);

  const toggleConverter = () => {
    setShowConverter(!showConverter);
    if (!showConverter) {
      const value = parseFloat(display);
      if (!isNaN(value)) {
        const converted = convertCurrency(value, fromCurrency, toCurrency, exchangeRates);
        setConversionValue(converted);
      }
    }
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        style={{ ...btnStyle("ghost", "sm"), padding: "5px 9px", fontSize: 14 }}
        onClick={() => {
          const dropdown = document.getElementById("calculator-dropdown");
          if (dropdown) {
            dropdown.style.display = dropdown.style.display === "none" ? "block" : "none";
          }
        }}
        title="Calculator"
      >
        📱
      </button>

      <div
        id="calculator-dropdown"
        style={{
          display: "none",
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 8,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-md)",
          padding: 16,
          width: 300,
          boxShadow: "var(--shadow-md)",
          zIndex: 1000
        }}
      >
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Calculator</div>
          <button
            style={{ ...btnStyle("ghost", "sm"), padding: "2px 6px" }}
            onClick={() => {
              const dropdown = document.getElementById("calculator-dropdown");
              if (dropdown) dropdown.style.display = "none";
            }}
          >
            ✕
          </button>
        </div>

        {/* Display */}
        <div
          style={{
            background: "var(--input-bg)",
            padding: 16,
            borderRadius: "var(--r-sm)",
            marginBottom: 12,
            textAlign: "right",
            fontSize: 24,
            fontWeight: 600,
            minHeight: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end"
          }}
        >
          {display}
        </div>

        {/* Calculator Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          <button style={btnStyle("ghost", "sm")} onClick={handleClear}>C</button>
          <button style={btnStyle("ghost", "sm")} onClick={handleBackspace}>⌫</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleOperator("%")}>%</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleOperator("÷")}>÷</button>

          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("7")}>7</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("8")}>8</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("9")}>9</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleOperator("×")}>×</button>

          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("4")}>4</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("5")}>5</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("6")}>6</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleOperator("-")}>-</button>

          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("1")}>1</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("2")}>2</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("3")}>3</button>
          <button style={btnStyle("ghost", "sm")} onClick={() => handleOperator("+")}>+</button>

          <button style={btnStyle("ghost", "sm")} onClick={() => handleNumber("0")} style={{ gridColumn: "span 2" }}>0</button>
          <button style={btnStyle("ghost", "sm")} onClick={handleDecimal}>.</button>
          <button style={btnStyle("primary", "sm")} onClick={calculate}>=</button>
        </div>

        {/* Converter Toggle */}
        <div style={{ marginTop: 16 }}>
          <button
            style={{ ...btnStyle("ghost", "sm"), width: "100%", border: "1px solid var(--border)" }}
            onClick={toggleConverter}
          >
            {showConverter ? "Hide Converter" : "Show Currency Converter"}
          </button>
        </div>

        {/* Converter */}
        {showConverter && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <select
                style={{ ...inputStyle, flex: 1 }}
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
              <button style={btnStyle("ghost", "sm")} onClick={swapCurrencies}>⇄</button>
              <select
                style={{ ...inputStyle, flex: 1 }}
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                ))}
              </select>
            </div>

            {conversionValue !== null && (
              <div
                style={{
                  background: "var(--success-dim)",
                  padding: 12,
                  borderRadius: "var(--r-sm)",
                  textAlign: "center",
                  fontSize: 18,
                  fontWeight: 600,
                  color: "var(--success)"
                }}
              >
                {CURRENCIES.find(c => c.code === toCurrency)?.symbol || ""}
                {conversionValue.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
