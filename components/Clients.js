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
        <div style={{ fontSize: 13.5, color: C.muted }}>{cps.length} контрагентов</div>
        <button onClick={() => setEditing(blankCp())} style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Добавить контрагента</button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 820 }}>
          <thead>
            <tr style={{ background: C.paper, textAlign: "left", color: C.muted, fontSize: 12.5 }}>
              <th style={th}>Контрагент</th><th style={th}>ИНН</th><th style={thR}>Заказов</th>
              <th style={thR}>Оборот</th><th style={thR}>Ср. чек</th><th style={thR}>Чистая</th>
              <th style={thR}>Маржа</th><th style={thR}>Долги</th><th style={th}>Последний заказ</th><th style={thR}></th>
            </tr>
          </thead>
          <tbody>
            {byCp.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                <td style={{ ...td, color: C.muted }} className="num">{c.inn || "—"}</td>
                <td style={tdR} className="num">{c.count}</td>
                <td style={tdR} className="num">{rub(c.revenue)}</td>
                <td style={tdR} className="num">{rub(c.avg)}</td>
                <td style={{ ...tdR, color: C.moss, fontWeight: 600 }} className="num">{rub(c.net)}</td>
                <td style={tdR} className="num">{c.margin.toFixed(1)}%</td>
                <td style={{ ...tdR, color: c.unpaid ? C.red : C.muted }} className="num">{c.unpaid || "—"}</td>
                <td style={{ ...td, color: C.muted, fontSize: 12.5 }}>
                  {c.lastDate ? <>{fmtDate(c.lastDate)} <span style={{ color: daysAgoColor(c.lastDate) }}>· {daysAgo(c.lastDate, TODAY)}</span></> : "—"}
                </td>
                <td style={tdR}>
                  <button onClick={() => setEditing(cps.find((x) => x.id === c.id))} style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.muted }}>Изм.</button>
                </td>
              </tr>
            ))}
            {!byCp.length && <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: C.muted }}>Нет контрагентов</td></tr>}
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
        {cp.id ? "Редактировать контрагента" : "Новый контрагент"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionTitle>Основное</SectionTitle>
          <Field label="Название *"><input className="fld" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="напр. КДВ Групп" /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="ИНН"><input className="fld" value={f.inn || ""} onChange={(e) => set("inn", e.target.value)} /></Field>
            <Field label="КПП"><input className="fld" value={f.kpp || ""} onChange={(e) => set("kpp", e.target.value)} /></Field>
          </div>
          <Field label="Юридический адрес"><input className="fld" value={f.legal_address || ""} onChange={(e) => set("legal_address", e.target.value)} /></Field>

          <SectionTitle>Банковские реквизиты</SectionTitle>
          <Field label="Банк"><input className="fld" value={f.bank_name || ""} onChange={(e) => set("bank_name", e.target.value)} /></Field>
          <Field label="Расчётный счёт"><input className="fld" value={f.bank_account || ""} onChange={(e) => set("bank_account", e.target.value)} /></Field>
          <Field label="БИК"><input className="fld" value={f.bank_bik || ""} onChange={(e) => set("bank_bik", e.target.value)} /></Field>

          <SectionTitle>Контакты</SectionTitle>
          <Field label="Контактное лицо"><input className="fld" value={f.contact_person || ""} onChange={(e) => set("contact_person", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Телефон"><input className="fld" value={f.contact_phone || ""} onChange={(e) => set("contact_phone", e.target.value)} /></Field>
            <Field label="Email"><input className="fld" value={f.contact_email || ""} onChange={(e) => set("contact_email", e.target.value)} /></Field>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionTitle>Ставки клиенту</SectionTitle>
          <Field label="За час, ₽"><input className="fld" type="number" value={f.rate_hourly ?? ""} onChange={(e) => set("rate_hourly", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Контейнер 20 фут, ₽"><input className="fld" type="number" value={f.rate_container_20 ?? ""} onChange={(e) => set("rate_container_20", e.target.value)} /></Field>
            <Field label="Контейнер 40 фут, ₽"><input className="fld" type="number" value={f.rate_container_40 ?? ""} onChange={(e) => set("rate_container_40", e.target.value)} /></Field>
          </div>

          <SectionTitle>Выплата исполнителю</SectionTitle>
          <Field label="За час, ₽"><input className="fld" type="number" value={f.payout_hourly ?? ""} onChange={(e) => set("payout_hourly", e.target.value)} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Контейнер 20 фут, ₽"><input className="fld" type="number" value={f.payout_container_20 ?? ""} onChange={(e) => set("payout_container_20", e.target.value)} /></Field>
            <Field label="Контейнер 40 фут, ₽"><input className="fld" type="number" value={f.payout_container_40 ?? ""} onChange={(e) => set("payout_container_40", e.target.value)} /></Field>
          </div>

          <SectionTitle>НДС</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            {[[true, "В т.ч. НДС 5%"], [false, "НДС 5% сверху"]].map(([v, l]) => (
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
        <button onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Отмена</button>
        <button onClick={save} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.moss, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Сохранить</button>
      </div>
    </div>
  );
}
