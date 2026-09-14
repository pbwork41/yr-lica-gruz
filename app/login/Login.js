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
    if (error) setErr("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 email \u0438\u043B\u0438 \u043F\u0430\u0440\u043E\u043B\u044C");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 380, background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 28 }}>
        <div style={{ fontFamily: "Fraunces, serif", fontSize: 24, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.02em" }}>
          \u042E\u0440\u043B\u0438\u0446\u0430 \u00B7 \u0413\u0440\u0443\u0437\u043E\u043F\u0435\u0440\u0435\u0432\u043E\u0437\u043A\u0438
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>\u0412\u0445\u043E\u0434 \u0432 \u0441\u0438\u0441\u0442\u0435\u043C\u0443</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Email">
            <input className="fld" type="email" value={email} autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </Field>
          <Field label="\u041F\u0430\u0440\u043E\u043B\u044C">
            <input className="fld" type="password" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          </Field>
          {err && <div style={{ color: C.red, fontSize: 13 }}>{err}</div>}
          <button onClick={submit} disabled={loading}
            style={{ background: C.moss, color: "#fff", border: "none", borderRadius: 10, padding: "11px", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "\u0412\u0445\u043E\u0434\u2026" : "\u0412\u043E\u0439\u0442\u0438"}
          </button>
        </div>
      </div>
    </div>
  );
}
