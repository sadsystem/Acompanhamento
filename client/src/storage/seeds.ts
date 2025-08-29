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
    cargo: "Gerente"
  },
];

export async function seedUsers(storage: any): Promise<void> {
  const existing = await storage.getUsers();
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
