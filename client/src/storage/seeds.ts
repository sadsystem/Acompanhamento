import { User } from '../config/types';

export const SEED_USERS: User[] = [
  {
    id: "u1",
    username: "87999461725",
    phone: "(87) 9 9946-1725",
    password: "admin",
    displayName: "Jucélio Verissimo Dias da Silva",
    role: "admin",
    permission: "ADM",
    active: true,
    cargo: "Assistente de Logística"
  },
];

export async function seedUsers(storage: any): Promise<void> {
  const existing = await storage.getUsers();
  
  // Check if we need to clean old users (if there are more than just our admin)
  if (existing.length > 1 || (existing.length === 1 && existing[0].username !== "87999461725")) {
    // Clear all users and add only our seed
    await storage.setUsers(SEED_USERS);
    return;
  }
  
  const existingUsernames = new Set(existing.map((u: User) => u.username));
  
  let changed = false;
  for (const seedUser of SEED_USERS) {
    if (!existingUsernames.has(seedUser.username)) {
      existing.push(seedUser);
      changed = true;
    }
  }
  
  if (changed) {
    await storage.setUsers(existing);
  }
}
