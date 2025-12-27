import { getCurrentUser, isAdmin, isRep } from "@/lib/auth";
import UserMenu from "./UserMenu";
import { NavClient } from "./NavClient";

export default async function Nav() {
  const user = await getCurrentUser();
  const userIsAdmin = isAdmin(user);
  const userIsRep = isRep(user);

  return (
    <NavClient
      userMenu={user ? <UserMenu user={user} /> : undefined}
      isAdmin={userIsAdmin}
      canAccessProposals={userIsAdmin || userIsRep}
    />
  );
}
