"use client";
import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { C, Field } from "../../components/ui";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setErr(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setErr("Неверный email или пароль");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.02em" }}>
          Юрлица · Грузоперевозки
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Вход в систему</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Email">
            <input className="fld" type="email" value={email} autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </Field>
          <Field label="Пароль">
            <input className="fld" type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </Field>
          {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
          <button onClick={submit} disabled={loading}
            style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Вход…" : "Войти"}
          </button>
        </div>
      </div>
    </div>
  );
}
