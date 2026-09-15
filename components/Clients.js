"use client";
import React, { useState } from "react";
import { rub, fmtDate, daysAgo } from "../lib/calc";
import { C, Field, SectionTitle, Box, th, thR, td, tdR } from "./ui";

const TODAY = new Date();
function daysAgoColor(dateStr) {
  const d = Math.round((TODAY - new Date(dateStr)) / 86400000);
  return d > 30 ? C.red : C.muted;
}
function blankCp() {
  return { name: "", inn: "", kpp: "", legal_address: "", bank_name: "", bank_account: "", bank_bik: "", contact_person: "", contact_phone: "", contact_email: "", rate_hourly: "", payout_hourly: "", rate_container_20: "", rate_container_40: "", payout_container_20: "", payout_container_40: "", vat_mode: "included", notes: "", is_active: true };
}

const VAT_MODES = [["included", "В т.ч. НДС 5%"], ["added", "НДС 5% сверху"], ["none", "Без НДС"]];

export default function Clients({ byCp, cps, onSave, services, cpServices, onAddService, onDeleteService }) {
  const [editing, setEditing] = useState(null);

  if (editing) return <CpForm cp={editing} onSave={onSave} onCancel={() => setEditing(null)}
    services={services} cpServices={cpServices} onAddService={onAddService} onDeleteService={onDeleteService} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13.5, color: C.muted }}>{cps.length} контрагентов</div>
        <button onClick={() => setEditing(blankCp())} style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>+ Добавить контрагента</button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, minWidth: 900 }}>
          <thead>
            <tr style={{ background: C.paper, textAlign: "left", color: C.muted, fontSize: 12.5 }}>
              <th style={th}>Контрагент</th><th style={th}>ИНН</th><th style={th}>Комментарий</th><th style={thR}>Заказов</th>
              <th style={thR}>Оборот</th><th style={thR}>Чистая</th>
              <th style={thR}>Долги</th><th style={th}>Последний заказ</th><th style={thR}></th>
            </tr>
          </thead>
          <tbody>
            {byCp.map((c) => (
              <tr key={c.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                <td style={{ ...td, color: C.muted }} className="num">{c.inn || "—"}</td>
                <td style={{ ...td, color: C.muted, fontSize: 12.5, maxWidth: 200 }}>{c.notes || "—"}</td>
                <td style={tdR} className="num">{c.count}</td>
                <td style={tdR} className="num">{rub(c.revenue)}</td>
                <td style={{ ...tdR, color: C.moss, fontWeight: 600 }} className="num">{rub(c.net)}</td>
                <td style={{ ...tdR, color: c.unpaid ? C.red : C.muted }} className="num">{c.unpaid || "—"}</td>
                <td style={{ ...td, color: C.muted, fontSize: 12.5 }}>
                  {c.lastDate ? <>{fmtDate(c.lastDate)} <span style={{ color: daysAgoColor(c.lastDate) }}>· {daysAgo(c.lastDate, TODAY)}</span></> : "—"}
                </td>
                <td style={tdR}>
                  <button onClick={() => setEditing(cps.find((x) => x.id === c.id))} style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.muted }}>Изм.</button>
                </td>
              </tr>
            ))}
            {!byCp.length && <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: C.muted }}>Нет контрагентов</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CpForm({ cp, onSave, onCancel, services, cpServices, onAddService, onDeleteService }) {
  const [f, setF] = useState(cp);
  const set = (k, v) => setF((d) => ({ ...d, [k]: v }));
  const numify = (v) => (v === "" || v == null ? null : +v);

  // ставки услуг для этого контрагента
  const initRates = {};
  (services || []).forEach((s) => {
    const ex = (cpServices || []).find((x) => x.counterparty_id === cp.id && x.service_id === s.id);
    initRates[s.id] = { rate_client: ex?.rate_client ?? "", payout_worker: ex?.payout_worker ?? "" };
  });
  const [svcRates, setSvcRates] = useState(initRates);
  const setRate = (sid, field, val) => setSvcRates((r) => ({ ...r, [sid]: { ...r[sid], [field]: val } }));
  const [newSvc, setNewSvc] = useState("");

  const save = () => {
    if (!f.name) return;
    const cpData = {
      ...f,
      rate_hourly: numify(f.rate_hourly), payout_hourly: numify(f.payout_hourly),
      rate_container_20: numify(f.rate_container_20), rate_container_40: numify(f.rate_container_40),
      payout_container_20: numify(f.payout_container_20), payout_container_40: numify(f.payout_container_40),
      vat_included: f.vat_mode === "included", // для обратной совместимости
    };
    const rates = Object.entries(svcRates).map(([service_id, v]) => ({
      service_id, rate_client: numify(v.rate_client), payout_worker: numify(v.payout_worker),
    }));
    onSave(cpData, rates);
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
          <Field label="Комментарий">
            <textarea className="fld" rows={2} value={f.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="напр. Fix Price, ООО «Бэст Прайс» — первое юрлицо" style={{ resize: "vertical" }} />
          </Field>

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

          <SectionTitle>Другие услуги</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(services || []).map((s) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr auto", gap: 8, alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{s.name}</div>
                <input className="fld" type="number" placeholder="клиенту ₽" value={svcRates[s.id]?.rate_client ?? ""} onChange={(e) => setRate(s.id, "rate_client", e.target.value)} />
                <input className="fld" type="number" placeholder="исполн. ₽" value={svcRates[s.id]?.payout_worker ?? ""} onChange={(e) => setRate(s.id, "payout_worker", e.target.value)} />
                <button onClick={() => { if (confirm(`Удалить услугу «${s.name}» из справочника?`)) onDeleteService(s.id); }}
                  title="Удалить услугу из справочника" style={{ border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
            {(!services || !services.length) && <div style={{ fontSize: 12.5, color: C.muted }}>Услуг пока нет. Добавьте ниже (напр. Самосвал, Грузовик).</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <input className="fld" placeholder="Новая услуга (напр. Самосвал)" value={newSvc} onChange={(e) => setNewSvc(e.target.value)} />
              <button onClick={() => { if (newSvc.trim()) { onAddService(newSvc.trim()); setNewSvc(""); } }}
                style={{ border: `1px solid ${C.moss}`, background: C.mossSoft, color: C.moss, borderRadius: 9, padding: "0 16px", cursor: "pointer", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>+ Услуга</button>
            </div>
            <div style={{ fontSize: 11.5, color: C.muted }}>Услуга общая для всех, а ставки — свои у каждого контрагента.</div>
          </div>

          <SectionTitle>НДС</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            {VAT_MODES.map(([v, l]) => (
              <button key={v} onClick={() => set("vat_mode", v)} style={{
                flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 12.5,
                border: `1px solid ${f.vat_mode === v ? C.moss : C.line}`,
                background: f.vat_mode === v ? C.mossSoft : C.card, color: f.vat_mode === v ? C.moss : C.muted,
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
