"use client";
import React, { useEffect, useState } from "react";
import { C } from "../components/ui";

export default function Page() {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState(undefined);
  const [mod, setMod] = useState(null);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      import("../lib/supabase"),
      import("./login/Login"),
      import("./Workspace"),
    ]).then(([sb, login, ws]) => {
      const supabase = sb.supabase;
      setMod({ Login: login.default, Workspace: ws.default });
      supabase.auth.getSession().then(({ data }) => setSession(data.session));
      supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    });
  }, []);

  if (!mounted || session === undefined || !mod) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
        Загрузка…
      </div>
    );
  }

  const { Login, Workspace } = mod;
  if (!session) return <Login />;
  return <Workspace session={session} />;
}
