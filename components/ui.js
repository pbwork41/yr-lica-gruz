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

// Поле выбора с поиском (автодополнение). options: [{value, label, sub}]
export function SearchSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const wrapRef = React.useRef(null);
  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const ql = q.trim().toLowerCase();
  const filtered = ql
    ? options.filter((o) => (o.label + " " + (o.sub || "")).toLowerCase().includes(ql))
    : options;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div className="fld" onClick={() => { setOpen(true); setQ(""); }}
        style={{ cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
        <span style={{ color: selected ? C.ink : C.muted }}>
          {selected ? selected.label : (placeholder || "Выберите…")}
        </span>
        <span style={{ color: C.muted, fontSize: 12 }}>▾</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 50, overflow: "hidden" }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${C.line}` }}>
            <input autoFocus className="fld" placeholder="Поиск…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {filtered.length === 0 && <div style={{ padding: "10px 12px", color: C.muted, fontSize: 13 }}>Ничего не найдено</div>}
            {filtered.map((o) => (
              <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ padding: "9px 12px", cursor: "pointer", fontSize: 14, background: o.value === value ? C.mossSoft : "transparent" }}
                onMouseEnter={(e) => e.currentTarget.style.background = C.paper}
                onMouseLeave={(e) => e.currentTarget.style.background = o.value === value ? C.mossSoft : "transparent"}>
                <div style={{ fontWeight: o.value === value ? 600 : 400 }}>{o.label}</div>
                {o.sub && <div style={{ fontSize: 12, color: C.muted }}>{o.sub}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
