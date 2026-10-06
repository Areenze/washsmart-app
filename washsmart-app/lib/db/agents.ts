/* Field-agent data layer (Phase 2).
 *
 * Agents are created by admins in /admin/agents (code auto-issued AGT-001…).
 * The admin then creates the agent's auth user in the Supabase dashboard and
 * links it:
 *   update agents set user_id = '<auth-user-uuid>', email = '<email>'
 *   where code = 'AGT-001';
 * Agents sign in at /agent with agent code + password (mirrors the partner
 * login pattern: code -> email via agent_login_lookup, then signInWithPassword).
 */

import { getSupabase } from "./supabase";
import { signOut } from "./store";
import type { Agent, AgentOverviewRow, AgentReferral } from "./types";

/* ------------------------------------------------------------------ */
/* Compensation — PROPOSED figures only. Mm has not approved these.    */
/* ------------------------------------------------------------------ */
export const AGENT_BOUNTY_NGN = 10000; // per partner, once the gate is hit
export const AGENT_BOUNTY_GATE_WASHES = 20; // verified washes…
export const AGENT_BOUNTY_GATE_DAYS = 60; // …within 60 days of partner approval

export const AGENT_SESSION_KEY = "washsmart_agent_session";

const isBrowser = () => typeof window !== "undefined";

export type AgentLoginResult =
  | { ok: true; agent: Agent }
  | { ok: false; reason: "unknown-code" | "wrong-password" | "no-password" };

function mapAgent(r: any): Agent {
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    phone: r.phone,
    email: r.email ?? "",
    status: r.status,
    createdAt: r.created_at,
    linked: r.user_id != null,
  };
}

/** Agent login. The username is the agent code (e.g. "AGT-001"). */
export async function agentLogin(
  code: string,
  password: string
): Promise<AgentLoginResult> {
  const sb = getSupabase();
  const { data: lookup, error: lookupError } = await sb.rpc(
    "agent_login_lookup",
    { p_code: code.trim().toUpperCase() }
  );
  if (lookupError || !lookup || lookup.length === 0) {
    return { ok: false, reason: "unknown-code" };
  }
  const { email, id } = lookup[0] as { email: string; id: string };
  if (!email) return { ok: false, reason: "no-password" };
  const { error: signInError } = await sb.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) return { ok: false, reason: "wrong-password" };
  if (isBrowser()) {
    try {
      window.localStorage.setItem(AGENT_SESSION_KEY, id);
    } catch {
      /* ignore */
    }
  }
  const agent = await getAgent(id);
  if (!agent) return { ok: false, reason: "unknown-code" };
  return { ok: true, agent };
}

export async function agentLogout(): Promise<void> {
  await signOut();
  if (isBrowser()) {
    try {
      window.localStorage.removeItem(AGENT_SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

export async function getAgent(id: string): Promise<Agent | undefined> {
  const { data, error } = await getSupabase()
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return undefined;
  return mapAgent(data);
}

export async function currentAgentSession(): Promise<Agent | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const id = window.localStorage.getItem(AGENT_SESSION_KEY);
    if (!id) return undefined;
    const {
      data: { session },
    } = await getSupabase().auth.getSession();
    if (!session) {
      window.localStorage.removeItem(AGENT_SESSION_KEY);
      return undefined;
    }
    return getAgent(id);
  } catch {
    return undefined;
  }
}

/* Strict variant for shell gates: returns undefined only when there is
 * genuinely no session; THROWS on DB/network errors so a blip never
 * bounces a logged-in agent to the login page. */
export async function currentAgentSessionStrict(): Promise<Agent | undefined> {
  if (!isBrowser()) return undefined;
  const id = window.localStorage.getItem(AGENT_SESSION_KEY);
  if (!id) return undefined;
  const {
    data: { session },
  } = await getSupabase().auth.getSession();
  if (!session) {
    window.localStorage.removeItem(AGENT_SESSION_KEY);
    return undefined;
  }
  return getAgent(id);
}

/** Referred partners for the signed-in agent, with bounty-gate progress. */
export async function getAgentReferrals(): Promise<AgentReferral[]> {
  const { data, error } = await getSupabase().rpc("agent_referrals");
  if (error) throw error;
  return (data ?? []) as AgentReferral[];
}

/* ---------------- admin ---------------- */

/** All agents with referral stats. Admin only (enforced by the RPC). */
export async function listAgents(): Promise<AgentOverviewRow[]> {
  const { data, error } = await getSupabase().rpc("admin_agent_overview");
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...mapAgent(r),
    partners_referred: Number(r.partners_referred ?? 0),
    partners_active: Number(r.partners_active ?? 0),
    washes_total: Number(r.washes_total ?? 0),
    gates_hit: Number(r.gates_hit ?? 0),
  }));
}

/** Create an agent. The code (AGT-001…) is issued by the DB sequence. */
export async function createAgent(
  name: string,
  phone: string
): Promise<Agent> {
  const { data, error } = await getSupabase()
    .from("agents")
    .insert({ name: name.trim(), phone: phone.trim() })
    .select()
    .single();
  if (error) throw error;
  return mapAgent(data);
}

/** Activate / deactivate an agent. Admin only (RLS). */
export async function setAgentStatus(
  id: string,
  status: "active" | "inactive"
): Promise<void> {
  const { error } = await getSupabase()
    .from("agents")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

/** Update an agent's name / phone. Admin only (RLS). */
export async function updateAgent(
  id: string,
  fields: { name: string; phone: string }
): Promise<void> {
  const { error } = await getSupabase()
    .from("agents")
    .update({ name: fields.name.trim(), phone: fields.phone.trim() })
    .eq("id", id);
  if (error) throw error;
}

/** Link an auth user to an agent (activates their login). Admin only (RLS). */
export async function linkAgentLogin(
  id: string,
  userId: string,
  email: string
): Promise<void> {
  const { error } = await getSupabase()
    .from("agents")
    .update({ user_id: userId.trim(), email: email.trim() })
    .eq("id", id);
  if (error) throw error;
}
