import { deleteUser } from "../api/users";

export async function deleteUserWithConfirm(member) {
  if (!window.confirm(`Delete "${member.name}"? This will permanently remove them and all their attendance and race history.`)) {
    return false;
  }
  await deleteUser(member.id);
  return true;
}
