"use client";
import React, { useState, useMemo } from "react";
import { calcOrder, rub, rub2, fmtDate, WORK_TYPES } from "../lib/calc";
import { C, Field, Box, Row, SearchSelect } from "./ui";

function blankOrder() {
  return {
    order_date: new Date().toISOString().slice(0, 10), paid_date: "",
    counterparty_id: "", work_type: "container_40",
    revenue: "", payout: "", hours: "", workers_count: "",
    payment_method: "cashless", is_paid: false, invoice_number: "", notes: "",
    calc_smz_service: true, calc_smz_tax: true, calc_logist: true, calc_ads: true,
  };
}

function monthRange() {
  const n = new Date();
  const f = (d) => d.toISOString().slice(0, 10);
  return [f(new Date(n.getFullYear(), n.getMonth(), 1)), f(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
}

export default function Orders({ rows, cps, onSave, onDelete }) {
  const [draft, setDraft] = useState(null);
  // фильтры
  const [fCp, setFCp] = useState("");            // контрагент
  const [fPaid, setFPaid] = useState("all");      // all | paid | unpaid
  const [useDate, setUseDate] = useState(false);
  const mr = monthRange();
  const [from, setFrom] = useState(mr[0]);
  const [to, setTo] = useState(mr[1]);

  const markPaid = (r) => {
    onSave({ ...r, is_paid: true, paid_date: new Date().toISOString().slice(0, 10) });
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (fCp && r.counterparty_id !== fCp) return false;
      if (fPaid === "paid" && !r.is_paid) return false;
      if (fPaid === "unpaid" && r.is_paid) return false;
      if (useDate && (r.order_date < from || r.order_date > to)) return false;
      return true;
    });
  }, [rows, fCp, fPaid, useDate, from, to]);

  const filteredUnpaidSum = filtered.filter((r) => !r.is_paid).reduce((s, r) => s + (+r.revenue || 0), 0);

  if (draft) {
    return <OrderForm draft={draft} setDraft={setDraft} cps={cps}
      onSave={(o) => { onSave(o); setDraft(null); }} onCancel={() => setDraft(null)} />;
  }

  const cpOptions = cps.map((c) => ({ value: c.id, label: c.name, sub: [c.inn, c.notes].filter(Boolean).join(" · ") }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13.5, color: C.muted }}>{filtered.length} из {rows.length} заявок</div>
        <button onClick={() => setDraft(blankOrder())} disabled={!cps.length}
          style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", opacity: cps.length ? 1 : 0.5 }}>
          + Добавить заявку
        </button>
      </div>
      {!cps.length && <div style={{ color: C.muted, fontSize: 13 }}>Сначала добавьте контрагента во вкладке «Контрагенты».</div>}

      {/* Фильтры */}
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <div style={{ minWidth: 220 }}>
          <SearchSelect value={fCp} onChange={setFCp}
            options={[{ value: "", label: "Все контрагенты" }, ...cpOptions]} placeholder="Все контрагенты" />
        </div>
        <div style={{ display: "flex", gap: 4, background: C.paper, padding: 4, borderRadius: 10, border: `1px solid ${C.line}` }}>
          {[["all", "Все"], ["paid", "Оплаченные"], ["unpaid", "Не оплаченные"]].map(([k, l]) => (
            <button key={k} onClick={() => setFPaid(k)} style={{
              border: "none", cursor: "pointer", padding: "7px 13px", borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: fPaid === k ? C.ink : "transparent", color: fPaid === k ? "#fff" : C.muted,
            }}>{l}</button>
          ))}
        </div>
        <label className="chk" style={{ borderColor: useDate ? C.moss : C.line }} onClick={() => setUseDate(!useDate)}>
          <Box on={useDate} /> По дате
        </label>
        {useDate && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input className="fld" style={{ width: 145 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            <span style={{ color: C.muted }}>—</span>
            <input className="fld" style={{ width: 145 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        )}
        {(fPaid === "unpaid" || fCp) && (
          <div style={{ marginLeft: "auto", fontSize: 13.5, color: C.muted }}>
            Не оплачено: <span className="num" style={{ color: C.red, fontWeight: 700 }}>{rub(filteredUnpaidSum)}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((r) => <OrderCard key={r.id} r={r} onEdit={() => setDraft(r)} onDelete={() => onDelete(r.id)} onMarkPaid={() => markPaid(r)} />)}
        {filtered.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: "center", padding: 20 }}>Нет заявок по фильтру</div>}
      </div>
    </div>
  );
}

