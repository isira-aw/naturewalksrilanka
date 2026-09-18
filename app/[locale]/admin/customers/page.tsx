import { CustomersPanel } from "@/components/admin/CustomersPanel";

export const dynamic = "force-dynamic";

/* The layout above has already validated the locale and the session; this
   page only picks the section. See `admin/layout.tsx` for why there is no
   `loading.tsx` beside it. */
export default function AdminCustomersPage() {
  return <CustomersPanel />;
}
