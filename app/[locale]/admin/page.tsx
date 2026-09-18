import { redirect } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

/**
 * `/admin` is not a section of its own. Itineraries is the only thing anyone
 * opens this panel to do — the other sections exist in service of it — so the
 * bare address lands there rather than on a menu nobody wants to read.
 */
export default async function AdminIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/admin/itineraries", locale });
}
