import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function PageRacine() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
