"use client";
import React from "react";

export const C = {
  ink: "#12211c", paper: "#f7f6f1", card: "#ffffff", line: "#e3e1d8",
  moss: "#2f6f4e", mossSoft: "#eaf2ec", clay: "#b4532a", gold: "#c99a2e",
  muted: "#6f7770", red: "#a5372b",
};

export function Field({ label, children }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

export function Box({ on }) {
  return (
    <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? C.moss : C.line}`, background: on ? C.moss : "#fff", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>
      {on ? "✓" : ""}
    </span>
  );
}

export function Row({ k, v, c, bold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ color: bold ? C.ink : C.muted, fontWeight: bold ? 600 : 400 }}>{k}</span>
      <span className="num" style={{ color: c || C.ink, fontWeight: bold ? 700 : 500 }}>{v}</span>
    </div>
  );
}

export function Stat({ label, value, sub, accent }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "16px 18px" }}>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>{label}</div>
      <div className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 26, fontWeight: 600, color: accent || C.ink, letterSpacing: "-0.01em" }}>{value}</div>
      {sub && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.moss, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 4 }}>{children}</div>;
}

export const th = { padding: "12px 14px", fontWeight: 500 };
export const thR = { ...th, textAlign: "right" };
export const td = { padding: "12px 14px" };
export const tdR = { ...td, textAlign: "right" };
