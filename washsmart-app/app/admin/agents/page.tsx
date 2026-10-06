"use client";

/* /admin/agents — field-agent management.
 * Create agents (code auto-issued AGT-001…), see referral stats, and
 * activate/deactivate. After creating an agent, the admin creates the
 * auth user in the Supabase dashboard and links it with the SQL shown. */

import { useEffect, useState } from "react";
import { Badge, EmptyState, Field, inputClass } from "@/components/ui";
import {
  AGENT_BOUNTY_NGN,
  createAgent,
  listAgents,
  setAgentStatus,
  updateAgent,
} from "@/lib/db/agents";
import type { AgentOverviewRow } from "@/lib/db/types";

const ngn = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentOverviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setAgents(await listAgents());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNewCode(null);
    if (name.trim().length < 2 || phone.trim().length < 7) {
      setError("Enter the agent's full name and phone number.");
      return;
    }
    setBusy(true);
    try {
      const a = await createAgent(name, phone);
      setNewCode(a.code);
      setName("");
      setPhone("");
      await load();
    } catch (err: any) {
      setError(err?.message || "Could not create the agent.");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (a: AgentOverviewRow) => {
    const next = a.status === "active" ? "inactive" : "active";
    if (
      a.status === "active" &&
      !window.confirm(`Deactivate agent ${a.code} (${a.name})?`)
    )
      return;
    await setAgentStatus(a.id, next);
    await load();
  };

  const startEdit = (a: AgentOverviewRow) => {
    setEditingId(a.id);
    setEditName(a.name);
    setEditPhone(a.phone);
  };

  const saveEdit = async (a: AgentOverviewRow) => {
    if (editName.trim().length < 2 || editPhone.trim().length < 7) {
      setError("Enter a valid name and phone number.");
      return;
    }
    setSaving(true);
    try {
      await updateAgent(a.id, { name: editName, phone: editPhone });
      setEditingId(null);
      setError(null);
      await load();
    } catch (err: any) {
      setError(err?.message || "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Field Agents</h1>
          <p className="mt-1 text-gray-400">
            {agents.length} agent{agents.length === 1 ? "" : "s"} · bounty{" "}
            {ngn(AGENT_BOUNTY_NGN)} per 20-wash gate
          </p>
        </div>
      </div>

      {/* create */}
      <form
        onSubmit={submit}
        className="mt-6 rounded-3xl bg-[#111a14] p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold">➕ Add agent</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tunde Bakare"
              autoComplete="off"
              className={inputClass(false)}
            />
          </Field>
          <Field label="Phone number">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0803 123 4567"
              inputMode="tel"
              autoComplete="off"
              className={inputClass(false)}
            />
          </Field>
        </div>
        {error && (
          <p className="mt-3 rounded-xl bg-red-500/10 p-3 text-sm font-semibold text-red-300">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-xl bg-[#20a957] px-6 py-3 font-bold text-white disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create agent"}
        </button>

        {newCode && (
          <div className="mt-4 rounded-2xl bg-[#20a957]/10 p-4">
            <p className="text-sm font-bold text-[#48d87c]">
              ✅ Agent created — code{" "}
              <span className="font-mono">{newCode}</span>
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Next: create the auth user in the Supabase dashboard
              (Authentication → Add user, auto-confirm), then run:
            </p>
            <code className="mt-2 block overflow-x-auto rounded-xl bg-black/40 p-3 font-mono text-xs text-[#65e28e]">
              update agents set user_id = '&lt;auth-user-uuid&gt;', email =
              '&lt;email&gt;' where code = '{newCode}';
            </code>
          </div>
        )}
      </form>

      {/* list */}
      <div className="mt-6">
        {loading ? (
          <p className="text-gray-400">Loading…</p>
        ) : agents.length === 0 ? (
          <EmptyState
            icon="🤝"
            title="No agents yet"
            body="Create your first field agent above. They'll sign in at /agent with their code."
          />
        ) : (
          <div className="space-y-3">
            {agents.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl bg-[#111a14] p-5 shadow-sm"
              >
                {editingId === a.id ? (
                  <div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Full name">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className={inputClass(false)}
                        />
                      </Field>
                      <Field label="Phone number">
                        <input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          inputMode="tel"
                          className={inputClass(false)}
                        />
                      </Field>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => saveEdit(a)}
                        disabled={saving}
                        className="rounded-xl bg-[#20a957] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={saving}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">
                      {a.name}{" "}
                      <span className="font-mono text-sm text-[#48d87c]">
                        {a.code}
                      </span>
                    </p>
                    <p className="text-sm text-gray-400">
                      {a.phone}
                      {a.email ? ` · ${a.email}` : " · no login linked"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {a.partners_referred} referred · {a.partners_active}{" "}
                      active · {a.washes_total} washes · {a.gates_hit} gate
                      {a.gates_hit === 1 ? "" : "s"} hit
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!a.linked && (
                      <Badge tone="amber">NO LOGIN</Badge>
                    )}
                    <Badge tone={a.status === "active" ? "green" : "gray"}>
                      {a.status.toUpperCase()}
                    </Badge>
                    <button
                      onClick={() => startEdit(a)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 hover:border-[#20a957]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggle(a)}
                      className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-gray-300 hover:border-[#20a957]"
                    >
                      {a.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
