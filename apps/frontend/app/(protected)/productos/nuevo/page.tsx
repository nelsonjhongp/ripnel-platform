import { redirect } from "next/navigation";

export default function NewProductPage() {
  redirect("/productos?crear=1");
}
