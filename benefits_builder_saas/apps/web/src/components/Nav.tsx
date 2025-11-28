import { getCurrentUser } from "@/lib/auth";
import UserMenu from "./UserMenu";
import { NavClient } from "./NavClient";

export default async function Nav() {
  const user = await getCurrentUser();

  return <NavClient userMenu={user ? <UserMenu user={user} /> : undefined} />;
}