function OrderCard({ r, onEdit, onDelete, onMarkPaid }) {
  const [open, setOpen] = useState(false);
  const c = r.calc;
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, overflow: "hidden" }}>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setOpen(!open)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 600 }}>{r.cp?.name || "—"}</span>
            <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: r.payment_method === "cash" ? "#f3ecdd" : C.mossSoft, color: r.payment_method === "cash" ? C.gold : C.moss, fontWeight: 600 }}>
              {r.payment_method === "cash" ? "Наличные" : "Безнал"}
            </span>
            {!r.is_paid && <span style={{ fontSize: 11.5, padding: "2px 8px", borderRadius: 20, background: "#f7e7e3", color: C.red, fontWeight: 600 }}>Не оплачено</span>}
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>
            {fmtDate(r.order_date)} · {WORK_TYPES[r.work_type] || r.work_type}
            {r.workers_count ? ` · ${r.workers_count} чел.` : ""}{r.hours ? ` · ${r.hours} ч` : ""}{r.invoice_number ? ` · Счёт №${r.invoice_number}` : ""}
          </div>
        </div>
        {!r.is_paid && (
          <button onClick={onMarkPaid} title="Отметить оплаченной (сегодня)"
            style={{ border: `1px solid ${C.moss}`, background: C.mossSoft, color: C.moss, borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
            ✓ Оплачено
          </button>
        )}
        <div style={{ textAlign: "right", cursor: "pointer" }} onClick={() => setOpen(!open)}>
          <div className="num" style={{ fontSize: 12.5, color: C.muted }}>{rub(r.revenue)}</div>
          <div className="num" style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 600, color: C.moss }}>{rub(c.net)}</div>
        </div>
        <div onClick={() => setOpen(!open)} style={{ color: C.muted, cursor: "pointer", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>{"›"}</div>
      </div>
      {open && (
        <div style={{ borderTop: `1px solid ${C.line}`, padding: "16px 18px", background: "#fbfbf8" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 28px", fontSize: 13.5 }}>
            <Row k="Выручка от клиента" v={rub2(r.revenue)} />
            <Row k="Выплата исполнителям" v={"− " + rub2(r.payout)} />
            {c.vat > 0 && <Row k="НДС 5% (к уплате)" v={"− " + rub2(c.vat)} c={C.clay} />}
            {c.smz3 > 0 && <Row k="Комиссия СЗ 3%" v={"− " + rub2(c.smz3)} />}
            {c.smz6 > 0 && <Row k="Налог СЗ 6%" v={"− " + rub2(c.smz6)} />}
            {c.usn > 0 && <Row k={`УСН 10% (база ${rub(c.usnBase)})`} v={"− " + rub2(c.usn)} c={C.clay} />}
            {c.logist > 0 && <Row k="Логист 5%" v={"− " + rub2(c.logist)} />}
            {c.ads > 0 && <Row k="Реклама 5%" v={"− " + rub2(c.ads)} c={C.gold} />}
            <div style={{ gridColumn: "1/3", borderTop: `1px dashed ${C.line}`, margin: "6px 0" }} />
            <Row k="Чистая прибыль" v={rub2(c.net)} bold c={C.moss} />
            <Row k="Маржа" v={c.margin.toFixed(1) + "%"} bold />
            <Row k="Партнёр · 60%" v={rub2(c.owner)} />
            <Row k="Партнёр · 40%" v={rub2(c.partner)} />
          </div>
          {r.notes && <div style={{ marginTop: 12, fontSize: 13, color: C.muted }}><b style={{ color: C.ink }}>Комментарий:</b> {r.notes}</div>}
          {r.is_paid && r.paid_date && <div style={{ marginTop: 8, fontSize: 12.5, color: C.moss }}>Оплачено {fmtDate(r.paid_date)}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={onEdit} style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.ink }}>Редактировать</button>
            <button onClick={onDelete} style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.red }}>Удалить</button>
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
          {label}{note && !off ? <span style={{ color: C.muted }}> · {note}</span> : ""}
        </span>
        <span className="num" style={{ color: off ? C.muted : (color || C.ink), fontWeight: 500, fontSize: 13 }}>
          {off ? "—" : "− " + rub2(amount)}
        </span>
      </div>
    );
  };
  const hr = <div style={{ borderTop: `1px solid ${C.moss}33`, margin: "7px 0" }} />;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>Выручка от клиента</span>
        <span className="num" style={{ fontWeight: 700, fontSize: 13 }}>{rub2(+draft.revenue || 0)}</span>
      </div>
      {hr}
      {line("Выплата исполнителям", +draft.payout || 0, true)}
      {line("НДС 5%", p.vat, cashless, "к уплате", C.clay)}
      {line("Комиссия СЗ 3%", p.smz3, cashless && draft.calc_smz_service)}
      {line("Налог СЗ 6%", p.smz6, cashless && draft.calc_smz_tax)}
      {line("УСН 10%", p.usn, cashless, cashless ? `база ${rub(p.usnBase)}` : "", C.clay)}
      {line("Логист 5%", p.logist, draft.calc_logist)}
      {line("Реклама 5%", p.ads, draft.calc_ads, "", C.gold)}
      {hr}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.moss }}>Чистая прибыль</span>
        <span className="num" style={{ fontWeight: 700, fontSize: 15, color: C.moss }}>{rub2(p.net)}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
        <span style={{ fontSize: 12.5, color: C.muted }}>Маржа</span>
        <span className="num" style={{ fontSize: 12.5, color: C.muted, fontWeight: 600 }}>{p.margin.toFixed(1)}%</span>
      </div>
      {hr}
      <Row k="Партнёр · 60%" v={rub2(p.owner)} />
      <Row k="Партнёр · 40%" v={rub2(p.partner)} />
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
  const [err, setErr] = useState("");

  const cpOptions = cps.map((c) => ({ value: c.id, label: c.name, sub: [c.inn, c.notes].filter(Boolean).join(" · ") }));

  const save = () => {
    if (!draft.counterparty_id) { setErr("Выберите контрагента"); return; }
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
        {draft.id ? "Редактировать заявку" : "Новая заявка"}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
        {/* ЛЕВАЯ КОЛОНКА — все поля ввода */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Дата"><input className="fld" type="date" value={draft.order_date} onChange={(e) => set("order_date", e.target.value)} /></Field>
          <Field label="Контрагент *">
            <SearchSelect value={draft.counterparty_id} onChange={(v) => { set("counterparty_id", v); setErr(""); }}
              options={cpOptions} placeholder="Выберите контрагента" />
          </Field>
          <Field label="Вид работ">
            <select className="fld" value={draft.work_type} onChange={(e) => set("work_type", e.target.value)}>
              {Object.entries(WORK_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Выручка от клиента, ₽"><input className="fld" type="number" placeholder="0" value={draft.revenue} onChange={(e) => set("revenue", e.target.value)} /></Field>
            <Field label="Выплата исполнителям, ₽"><input className="fld" type="number" placeholder="0" value={draft.payout} onChange={(e) => set("payout", e.target.value)} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Часов"><input className="fld" type="number" value={draft.hours} onChange={(e) => set("hours", e.target.value)} /></Field>
            <Field label="Человек"><input className="fld" type="number" value={draft.workers_count} onChange={(e) => set("workers_count", e.target.value)} /></Field>
          </div>
          <Field label="Номер счёта"><input className="fld" placeholder="напр. 174" value={draft.invoice_number || ""} onChange={(e) => set("invoice_number", e.target.value)} /></Field>

          <Field label="Форма расчёта">
            <div style={{ display: "flex", gap: 8 }}>
              {[["cashless", "Безнал"], ["cash", "Наличные"]].map(([k, l]) => (
                <button key={k} onClick={() => set("payment_method", k)} style={{
                  flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13.5,
                  border: `1px solid ${draft.payment_method === k ? C.moss : C.line}`,
                  background: draft.payment_method === k ? C.mossSoft : C.card, color: draft.payment_method === k ? C.moss : C.muted,
                }}>{l}</button>
              ))}
            </div>
          </Field>
          <Field label="Расходы (что учитывать)">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Check on={draft.calc_smz_service} disabled={!cashless} onClick={() => set("calc_smz_service", !draft.calc_smz_service)} label="Комиссия СЗ · 3%" hint="официальный" />
              <Check on={draft.calc_smz_tax} disabled={!cashless} onClick={() => set("calc_smz_tax", !draft.calc_smz_tax)} label="Налог СЗ · 6%" hint="официальный" />
              <Check on={draft.calc_logist} onClick={() => set("calc_logist", !draft.calc_logist)} label="Логист · 5%" hint="неофиц." />
              <Check on={draft.calc_ads} onClick={() => set("calc_ads", !draft.calc_ads)} label="Реклама · 5%" hint="неофиц." />
            </div>
            {!cashless && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>При наличных налоги и комиссии СЗ не начисляются.</div>}
          </Field>

          <Field label="Комментарий к заявке">
            <textarea className="fld" rows={2} value={draft.notes || ""} onChange={(e) => set("notes", e.target.value)} placeholder="детали объекта, особые условия…" style={{ resize: "vertical" }} />
          </Field>
        </div>

        {/* ПРАВАЯ КОЛОНКА — оплата + живой расчёт */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <label className="chk" style={{ borderColor: draft.is_paid ? C.moss : C.line }} onClick={() => set("is_paid", !draft.is_paid)}>
            <Box on={draft.is_paid} /> Оплачено клиентом
          </label>
          {draft.is_paid && (
            <Field label="Дата оплаты (по ней считаются дивиденды)">
              <input className="fld" type="date" value={draft.paid_date || ""} onChange={(e) => set("paid_date", e.target.value)} />
            </Field>
          )}
          <div style={{ background: C.mossSoft, border: `1px solid ${C.moss}22`, borderRadius: 11, padding: "14px 16px" }}>
            <div style={{ fontSize: 12.5, color: C.moss, fontWeight: 600, marginBottom: 10 }}>Расчёт в реальном времени</div>
            <CalcBreakdown draft={draft} preview={preview} cashless={cashless} />
          </div>
        </div>
      </div>
      {err && <div style={{ color: C.red, fontSize: 13, marginTop: 12 }}>{err}</div>}
      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "10px 18px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.card, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Отмена</button>
        <button onClick={save} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: C.moss, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Сохранить</button>
      </div>
    </div>
  );
}
