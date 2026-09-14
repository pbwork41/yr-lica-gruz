"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { C } from "../components/ui";
import Login from "./login/Login";
import Workspace from "./Workspace";

export default function Page() {
  const [session, setSession] = useState(undefined); // undefined = загрузка

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
        \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026
      </div>
    );
  }

  if (!session) return <Login />;
  return <Workspace session={session} />;
}
