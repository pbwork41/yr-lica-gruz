"use client";
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { calcOrder } from "../lib/calc";
import { C } from "../components/ui";
import Orders from "../components/Orders";
import Dashboard from "../components/Dashboard";
import Expenses from "../components/Expenses";
import Clients from "../components/Clients";

export default function Workspace({ session }) {
  const [tab, setTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [cps, setCps] = useState([]);
  const [services, setServices] = useState([]);
  const [cpServices, setCpServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    setLoading(true); setError("");
    const [o, e, c, s, cs] = await Promise.all([
      supabase.from("orders").select("*").order("order_date", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("counterparties").select("*").order("name"),
      supabase.from("services").select("*").order("name"),
      supabase.from("counterparty_services").select("*"),
    ]);
    const anyErr = o.error || e.error || c.error || s.error || cs.error;
    if (anyErr) {
      setError(anyErr.message);
    } else {
      setOrders(o.data || []);
      setExpenses(e.data || []);
      setCps(c.data || []);
      setServices(s.data || []);
      setCpServices(cs.data || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const rows = useMemo(
    () => orders.map((o) => ({ ...o, calc: calcOrder(o), cp: cps.find((c) => c.id === o.counterparty_id) })),
    [orders, cps]
  );

  const byCp = useMemo(() => {
    return cps.map((cp) => {
      const list = rows.filter((r) => r.counterparty_id === cp.id);
      const rev = list.reduce((s, r) => s + (+r.revenue || 0), 0);
      const net = list.reduce((s, r) => s + r.calc.net, 0);
      const lastDate = list.length ? list.map((r) => r.order_date).sort().slice(-1)[0] : null;
      return {
        ...cp, count: list.length, revenue: rev, net,
        avg: list.length ? rev / list.length : 0,
        margin: rev > 0 ? (net / rev) * 100 : 0,
        unpaid: list.filter((r) => !r.is_paid).length,
        lastDate,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }, [rows, cps]);

  const saveOrder = async (o) => {
    const payload = { ...o }; delete payload.calc; delete payload.cp;
    if (o.id) {
      const { error } = await supabase.from("orders").update(payload).eq("id", o.id);
      if (error) return alert("Ошибка: " + error.message);
    } else {
      const { error } = await supabase.from("orders").insert(payload);
      if (error) return alert("Ошибка: " + error.message);
    }
    loadAll();
  };
  const deleteOrder = async (id) => {
    if (!confirm("Удалить заявку?")) return;
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) return alert("Ошибка: " + error.message);
    loadAll();
  };
  const saveExpense = async (e) => {
    const { error } = await supabase.from("expenses").insert(e);
    if (error) return alert("Ошибка: " + error.message);
    loadAll();
  };
  const deleteExpense = async (id) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return alert("Ошибка: " + error.message);
    loadAll();
  };
  const saveCp = async (cp, cpSvcRates) => {
    // cp — данные контрагента; cpSvcRates — [{service_id, rate_client, payout_worker}]
    let cpId = cp.id;
    if (cp.id) {
      const { error } = await supabase.from("counterparties").update(cp).eq("id", cp.id);
      if (error) return alert("Ошибка: " + error.message);
    } else {
      const { data, error } = await supabase.from("counterparties").insert(cp).select().single();
      if (error) return alert("Ошибка: " + error.message);
      cpId = data.id;
    }
    // сохраняем ставки по услугам (upsert по паре контрагент+услуга)
    if (cpSvcRates && cpSvcRates.length) {
      const rows = cpSvcRates
        .filter((r) => r.rate_client != null || r.payout_worker != null)
        .map((r) => ({ counterparty_id: cpId, service_id: r.service_id, rate_client: r.rate_client, payout_worker: r.payout_worker }));
      if (rows.length) {
        const { error } = await supabase.from("counterparty_services").upsert(rows, { onConflict: "counterparty_id,service_id" });
        if (error) return alert("Ошибка услуг: " + error.message);
      }
    }
    loadAll();
  };

  const addService = async (name) => {
    const { error } = await supabase.from("services").insert({ name });
    if (error) return alert("Ошибка: " + error.message);
    loadAll();
  };
  const deleteService = async (id) => {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return alert("Ошибка: " + error.message);
    loadAll();
  };

  const tabs = [["orders", "Заявки"], ["dashboard", "Дашборд"], ["expenses", "Расходы"], ["clients", "Контрагенты"]];

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <div style={{ borderBottom: `1px solid ${C.line}`, background: C.card }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>
            Юрлица · Грузоперевозки
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", gap: 4, background: C.paper, padding: 4, borderRadius: 11, border: `1px solid ${C.line}` }}>
              {tabs.map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  border: "none", cursor: "pointer", padding: "8px 16px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                  background: tab === k ? C.ink : "transparent", color: tab === k ? "#fff" : C.muted,
                }}>{label}</button>
              ))}
            </div>
            <button onClick={() => supabase.auth.signOut()} title="Выйти"
              style={{ border: `1px solid ${C.line}`, background: C.card, borderRadius: 9, padding: "8px 12px", cursor: "pointer", color: C.muted, fontSize: 13, fontWeight: 600 }}>
              Выход
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px" }}>
        {error && <div style={{ background: "#f7e7e3", color: C.red, padding: "12px 16px", borderRadius: 10, marginBottom: 16 }}>{error}</div>}
        {loading ? (
          <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Загрузка данных…</div>
        ) : (
          <>
            {tab === "orders" && <Orders rows={rows} cps={cps} onSave={saveOrder} onDelete={deleteOrder} />}
            {tab === "dashboard" && <Dashboard rows={rows} byCp={byCp} expenses={expenses} />}
            {tab === "expenses" && <Expenses expenses={expenses} onAdd={saveExpense} onDelete={deleteExpense} />}
            {tab === "clients" && <Clients byCp={byCp} cps={cps} onSave={saveCp}
              services={services} cpServices={cpServices} onAddService={addService} onDeleteService={deleteService} />}
          </>
        )}
      </div>
    </div>
  );
}
