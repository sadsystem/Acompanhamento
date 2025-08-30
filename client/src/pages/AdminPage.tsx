import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { PhoneInput } from "../components/forms/PhoneInput";
import { CPFInput } from "../components/forms/CPFInput";
import { useStorage } from "../hooks/useStorage";
import { User, Role } from "../config/types";
import { uuid } from "../utils/calc";
import { UserPlus, Edit, UserX, Users } from "lucide-react";
import { AuthService } from "../auth/service";

// Function to get role badge styling
const getRoleBadgeStyle = (role: string) => {
  const styles = {
    "Motorista": "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
    "Ajudante": "bg-green-100 text-green-800 border-green-200 hover:bg-green-200", 
    "Supervisor": "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
    "Gerente": "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200",
    "Assistente de Logística": "bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200"
  };
  return styles[role as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
};

// Function to get permission badge styling  
const getPermissionBadgeStyle = (permission: string) => {
  const styles = {
    "ADM": "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
    "Colaborador": "bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200",
    "Gestor": "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200"
  };
  return styles[permission as keyof typeof styles] || "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200";
};

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    displayName: "",
    cpf: "",
    phone: "",
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
    cpf: "",
    phone: "",
    password: "",
    confirmPassword: "",
    cargo: "",
    permission: "",
    active: true
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const storage = useStorage();
  const authService = new AuthService(storage);

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const user = await authService.getCurrentUser();
    setCurrentUser(user);
  };

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

    if (!data.cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (data.cpf.replace(/\D/g, '').length !== 11) {
      newErrors.cpf = "CPF deve ter 11 dígitos";
    }

    if (!data.phone) {
      newErrors.phone = "Telefone é obrigatório";
    } else if (!/^\(\d{2}\) 9 \d{4}-\d{4}$/.test(data.phone)) {
      newErrors.phone = "Telefone deve ter o formato (XX) 9 XXXX-XXXX";
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
        cpf: formData.cpf,
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
        cpf: "",
        phone: "",
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
    if (!canEditUser(user)) {
      alert("Você não tem permissão para editar este usuário.");
      return;
    }
    setEditUser(user);
    setEditFormData({
      displayName: user.displayName,
      cpf: user.cpf || "",
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
        cpf: editFormData.cpf,
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

  const canEditUser = (targetUser: User): boolean => {
    if (!currentUser) return false;
    // Only ADM can edit other ADMs
    if (targetUser.permission === "ADM" && currentUser.permission !== "ADM") {
      return false;
    }
    return true;
  };

  const handleToggleUserClick = (user: User) => {
    if (!canEditUser(user)) {
      alert("Você não tem permissão para editar este usuário.");
      return;
    }
    setUserToDeactivate(user);
    setShowDeactivateModal(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!userToDeactivate) return;
    
    try {
      const updatedUser = { ...userToDeactivate, active: !userToDeactivate.active };
      await storage.updateUser(userToDeactivate.id, updatedUser);
      await loadUsers();
      
      const action = userToDeactivate.active ? "desativado" : "reativado";
      alert(`Usuário ${action} com sucesso!`);
    } catch (error) {
      console.error("Error toggling user:", error);
      alert("Erro ao alterar status do usuário");
    } finally {
      setShowDeactivateModal(false);
      setUserToDeactivate(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Usuários</h1>
        <p className="text-lg text-muted-foreground">
          Painel de controle de usuários do sistema
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Registration Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Registrar Usuário
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
                <CPFInput
                  value={formData.cpf}
                  onChange={(value) => setFormData(prev => ({ ...prev, cpf: value }))}
                  label="CPF *"
                  error={errors.cpf}
                />
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

              {currentUser?.permission === "ADM" && (
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
              )}

              <Button type="submit" className="w-full" data-testid="button-register">
                Registrar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {users.map(user => (
                <div 
                  key={user.id} 
                  className={`p-4 border rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-200 ${!user.active ? 'bg-gray-50 opacity-70' : 'bg-white'}`}
                >
                  {/* Line 1: Name and Deactivate Button */}
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-lg text-gray-900 flex-1 pr-4">
                      {user.displayName}
                    </div>
                    <Button
                      onClick={() => handleToggleUserClick(user)}
                      variant={user.active ? "destructive" : "default"}
                      size="sm"
                      data-testid={`button-toggle-${user.username}`}
                      className="px-3 py-1 h-8 w-[110px]"
                    >
                      {user.active ? (
                        <>
                          <UserX className="w-4 h-4 mr-1" />
                          Desativar
                        </>
                      ) : (
                        "Reativar"
                      )}
                    </Button>
                  </div>
                  
                  {/* Line 2: Phone and Edit Button */}
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-sm text-muted-foreground">
                      Telefone: <span className="font-medium text-gray-700">{user.phone}</span>
                    </div>
                    <Button
                      onClick={() => handleEditUser(user)}
                      variant="outline"
                      size="sm"
                      data-testid={`button-edit-${user.username}`}
                      className="px-3 py-1 h-8 w-[110px]"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  </div>
                  
                  {/* Line 3: Permission and Position Centered */}
                  <div className="flex justify-center items-center gap-3 pt-2 border-t border-gray-100">
                    <Badge className={`px-3 py-1 border ${getPermissionBadgeStyle(user.permission || '')}`}>
                      {user.permission}
                    </Badge>
                    <Badge className={`px-3 py-1 border ${getRoleBadgeStyle(user.cargo || '')}`}>
                      {user.cargo}
                    </Badge>
                    {!user.active && (
                      <Badge variant="destructive" className="px-3 py-1">
                        Desativado
                      </Badge>
                    )}
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
            <DialogDescription>
              Modifique as informações do usuário selecionado
            </DialogDescription>
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
              <CPFInput
                value={editFormData.cpf}
                onChange={(value) => setEditFormData(prev => ({ ...prev, cpf: value }))}
                label="CPF"
                error={errors.cpf}
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

      {/* Modal de Confirmação para Desativação */}
      <Dialog open={showDeactivateModal} onOpenChange={setShowDeactivateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" />
              Confirmação de Segurança
            </DialogTitle>
            <DialogDescription>
              {userToDeactivate?.active 
                ? "Ao desativar este usuário, ele não poderá mais fazer login no sistema." 
                : "Reativar este usuário permitirá que ele faça login novamente."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm">
                <strong>Usuário:</strong> {userToDeactivate?.displayName}<br/>
                <strong>Cargo:</strong> {userToDeactivate?.cargo}<br/>
                <strong>Permissão:</strong> {userToDeactivate?.permission}
              </p>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowDeactivateModal(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant={userToDeactivate?.active ? "destructive" : "default"}
                onClick={handleConfirmDeactivate}
              >
                {userToDeactivate?.active ? "Desativar" : "Reativar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}