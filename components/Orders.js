"use client";
import React, { useState } from "react";
import { calcOrder, rub, rub2, fmtDate, WORK_TYPES } from "../lib/calc";
import { C, Field, Box, Row } from "./ui";

function blankOrder(cps) {
  return {
    order_date: new Date().toISOString().slice(0, 10), paid_date: "",
    counterparty_id: cps[0]?.id || "", work_type: "container_40",
    revenue: 0, payout: 0, hours: "", workers_count: "",
    payment_method: "cashless", is_paid: false, invoice_number: "",
    calc_smz_service: true, calc_smz_tax: true, calc_logist: true, calc_ads: true,
  };
}

export default function Orders({ rows, cps, onSave, onDelete }) {
  const [draft, setDraft] = useState(null);

  if (draft) {
    return <OrderForm draft={draft} setDraft={setDraft} cps={cps}
      onSave={(o) => { onSave(o); setDraft(null); }} onCancel={() => setDraft(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13.5, color: C.muted }}>{rows.length} \u0437\u0430\u044F\u0432\u043E\u043A</div>
        <button onClick={() => setDraft(blankOrder(cps))} disabled={!cps.length}
          style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: cps.length ? 1 : 0.5 }}>
          + \u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443
        </button>
      </div>
      {!cps.length && <div style={{ color: C.muted, fontSize: 13 }}>\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u0430 \u0432\u043E \u0432\u043A\u043B\u0430\u0434\u043A\u0435 \u00AB\u041A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442\u044B\u00BB.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => <OrderCard key={r.id} r={r} onEdit={() => setDraft(r)} onDelete={() => onDelete(r.id)} />)}
      </div>
    </div>
  );
}

