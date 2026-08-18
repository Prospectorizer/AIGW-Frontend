"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { postAigw } from "@/lib/aigw/client";

type Props = { mode: "login" | "register" };

export function AuthForm({ mode }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const result = await postAigw<{ organization_slug?: string; project_slug?: string }>(`/api/auth/${mode}`, body);
      if (result.organization_slug && result.project_slug) router.replace(`/dashboard/${result.organization_slug}/${result.project_slug}`);
      else router.replace("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication failed");
    } finally { setPending(false); }
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="logo-mark"><i/><i/><i/></span><b>Prospector</b></div><h1>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1><p>{mode === "login" ? "Sign in to manage your AI gateway." : "You’ll become the owner of a new organization and project."}</p><form onSubmit={submit}>{mode === "register" && <><label>Full name<input name="displayName" autoComplete="name" required/></label><label>Organization name<input name="organizationName" required/></label><label>First project<input name="projectName" defaultValue="Production" required/></label></>}<label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Password<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={10} required/></label>{error && <div className="form-error">{error}</div>}<button className="button" disabled={pending}>{pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create workspace"}</button></form><small>{mode === "login" ? <>New here? <Link href="/register">Create an account</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</small></section></main>;
}
