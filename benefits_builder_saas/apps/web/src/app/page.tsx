// src/app/page.tsx - Redirect to Dashboard
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/dashboard");
}
