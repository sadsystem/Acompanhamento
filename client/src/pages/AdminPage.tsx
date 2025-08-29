import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { CPFInput } from "../components/forms/CPFInput";
import { Modal } from "../components/ui/Modal";
import { useStorage } from "../hooks/useStorage";
import { User, Role } from "../config/types";
import { validateCPF, digitsOnly, maskCPF } from "../utils/validation";
import { uuid } from "../utils/calc";

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [cargo, setCargo] = useState("");
  
  // Password reset modal
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const storage = useStorage();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await storage.getUsers();
    setUsers(allUsers);
  };

  const addUser = async () => {
    if (!name.trim()) {
      alert("Preencha o nome completo");
      return;
    }
    
    if (!validateCPF(cpf)) {
      alert("CPF inválido");
      return;
    }
    
    if (!password) {
      alert("Informe a senha");
      return;
    }
    
    if (!cargo) {
      alert("Selecione o cargo");
      return;
    }

    const username = digitsOnly(cpf);
    if (users.some(u => u.username === username)) {
      alert("Já existe colaborador com este CPF");
      return;
    }

    const role: Role = cargo === 'Admin' ? 'admin' : 'colaborador';
    const newUser: User = {
      id: uuid(),
      displayName: name.trim(),
      username,
      password,
      role,
      active: true,
      cargo,
      cpf: username
    };

    await storage.createUser(newUser);
    await loadUsers();

    // Clear form
    setName("");
    setCpf("");
    setPassword("");
    setCargo("");
  };

  const toggleActive = async (user: User) => {
    await storage.updateUser(user.id, { active: !user.active });
    await loadUsers();
  };

  const resetPassword = (user: User) => {
    setResetTarget(user);
    setNewPassword("");
  };

  const saveNewPassword = async () => {
    if (!resetTarget) return;
    
    if (!newPassword) {
      alert('Informe a nova senha');
      return;
    }

    await storage.updateUser(resetTarget.id, { password: newPassword });
    await loadUsers();
    
    setResetTarget(null);
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 1000);
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Register User Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">
              Registrar Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input
                placeholder="Nome completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-name"
              />
              
              <CPFInput
                value={cpf}
                onChange={setCpf}
                data-testid="input-cpf"
              />
              
              <Input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-password"
              />
              
              <Select value={cargo} onValueChange={setCargo}>
                <SelectTrigger data-testid="select-cargo">
                  <SelectValue placeholder="Selecione o cargo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Motorista">Motorista</SelectItem>
                  <SelectItem value="Ajudante">Ajudante</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="flex justify-center">
                <Button onClick={addUser} data-testid="button-register">
                  Registrar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map(user => (
                <div
                  key={user.username}
                  className="flex items-center justify-between border rounded-xl px-4 py-3"
                  data-testid={`user-card-${user.username}`}
                >
                  <div>
                    <div className="font-medium">
                      <span data-testid={`user-name-${user.username}`}>
                        {user.displayName}
                      </span>
                      {user.cargo && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full border">
                          {user.cargo}
                        </span>
                      )}
                      {user.role === 'admin' && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full border">
                          admin
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600">
                      Login: {user.cpf ? maskCPF(user.cpf) : user.username}
                    </div>
                    {!user.active && (
                      <div className="text-xs text-red-600">Inativo</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => toggleActive(user)}
                      data-testid={`button-toggle-${user.username}`}
                    >
                      {user.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => resetPassword(user)}
                      data-testid={`button-reset-password-${user.username}`}
                    >
                      Redefinir Senha
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Password Reset Modal */}
      <Modal
        isOpen={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        title="Redefinir senha"
      >
        {resetTarget && (
          <div>
            <div className="text-sm text-gray-600 mb-3">
              Usuário: <strong>{resetTarget.displayName}</strong>
            </div>
            <Input
              type="password"
              placeholder="Nova senha"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-new-password"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setResetTarget(null)}
                data-testid="button-cancel-password-reset"
              >
                Cancelar
              </Button>
              <Button
                onClick={saveNewPassword}
                data-testid="button-save-password"
              >
                Salvar
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Password Saved Feedback */}
      {passwordSaved && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Senha redefinida com sucesso!
        </div>
      )}
    </div>
  );
}
