import { User } from '../config/types';

export const SEED_USERS: User[] = [
  {
    id: "u1",
    username: "87999461725",
    phone: "(87) 9 9946-1725",
    password: "admin",
    displayName: "Administrador",
    role: "admin",
    permission: "ADM",
    active: true,
    cargo: "ADM"
  },
  {
    id: "u2",
    username: "87988887777",
    phone: "(87) 9 8888-7777",
    password: "teste123",
    displayName: "Usuário Teste",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Motorista"
  },
  {
    id: "u3",
    username: "87977776666",
    phone: "(87) 9 7777-6666",
    password: "123456",
    displayName: "Maria Silva",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Ajudante"
  },
  {
    id: "u4",
    username: "87966665555",
    phone: "(87) 9 6666-5555",
    password: "123456",
    displayName: "João Santos",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Motorista"
  },
  {
    id: "u5",
    username: "87955554444",
    phone: "(87) 9 5555-4444",
    password: "123456",
    displayName: "Carlos Almeida",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Ajudante"
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
