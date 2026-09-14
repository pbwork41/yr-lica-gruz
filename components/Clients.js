"use client";
import React, { useState } from "react";
import { rub, fmtDate, daysAgo } from "../lib/calc";
import { C, Field, SectionTitle, th, thR, td, tdR } from "./ui";

const TODAY = new Date();
function daysAgoColor(dateStr) {
  const d = Math.round((TODAY - new Date(dateStr)) / 86400000);
  return d > 30 ? C.red : C.muted;
}
function blankCp() {
  return { name: "", inn: "", kpp: "", legal_address: "", bank_name: "", bank_account: "", bank_bik: "", contact_person: "", contact_phone: "", contact_email: "", rate_hourly: "", payout_hourly: "", rate_container_20: "", rate_container_40: "", payout_container_20: "", payout_container_40: "", vat_included: true, is_active: true };
}

export default function Clients({ byCp, cps, onSave }) {
  const [editing, setEditing] = useState(null);

  if (editing) return <CpForm cp={editing} onSave={(c) => { onSave(c); setEditing(null); }} onCancel={() => setEditing(null)} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13.5, color: C.muted }}>{cps.length} \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u043E\u0432</div>
        <button onClick={() => setEditing(blankCp())} style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u0430</button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 820 }}>
          <thead>
            <tr style={{ background: C.paper, textAlign: "left", color: C.muted, fontSize: 12.5 }}>
              <th style={th}>\u041A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442</th><th style={th}>\u0418\u041D\u041D</th><th style={thR}>\u0417\u0430\u043A\u0430\u0437\u043E\u0432</th>
              <th style={thR}>\u041E\u0431\u043E\u0440\u043E\u0442</th><th style={thR}>\u0421\u0440. \u0447\u0435\u043A</th><th style={thR}>\u0427\u0438\u0441\u0442\u0430\u044F</th>
              <th style={thR}>\u041C\u0430\u0440\u0436\u0430</th><th style={thR}>\u0414\u043E\u043B\u0433\u0438</th><th style={th}>\u041F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0437\u0430\u043A\u0430\u0437</th><th style={thR}></th>
            </tr>
          </thead>
          <tbody>
            {byCp.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                <td style={{ ...td, color: C.muted }} className="num">{c.inn || "\u2014"}</td>
                <td style={tdR} className="num">{c.count}</td>
                <td style={tdR} className="num">{rub(c.revenue)}</td>
                <td style={tdR} className="num">{rub(c.avg)}</td>
                <td style={{ ...tdR, color: C.moss, fontWeight: 600 }} className="num">{rub(c.net)}</td>
                <td style={tdR} className="num">{c.margin.toFixed(1)}%</td>
                <td style={{ ...tdR, color: c.unpaid ? C.red : C.muted }} className="num">{c.unpaid || "\u2014"}</td>
                <td style={{ ...td, color: C.muted, fontSize: 12.5 }}>
                  {c.lastDate ? <>{fmtDate(c.lastDate)} <span style={{ color: daysAgoColor(c.lastDate) }}>\u00B7 {daysAgo(c.lastDate, TODAY)}</span></> : "\u2014"}
                </td>
                <td style={tdR}>
                  <button onClick={() => setEditing(cps.find((x) => x.id === c.id))} style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.muted }}>\u0418\u0437\u043C.</button>
                </td>
              </tr>
            ))}
            {!byCp.length && <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: C.muted }}>\u041D\u0435\u0442 \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u043E\u0432</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CpForm({ cp, onSave, onCancel }) {
  const [f, setF] = useState(cp);
  const set = (k, v) => setF((d) => ({ ...d, [k]: v }));
  const numify = (v) => (v === "" || v == null ? null : +v);

  const save = () => {
    if (!f.name) return;
    onSave({
      ...f,
      rate_hourly: numify(f.rate_hourly), payout_hourly: numify(f.payout_hourly),
      rate_container_20: numify(f.rate_container_20), rate_container_40: numify(f.rate_container_40),
      payout_container_20: numify(f.payout_container_20), payout_container_40: numify(f.payout_container_40),
    });
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, marginBottom: 18 }}>
        {cp.id ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u0430" : "\u041D\u043E\u0432\u044B\u0439 \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionTitle>\u041E\u0441\u043D\u043E\u0432\u043D\u043E\u0435</SectionTitle>
          <Field label="\u041D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 *"><input className="fld" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="\u043D\u0430\u043F\u0440. \u041A\u0414\u0412 \u0413\u0440\u0443\u043F\u043F" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="\u0418\u041D\u041D"><input className="fld" value={f.inn || ""} onChange={(e) => set("inn", e.target.value)} /></Field>
            <Field label="\u041A\u041F\u041F"><input className="fld" value={f.kpp || ""} onChange={(e) => set("kpp", e.target.value)} /></Field>
          </div>
          <Field label="\u042E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0438\u0439 \u0430\u0434\u0440\u0435\u0441"><input className="fld" value={f.legal_address || ""} onChange={(e) => set("legal_address", e.target.value)} /></Field>

          <SectionTitle>\u0411\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u0438\u0435 \u0440\u0435\u043A\u0432\u0438\u0437\u0438\u0442\u044B</SectionTitle>
          <Field label="\u0411\u0430\u043D\u043A"><input className="fld" value={f.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} /></Field>
          <Field label="\u0420\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0439 \u0441\u0447\u0451\u0442"><input className="fld" value={f.bank_account || ""} onChange={(e) => set("bank_account", e.target.value)} /></Field>
          <Field label="\u0411\u0418\u041A"><input className="fld" value={f.bank_bik || ""} onChange={(e) => set("bank_bik", e.target.value)} /></Field>

          <SectionTitle>\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u044B</SectionTitle>
          <Field label="\u041A\u043E\u043D\u0442\u0430\u043A\u0442\u043D\u043E\u0435 \u043B\u0438\u0446\u043E"><input className="fld" value={f.contact_person || ""} onChange={(e) => set("contact_person", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="\u0422\u0435\u043B\u0435\u0444\u043E\u043D"><input className="fld" value={f.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
            <Field label="Email"><input className="fld" value={f.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} /></Field>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionTitle>\u0421\u0442\u0430\u0432\u043A\u0438 \u043A\u043B\u0438\u0435\u043D\u0442\u0443</SectionTitle>
          <Field label="\u0417\u0430 \u0447\u0430\u0441, \u20BD"><input className="fld" type="number" value={f.rate_hourly ?? ""} onChange={(e) => set("rate_hourly", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 20 \u0444\u0443\u0442, \u20BD"><input className="fld" type="number" value={f.rate_container_20 ?? ""} onChange={(e) => set("rate_container_20", e.target.value)} /></Field>
            <Field label="\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 40 \u0444\u0443\u0442, \u20BD"><input className="fld" type="number" value={f.rate_container_40 ?? ""} onChange={(e) => set("rate_container_40", e.target.value)} /></Field>
          </div>

          <SectionTitle>\u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044E</SectionTitle>
          <Field label="\u0417\u0430 \u0447\u0430\u0441, \u20BD"><input className="fld" type="number" value={f.payout_hourly ?? ""} onChange={(e) => set("payout_hourly", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 20 \u0444\u0443\u0442, \u20BD"><input className="fld" type="number" value={f.payout_container_20 ?? ""} onChange={(e) => set("payout_container_20", e.target.value)} /></Field>
            <Field label="\u041A\u043E\u043D\u0442\u0435\u0439\u043D\u0435\u0440 40 \u0444\u0443\u0442, \u20BD"><input className="fld" type="number" value={f.payout_container_40 ?? ""} onChange={(e) => set("payout_container_40", e.target.value)} /></Field>
          </div>

          <SectionTitle>\u041D\u0414\u0421</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            {[[true, "\u0412 \u0442.\u0447. \u041D\u0414\u0421 5%"], [false, "\u041D\u0414\u0421 5% \u0441\u0432\u0435\u0440\u0445\u0443"]].map(([v, l]) => (
              <button key={String(v)} onClick={() => set("vat_included", v)} style={{
                flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13,
                border: `1px solid ${f.vat_included === v ? C.moss : C.line}`,
                background: f.vat_included === v ? C.mossSoft : C.card, color: f.vat_included === v ? C.moss : C.muted,
              }}>{l}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>\u041E\u0442\u043C\u0435\u043D\u0430</button>
        <button onClick={save} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.moss, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
      </div>
    </div>
  );
}
