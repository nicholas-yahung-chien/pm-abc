import { redirect } from "next/navigation";

export default function RolesPage() {
  const message = encodeURIComponent("R&R 為小組功能，請先進入單一小組。");
  redirect(`/groups?status=error&message=${message}`);
}
