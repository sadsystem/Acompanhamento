import { User } from '../config/types';

export const SEED_USERS: User[] = [
  {
    id: "u1",
    username: "admin",
    password: "admin123",
    displayName: "Administrador",
    role: "admin",
    active: true,
    cargo: "Gestor"
  },
  {
    id: "u2",
    username: "teste",
    password: "teste123",
    displayName: "Usuário Teste",
    role: "colaborador",
    active: true,
    cargo: "Motorista"
  },
  {
    id: "u3",
    username: "maria",
    password: "123456",
    displayName: "Maria Silva",
    role: "colaborador",
    active: true,
    cargo: "Ajudante"
  },
  {
    id: "u4",
    username: "joao",
    password: "123456",
    displayName: "João Santos",
    role: "colaborador",
    active: true,
    cargo: "Motorista"
  },
  {
    id: "u5",
    username: "carlos",
    password: "123456",
    displayName: "Carlos Almeida",
    role: "colaborador",
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
