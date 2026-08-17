import { redirect } from "next/navigation";
import { getSession } from "@/lib/aigw/server";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");
  const workspace = session.workspaces.find(item => item.project_slug);
  if (!workspace?.project_slug) redirect("/unauthorized");
  redirect(`/dashboard/${workspace.organization_slug}/${workspace.project_slug}`);
}
