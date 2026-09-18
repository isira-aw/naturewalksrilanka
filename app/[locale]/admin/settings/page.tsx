import { WizardSettingsPanel } from "@/components/admin/WizardSettingsPanel";

export const dynamic = "force-dynamic";

/* The layout above has already validated the locale and the session; this
   page only picks the section. See `admin/layout.tsx` for why there is no
   `loading.tsx` beside it. */
export default function AdminSectionPage() {
  return <WizardSettingsPanel />;
}
