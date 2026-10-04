import { redirect } from "next/navigation";

/* /admin → the network control dashboard. */
export default function AdminIndex() {
  redirect("/admin/dashboard");
}
