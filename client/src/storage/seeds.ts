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
  // Motoristas Teste
  {
    id: "u2",
    username: "87999001001",
    phone: "(87) 9 9900-1001",
    password: "123456",
    displayName: "Motorista Teste 1",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Motorista"
  },
  {
    id: "u3",
    username: "87999001002",
    phone: "(87) 9 9900-1002",
    password: "123456",
    displayName: "Motorista Teste 2",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Motorista"
  },
  // Ajudantes Teste
  {
    id: "u4",
    username: "87999002001",
    phone: "(87) 9 9900-2001",
    password: "123456",
    displayName: "Ajudante Teste 1",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Ajudante"
  },
  {
    id: "u5",
    username: "87999002002",
    phone: "(87) 9 9900-2002",
    password: "123456",
    displayName: "Ajudante Teste 2",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Ajudante"
  },
  {
    id: "u6",
    username: "87999002003",
    phone: "(87) 9 9900-2003",
    password: "123456",
    displayName: "Ajudante Teste 3",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Ajudante"
  },
  {
    id: "u7",
    username: "87999002004",
    phone: "(87) 9 9900-2004",
    password: "123456",
    displayName: "Ajudante Teste 4",
    role: "colaborador",
    permission: "Colaborador",
    active: true,
    cargo: "Ajudante"
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
