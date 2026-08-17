import { DashboardApp } from "@/components/dashboard-app";
import { getSession } from "@/lib/aigw/server";
import { redirect } from "next/navigation";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string; section?: string[] }>;
}) {
  const { organizationSlug, projectSlug, section } = await params;
  const session = await getSession();
  if (!session) redirect("/login");
  const workspace = session.workspaces.find(item => item.organization_slug === organizationSlug && item.project_slug === projectSlug);
  if (!workspace) redirect("/unauthorized");
  return (
    <DashboardApp
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      section={section?.[0] ?? "overview"}
      detailId={section?.[1]}
      currentUser={session.user}
      organizationName={workspace.organization_name}
      projectName={workspace.project_name ?? projectSlug}
    />
  );
}
