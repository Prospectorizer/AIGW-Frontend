import { DashboardApp } from "@/components/dashboard-app";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ organizationSlug: string; projectSlug: string; section?: string[] }>;
}) {
  const { organizationSlug, projectSlug, section } = await params;
  return (
    <DashboardApp
      organizationSlug={organizationSlug}
      projectSlug={projectSlug}
      section={section?.[0] ?? "overview"}
      detailId={section?.[1]}
    />
  );
}
