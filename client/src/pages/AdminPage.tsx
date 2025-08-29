import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { PhoneInput } from "../components/forms/PhoneInput";
import { useStorage } from "../hooks/useStorage";
import { User, Role } from "../config/types";
import { uuid } from "../utils/calc";
import { UserPlus, Edit, UserX } from "lucide-react";

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    displayName: "",
    phone: "(87) 9 ",
    password: "",
    confirmPassword: "",
    cargo: "",
    permission: "Colaborador"
  });
  
  // Edit modal states
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    phone: "",
    password: "",
    confirmPassword: "",
    cargo: "",
    permission: "",
    active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const storage = useStorage();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const allUsers = await storage.getUsers();
    setUsers(allUsers);
  };

  const phoneToUsername = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  const validateForm = (data: typeof formData, isEdit = false) => {
    const newErrors: Record<string, string> = {};

    if (!data.displayName.trim()) {
      newErrors.displayName = "Nome completo é obrigatório";
    }

    if (!data.phone || data.phone === "(87) 9 ") {
      newErrors.phone = "Telefone é obrigatório";
    } else if (!/^\(87\) 9 \d{4}-\d{4}$/.test(data.phone)) {
      newErrors.phone = "Telefone deve ter o formato (87) 9 XXXX-XXXX";
    }

    if (!isEdit && !data.password.trim()) {
      newErrors.password = "Senha é obrigatória";
    }

    if (data.password !== data.confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem";
    }

    if (!data.cargo) {
      newErrors.cargo = "Cargo é obrigatório";
    }

    // Check if phone already exists (except for current user in edit mode)
    const phoneUsername = phoneToUsername(data.phone);
    const existingUser = users.find(u => u.username === phoneUsername);
    if (existingUser && (!isEdit || existingUser.id !== editUser?.id)) {
      newErrors.phone = "Este telefone já está cadastrado";
    }

    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const username = phoneToUsername(formData.phone);
      const role: Role = formData.permission === "ADM" ? "admin" : 
                        formData.permission === "Gestor" ? "gestor" : "colaborador";

      const newUser: User = {
        id: uuid(),
        username,
        phone: formData.phone,
        password: formData.password,
        displayName: formData.displayName.trim(),
        role,
        permission: formData.permission as "ADM" | "Colaborador" | "Gestor",
        active: true,
        cargo: formData.cargo
      };

      await storage.createUser(newUser);
      await loadUsers();
      
      // Reset form
      setFormData({
        displayName: "",
        phone: "(87) 9 ",
        password: "",
        confirmPassword: "",
        cargo: "",
        permission: "Colaborador"
      });
      setErrors({});
      
      alert("Usuário cadastrado com sucesso!");
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Erro ao cadastrar usuário");
    }
  };

  const handleEditUser = (user: User) => {
    setEditUser(user);
    setEditFormData({
      displayName: user.displayName,
      phone: user.phone,
      password: "",
      confirmPassword: "",
      cargo: user.cargo || "",
      permission: user.permission,
      active: user.active
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    const validationErrors = validateForm(editFormData, true);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!editUser) return;

    try {
      const username = phoneToUsername(editFormData.phone);
      const role: Role = editFormData.permission === "ADM" ? "admin" : 
                        editFormData.permission === "Gestor" ? "gestor" : "colaborador";

      const updatedUser: User = {
        ...editUser,
        username,
        phone: editFormData.phone,
        displayName: editFormData.displayName.trim(),
        role,
        permission: editFormData.permission as "ADM" | "Colaborador" | "Gestor",
        active: editFormData.active,
        cargo: editFormData.cargo
      };

      if (editFormData.password.trim()) {
        updatedUser.password = editFormData.password;
      }

      await storage.updateUser(editUser.id, updatedUser);
      await loadUsers();
      
      setShowEditModal(false);
      setEditUser(null);
      setErrors({});
      
      alert("Usuário atualizado com sucesso!");
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Erro ao atualizar usuário");
    }
  };

  const handleToggleUser = async (user: User) => {
    try {
      const updatedUser = { ...user, active: !user.active };
      await storage.updateUser(user.id, updatedUser);
      await loadUsers();
      
      const action = user.active ? "desativado" : "reativado";
      alert(`Usuário ${action} com sucesso!`);
    } catch (error) {
      console.error("Error toggling user:", error);
      alert("Erro ao alterar status do usuário");
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gestão de Usuários</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Registrar Colaborador
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <Label htmlFor="displayName">Nome Completo *</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Nome completo do colaborador"
                  data-testid="input-name"
                />
                {errors.displayName && (
                  <span className="text-sm text-red-600">{errors.displayName}</span>
                )}
              </div>

              <div>
                <PhoneInput
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  label="Telefone *"
                  error={errors.phone}
                />
              </div>

              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Senha do usuário"
                  data-testid="input-password"
                />
                {errors.password && (
                  <span className="text-sm text-red-600">{errors.password}</span>
                )}
              </div>

              <div>
                <Label htmlFor="confirmPassword">Repetir Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirme a senha"
                  data-testid="input-confirm-password"
                />
                {errors.confirmPassword && (
                  <span className="text-sm text-red-600">{errors.confirmPassword}</span>
                )}
              </div>

              <div>
                <Label>Selecionar o Cargo *</Label>
                <Select value={formData.cargo} onValueChange={(value) => setFormData(prev => ({ ...prev, cargo: value }))}>
                  <SelectTrigger data-testid="select-cargo">
                    <SelectValue placeholder="Selecione o cargo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Motorista">Motorista</SelectItem>
                    <SelectItem value="Ajudante">Ajudante</SelectItem>
                    <SelectItem value="Supervisor">Supervisor</SelectItem>
                    <SelectItem value="Gerente">Gerente</SelectItem>
                    <SelectItem value="Assistente de Logística">Assistente de Logística</SelectItem>
                  </SelectContent>
                </Select>
                {errors.cargo && (
                  <span className="text-sm text-red-600">{errors.cargo}</span>
                )}
              </div>

              <div>
                <Label>Nível de Permissão *</Label>
                <Select value={formData.permission} onValueChange={(value) => setFormData(prev => ({ ...prev, permission: value }))}>
                  <SelectTrigger data-testid="select-permission">
                    <SelectValue placeholder="Selecione a permissão..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADM">ADM</SelectItem>
                    <SelectItem value="Colaborador">Colaborador</SelectItem>
                    <SelectItem value="Gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" data-testid="button-register">
                Registrar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map(user => (
                <div 
                  key={user.id} 
                  className={`p-3 border rounded-lg ${!user.active ? 'bg-gray-100 opacity-60' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{user.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        Telefone: {user.phone}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{user.permission}</Badge>
                        <Badge variant="secondary">{user.cargo}</Badge>
                        {!user.active && (
                          <Badge variant="destructive">Desativado</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 w-24">
                      <Button
                        onClick={() => handleToggleUser(user)}
                        variant={user.active ? "destructive" : "default"}
                        size="sm"
                        data-testid={`button-toggle-${user.username}`}
                        className="text-xs px-2 py-1 h-7 min-w-0"
                      >
                        {user.active ? (
                          <>
                            <UserX className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="truncate">Desativar</span>
                          </>
                        ) : (
                          "Reativar"
                        )}
                      </Button>
                      <Button
                        onClick={() => handleEditUser(user)}
                        variant="outline"
                        size="sm"
                        data-testid={`button-edit-${user.username}`}
                        className="text-xs px-2 py-1 h-7 min-w-0"
                      >
                        <Edit className="w-3 h-3 mr-1 flex-shrink-0" />
                        <span className="truncate">Editar</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-displayName">Nome Completo</Label>
              <Input
                id="edit-displayName"
                value={editFormData.displayName}
                onChange={(e) => setEditFormData(prev => ({ ...prev, displayName: e.target.value }))}
              />
            </div>

            <div>
              <PhoneInput
                value={editFormData.phone}
                onChange={(value) => setEditFormData(prev => ({ ...prev, phone: value }))}
                label="Telefone"
                error={errors.phone}
              />
            </div>

            <div>
              <Label htmlFor="edit-password">Nova Senha (deixe em branco para manter)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editFormData.password}
                onChange={(e) => setEditFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="edit-confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="edit-confirmPassword"
                type="password"
                value={editFormData.confirmPassword}
                onChange={(e) => setEditFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </div>

            <div>
              <Label>Cargo</Label>
              <Select value={editFormData.cargo} onValueChange={(value) => setEditFormData(prev => ({ ...prev, cargo: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Motorista">Motorista</SelectItem>
                  <SelectItem value="Ajudante">Ajudante</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
                  <SelectItem value="Gerente">Gerente</SelectItem>
                  <SelectItem value="Assistente de Logística">Assistente de Logística</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nível de Permissão</Label>
              <Select value={editFormData.permission} onValueChange={(value) => setEditFormData(prev => ({ ...prev, permission: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADM">ADM</SelectItem>
                  <SelectItem value="Colaborador">Colaborador</SelectItem>
                  <SelectItem value="Gestor">Gestor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editFormData.active}
                onChange={(e) => setEditFormData(prev => ({ ...prev, active: e.target.checked }))}
              />
              <Label htmlFor="edit-active">Usuário ativo</Label>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}