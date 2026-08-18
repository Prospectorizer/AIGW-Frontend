import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSession } from "@/lib/aigw/server";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <AuthForm mode="login"/>;
}
