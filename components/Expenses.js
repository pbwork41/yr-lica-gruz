"use client";
import React, { useState } from "react";
import { rub, fmtDate, EXPENSE_CATS } from "../lib/calc";
import { C, Field, Stat, th, thR, td, tdR } from "./ui";

function monthRange() {
  const n = new Date();
  const f = (d) => d.toISOString().slice(0, 10);
  return [f(new Date(n.getFullYear(), n.getMonth(), 1)), f(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
}

export default function Expenses({ expenses, onAdd, onDelete }) {
  const [mr] = useState(monthRange());
  const [from, setFrom] = useState(mr[0]);
  const [to, setTo] = useState(mr[1]);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ expense_date: new Date().toISOString().slice(0, 10), category: "salary", title: "", amount: "" });

  const list = expenses
    .filter((e) => e.expense_date >= from && e.expense_date <= to)
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date));

  const byCat = {};
  list.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + (+e.amount || 0); });
  const total = list.reduce((s, e) => s + (+e.amount || 0), 0);
  const adsTotal = byCat.ads || 0;
  const generalTotal = total - adsTotal;
  const catColor = (c) => (c === "ads" ? C.gold : c === "salary" ? C.moss : C.clay);

  const submit = () => {
    if (!f.title || !f.amount) return;
    onAdd({ expense_date: f.expense_date, category: f.category, title: f.title, amount: +f.amount });
    setF({ ...f, title: "", amount: "" }); setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input className="fld" style={{ width: 150 }} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: C.muted }}>{"—"}</span>
          <input className="fld" style={{ width: 150 }} type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={() => setAdding(!adding)} style={{ marginLeft: "auto", background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {adding ? "Закрыть" : "+ Добавить расход"}
        </button>
      </div>

      {adding && (
        <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, padding: 18 }} className="expense-form">
          <Field label="Дата"><input className="fld" type="date" value={f.expense_date} onChange={(e) => setF({ ...f, expense_date: e.target.value })} /></Field>
          <Field label="Категория">
            <select className="fld" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {Object.entries(EXPENSE_CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="Описание"><input className="fld" value={f.title} placeholder="напр. Зарплата диспетчера" onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
          <Field label="Сумма, ₽"><input className="fld" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <button onClick={submit} style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer", height: 40 }}>Сохранить</button>
          {f.category === "ads" && <div style={{ gridColumn: "1/6", fontSize: 12.5, color: C.gold }}>Реклама спишется из рекламного фонда, а не из прибыли.</div>}
        </div>
      )}

      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        <Stat label="Всего расходов за период" value={rub(total)} />
        <Stat label="Из прибыли (общие)" value={rub(generalTotal)} sub="ЗП, связь, аренда…" accent={C.clay} />
        <Stat label="Из рекламного фонда" value={rub(adsTotal)} sub="реклама" accent={C.gold} />
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 13, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: C.paper, textAlign: "left", color: C.muted, fontSize: 12.5 }}>
              <th style={th}>Дата</th><th style={th}>Категория</th><th style={th}>Описание</th><th style={thR}>Сумма</th><th style={thR}></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: C.muted }}>Нет расходов за период</td></tr>}
            {list.map((e) => (
              <tr key={e.id} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ ...td, color: C.muted }} className="num">{fmtDate(e.expense_date)}</td>
                <td style={td}>
                  <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 20, background: catColor(e.category) + "1a", color: catColor(e.category), fontWeight: 600 }}>
                    {EXPENSE_CATS[e.category] || e.category}
                  </span>
                </td>
                <td style={td}>{e.title}</td>
                <td style={{ ...tdR, fontWeight: 600 }} className="num">{rub(e.amount)}</td>
                <td style={tdR}>
                  <button onClick={() => onDelete(e.id)} style={{ border: "none", background: "transparent", color: C.muted, cursor: "pointer", fontSize: 16 }}>{"×"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
