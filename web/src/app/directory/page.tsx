import { redirect } from "next/navigation";

export default function DirectoryPage() {
  const message = encodeURIComponent("通訊錄為小組功能，請先進入單一小組。");
  redirect(`/groups?status=error&message=${message}`);
}