function OrderCard({ r, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const c = r.calc;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>{r.cp?.name || "\u2014"}</span>
            <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: r.payment_method === "cash" ? "#f3ecdd" : C.mossSoft, color: r.payment_method === "cash" ? C.gold : C.moss, fontWeight: 600 }}>
              {r.payment_method === "cash" ? "\u041D\u0430\u043B\u0438\u0447\u043D\u044B\u0435" : "\u0411\u0435\u0437\u043D\u0430\u043B"}
            </span>
            {!r.is_paid && <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: "#f7e7e3", color: C.red, fontWeight: 600 }}>\u041D\u0435 \u043E\u043F\u043B\u0430\u0447\u0435\u043D\u043E</span>}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
            {fmtDate(r.order_date)} \u00B7 {WORK_TYPES[r.work_type] || r.work_type}
            {r.workers_count ? ` \u00B7 ${r.workers_count} \u0447\u0435\u043B.` : ""}{r.hours ? ` \u00B7 ${r.hours} \u0447` : ""}{r.invoice_number ? ` \u00B7 ${r.invoice_number}` : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="num" style={{ fontSize: 12.5, color: C.muted }}>{rub(r.revenue)}</div>
          <div className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: C.moss }}>{rub(c.net)}</div>
        </div>
        <div style={{ color: C.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>{"\u203A"}</div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.line}`, padding: "16px 18px", background: "#fbfbf8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 28px", fontSize: 13.5 }}>
            <Row k="\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u043E\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u0430" v={rub2(r.revenue)} />
            <Row k="\u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F\u043C" v={"\u2212 " + rub2(r.payout)} />
            {c.vat > 0 && <Row k="\u041D\u0414\u0421 5% (\u043A \u0443\u043F\u043B\u0430\u0442\u0435)" v={"\u2212 " + rub2(c.vat)} c={C.clay} />}
            {c.smz3 > 0 && <Row k="\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F \u0421\u0417 3%" v={"\u2212 " + rub2(c.smz3)} />}
            {c.smz6 > 0 && <Row k="\u041D\u0430\u043B\u043E\u0433 \u0421\u0417 6%" v={"\u2212 " + rub2(c.smz6)} />}
            {c.usn > 0 && <Row k={`\u0423\u0421\u041D 10% (\u0431\u0430\u0437\u0430 ${rub(c.usnBase)})`} v={"\u2212 " + rub2(c.usn)} c={C.clay} />}
            {c.logist > 0 && <Row k="\u041B\u043E\u0433\u0438\u0441\u0442 5%" v={"\u2212 " + rub2(c.logist)} />}
            {c.ads > 0 && <Row k="\u0420\u0435\u043A\u043B\u0430\u043C\u0430 5%" v={"\u2212 " + rub2(c.ads)} c={C.gold} />}
            <div style={{ gridColumn: "1/3", borderTop: `1px dashed ${C.line}`, margin: "6px 0" }} />
            <Row k="\u0427\u0438\u0441\u0442\u0430\u044F \u043F\u0440\u0438\u0431\u044B\u043B\u044C" v={rub2(c.net)} bold c={C.moss} />
            <Row k="\u041C\u0430\u0440\u0436\u0430" v={c.margin.toFixed(1) + "%"} bold />
            <Row k="\u041F\u0430\u0440\u0442\u043D\u0451\u0440 \u00B7 60%" v={rub2(c.owner)} />
            <Row k="\u041F\u0430\u0440\u0442\u043D\u0451\u0440 \u00B7 40%" v={rub2(c.partner)} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={onEdit} style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.ink }}>\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C</button>
            <button onClick={onDelete} style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.red }}>\u0423\u0434\u0430\u043B\u0438\u0442\u044C</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CalcBreakdown({ draft, preview, cashless }) {
  const p = preview;
  const line = (label, amount, active, note, color) => {
    const off = !active;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", opacity: off ? 0.4 : 1 }}>
        <span style={{ color: off ? C.muted : C.ink, textDecoration: off ? "line-through" : "none", fontSize: 13 }}>
          {label}{note && !off ? <span style={{ color: C.muted }}> \u00B7 {note}</span> : ""}
        </span>
        <span className="num" style={{ color: off ? C.muted : (color || C.ink), fontWeight: 500, fontSize: 13 }}>
          {off ? "\u2014" : "\u2212 " + rub2(amount)}
        </span>
      </div>
    );
  };
  const hr = <div style={{ borderTop: `1px solid ${C.moss}33`, margin: "7px 0" }} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u043E\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u0430</span>
        <span className="num" style={{ fontWeight: 700, fontSize: 13 }}>{rub2(+draft.revenue || 0)}</span>
      </div>
      {hr}
      {line("\u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F\u043C", +draft.payout || 0, true)}
      {line("\u041D\u0414\u0421 5%", p.vat, cashless, "\u043A \u0443\u043F\u043B\u0430\u0442\u0435", C.clay)}
      {line("\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F \u0421\u0417 3%", p.smz3, cashless && draft.calc_smz_service)}
      {line("\u041D\u0430\u043B\u043E\u0433 \u0421\u0417 6%", p.smz6, cashless && draft.calc_smz_tax)}
      {line("\u0423\u0421\u041D 10%", p.usn, cashless, cashless ? `\u0431\u0430\u0437\u0430 ${rub(p.usnBase)}` : "", C.clay)}
      {line("\u041B\u043E\u0433\u0438\u0441\u0442 5%", p.logist, draft.calc_logist)}
      {line("\u0420\u0435\u043A\u043B\u0430\u043C\u0430 5%", p.ads, draft.calc_ads, "", C.gold)}
      {hr}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.moss }}>\u0427\u0438\u0441\u0442\u0430\u044F \u043F\u0440\u0438\u0431\u044B\u043B\u044C</span>
        <span className="num" style={{ fontWeight: 700, fontSize: 15, color: C.moss }}>{rub2(p.net)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
        <span style={{ fontSize: 12.5, color: C.muted }}>\u041C\u0430\u0440\u0436\u0430</span>
        <span className="num" style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{p.margin.toFixed(1)}%</span>
      </div>
      {hr}
      <Row k="\u041F\u0430\u0440\u0442\u043D\u0451\u0440 \u00B7 60%" v={rub2(p.owner)} />
      <Row k="\u041F\u0430\u0440\u0442\u043D\u0451\u0440 \u00B7 40%" v={rub2(p.partner)} />
    </div>
  );
}

function Check({ on, onClick, label, hint, disabled }) {
  return (
    <div className={"chk" + (on && !disabled ? " on" : "")} onClick={disabled ? undefined : onClick}
      style={{ opacity: disabled ? 0.4 : 1, cursor: disabled ? "not-allowed" : "pointer", justifyContent: "space-between" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Box on={on && !disabled} /> {label}</span>
      <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{hint}</span>
    </div>
  );
}

function OrderForm({ draft, setDraft, cps, onSave, onCancel }) {
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const preview = calcOrder({ ...draft, revenue: +draft.revenue || 0, payout: +draft.payout || 0 });
  const cashless = draft.payment_method === "cashless";

  const save = () => {
    onSave({
      ...draft,
      revenue: +draft.revenue || 0, payout: +draft.payout || 0,
      hours: draft.hours ? +draft.hours : null,
      workers_count: draft.workers_count ? +draft.workers_count : null,
      paid_date: draft.is_paid ? (draft.paid_date || null) : null,
    });
  };

  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 22 }}>
      <div style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, marginBottom: 18 }}>
        {draft.id ? "\u0420\u0435\u0434\u0430\u043A\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0437\u0430\u044F\u0432\u043A\u0443" : "\u041D\u043E\u0432\u0430\u044F \u0437\u0430\u044F\u0432\u043A\u0430"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="\u0414\u0430\u0442\u0430"><input className="fld" type="date" value={draft.order_date} onChange={(e) => set("order_date", e.target.value)} /></Field>
          <Field label="\u041A\u043E\u043D\u0442\u0440\u0430\u0433\u0435\u043D\u0442">
            <select className="fld" value={draft.counterparty_id} onChange={(e) => set("counterparty_id", e.target.value)}>
              {cps.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="\u0412\u0438\u0434 \u0440\u0430\u0431\u043E\u0442">
            <select className="fld" value={draft.work_type} onChange={(e) => set("work_type", e.target.value)}>
              {Object.entries(WORK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="\u0412\u044B\u0440\u0443\u0447\u043A\u0430 \u043E\u0442 \u043A\u043B\u0438\u0435\u043D\u0442\u0430, \u20BD"><input className="fld" type="number" value={draft.revenue} onChange={(e) => set("revenue", e.target.value)} /></Field>
            <Field label="\u0412\u044B\u043F\u043B\u0430\u0442\u0430 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u0442\u0435\u043B\u044F\u043C, \u20BD"><input className="fld" type="number" value={draft.payout} onChange={(e) => set("payout", e.target.value)} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="\u0427\u0430\u0441\u043E\u0432"><input className="fld" type="number" value={draft.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
            <Field label="\u0427\u0435\u043B\u043E\u0432\u0435\u043A"><input className="fld" type="number" value={draft.workers_count} onChange={(e) => set("workers_count", e.target.value)} /></Field>
          </div>
          <Field label="\u041D\u043E\u043C\u0435\u0440 \u0441\u0447\u0451\u0442\u0430"><input className="fld" placeholder="\u043D\u0430\u043F\u0440. \u0421\u0427-0015" value={draft.invoice_number || ""} onChange={(e) => set("invoice_number", e.target.value)} /></Field>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="\u0424\u043E\u0440\u043C\u0430 \u0440\u0430\u0441\u0447\u0451\u0442\u0430">
            <div style={{ display: "flex", gap: 8 }}>
              {[["cashless", "\u0411\u0435\u0437\u043D\u0430\u043B"], ["cash", "\u041D\u0430\u043B\u0438\u0447\u043D\u044B\u0435"]].map(([k, l]) => (
                <button key={k} onClick={() => set("payment_method", k)} style={{
                  flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13.5,
                  border: `1px solid ${draft.payment_method === k ? C.moss : C.line}`,
                  background: draft.payment_method === k ? C.mossSoft : C.card, color: draft.payment_method === k ? C.moss : C.muted,
                }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="\u0420\u0430\u0441\u0445\u043E\u0434\u044B (\u0447\u0442\u043E \u0443\u0447\u0438\u0442\u044B\u0432\u0430\u0442\u044C)">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Check on={draft.calc_smz_service} disabled={!cashless} onClick={() => set("calc_smz_service", !draft.calc_smz_service)} label="\u041A\u043E\u043C\u0438\u0441\u0441\u0438\u044F \u0421\u0417 \u00B7 3%" hint="\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439" />
              <Check on={draft.calc_smz_tax} disabled={!cashless} onClick={() => set("calc_smz_tax", !draft.calc_smz_tax)} label="\u041D\u0430\u043B\u043E\u0433 \u0421\u0417 \u00B7 6%" hint="\u043E\u0444\u0438\u0446\u0438\u0430\u043B\u044C\u043D\u044B\u0439" />
              <Check on={draft.calc_logist} onClick={() => set("calc_logist", !draft.calc_logist)} label="\u041B\u043E\u0433\u0438\u0441\u0442 \u00B7 5%" hint="\u043D\u0435\u043E\u0444\u0438\u0446." />
              <Check on={draft.calc_ads} onClick={() => set("calc_ads", !draft.calc_ads)} label="\u0420\u0435\u043A\u043B\u0430\u043C\u0430 \u00B7 5%" hint="\u043D\u0435\u043E\u0444\u0438\u0446." />
            </div>
            {!cashless && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>\u041F\u0440\u0438 \u043D\u0430\u043B\u0438\u0447\u043D\u044B\u0445 \u043D\u0430\u043B\u043E\u0433\u0438 \u0438 \u043A\u043E\u043C\u0438\u0441\u0441\u0438\u0438 \u0421\u0417 \u043D\u0435 \u043D\u0430\u0447\u0438\u0441\u043B\u044F\u044E\u0442\u0441\u044F.</div>}
          </Field>
          <label className="chk" style={{ borderColor: draft.is_paid ? C.moss : C.line }} onClick={() => set("is_paid", !draft.is_paid)}>
            <Box on={draft.is_paid} /> \u041E\u043F\u043B\u0430\u0447\u0435\u043D\u043E \u043A\u043B\u0438\u0435\u043D\u0442\u043E\u043C
          </label>
          {draft.is_paid && (
            <Field label="\u0414\u0430\u0442\u0430 \u043E\u043F\u043B\u0430\u0442\u044B (\u043F\u043E \u043D\u0435\u0439 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0434\u0438\u0432\u0438\u0434\u0435\u043D\u0434\u044B)">
              <input className="fld" type="date" value={draft.paid_date || ""} onChange={(e) => set("paid_date", e.target.value)} />
            </Field>
          )}
          <div style={{ background: C.mossSoft, border: `1px solid ${C.moss}22`, borderRadius: 11, padding: "14px 16px" }}>
            <div style={{ fontSize: 12.5, color: C.moss, fontWeight: 600, marginBottom: 10 }}>\u0420\u0430\u0441\u0447\u0451\u0442 \u0432 \u0440\u0435\u0430\u043B\u044C\u043D\u043E\u043C \u0432\u0440\u0435\u043C\u0435\u043D\u0438</div>
            <CalcBreakdown draft={draft} preview={preview} cashless={cashless} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>\u041E\u0442\u043C\u0435\u043D\u0430</button>
        <button onClick={save} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.moss, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C</button>
      </div>
    </div>
  );
}
