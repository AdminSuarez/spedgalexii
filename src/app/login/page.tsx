"use client";

import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { GalaxyShell } from "@/components/galaxy/GalaxyShell";
import { Lock, UserCog, Users } from "lucide-react";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextParam = searchParams.get("next") || "/goals";

  const [role, setRole] = useState<"admin" | "case_manager">("case_manager");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Enter the shared password from your SpEdGalexii admin.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, password }),
      });
      const data = await resp.json();

      if (!resp.ok || !data.ok) {
        setError(data.error || "Login failed.");
        return;
      }

      router.push(nextParam);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <GalaxyShell>
      <div className="mx-auto max-w-md py-10">
        <div className="flex items-center gap-3 mb-4">
          <Lock className="h-7 w-7 text-cyan-400" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Sign in to SpEdGalexii</h1>
            <p className="text-sm text-slate-300">
              District-only access. Use the shared password provided by your special education director.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-slate-700/70 bg-slate-900/80 p-4"
        >
          <div className="text-xs font-medium text-slate-200">Role</div>
          <div className="inline-flex rounded-full bg-slate-800 p-0.5 text-xs mb-2">
            <button
              type="button"
              onClick={() => setRole("case_manager")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 border ${
                role === "case_manager"
                  ? "border-cyan-400 bg-cyan-500/20 text-cyan-100"
                  : "border-transparent text-slate-200"
              }`}
            >
              <Users className="h-3 w-3" />
              Case manager
            </button>
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`ml-1 flex items-center gap-1 rounded-full px-3 py-1 border ${
                role === "admin"
                  ? "border-emerald-400 bg-emerald-500/20 text-emerald-100"
                  : "border-transparent text-slate-200"
              }`}
            >
              <UserCog className="h-3 w-3" />
              Admin
            </button>
          </div>

          <label className="block text-sm font-medium text-slate-200">
            Password
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-50 shadow-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              placeholder="Shared password from your admin"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && (
            <p className="text-xs text-rose-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-400 px-4 py-2 text-sm font-semibold text-black shadow-md transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-3 text-[11px] leading-snug text-slate-400">
          For pilots, we recommend using one shared password per role (Admin vs Case Manager).
          In production, districts should connect SpEdGalexii to SSO or a central identity provider.
        </p>
      </div>
    </GalaxyShell>
  );
}
