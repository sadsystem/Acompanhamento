import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useStorage } from "../hooks/useStorage";
import { User } from "../config/types";
import { toDateRefBR } from "../utils/time";

interface SelectPartnerPageProps {
  currentUser: User;
  onSelected: (username: string) => void;
}

export function SelectPartnerPage({ currentUser, onSelected }: SelectPartnerPageProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [alreadyEvaluated, setAlreadyEvaluated] = useState<Set<string>>(new Set());
  
  const storage = useStorage();
  const today = toDateRefBR();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Get available partners
    const allUsers = await storage.getUsers();
    const partners = allUsers.filter(
      u => u.active && 
           u.role === "colaborador" && 
           u.username !== currentUser.username
    );
    setUsers(partners);

    // Get already evaluated partners today
    const evaluations = await storage.getEvaluations({
      evaluator: currentUser.username,
      dateFrom: today,
      dateTo: today
    });
    
    setAlreadyEvaluated(new Set(evaluations.map(e => e.evaluated)));
  };

  const filteredUsers = users.filter(u => 
    (u.displayName + " " + u.username).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 text-center uppercase tracking-wide">
            SELECIONE O PARCEIRO DE EQUIPE
          </h2>
          
          <div className="flex items-end gap-2 mb-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                type="text"
                placeholder="Nome"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {filteredUsers.map(user => (
              <div
                key={user.username}
                className={`flex items-center justify-between border rounded-2xl px-3 py-2 ${
                  !alreadyEvaluated.has(user.username) ? 'cursor-pointer hover:bg-gray-50' : ''
                }`}
                onClick={!alreadyEvaluated.has(user.username) ? () => onSelected(user.username) : undefined}
                data-testid={`partner-${user.username}`}
              >
                <div className="text-sm">
                  <div className="font-medium" data-testid={`name-${user.username}`}>
                    {user.displayName}
                  </div>
                  <div className="text-gray-600" data-testid={`role-${user.username}`}>
                    {user.cargo || "Colaborador"}
                  </div>
                </div>
                
                <Button
                  variant={alreadyEvaluated.has(user.username) ? "secondary" : "default"}
                  disabled={alreadyEvaluated.has(user.username)}
                  onClick={() => onSelected(user.username)}
                  data-testid={`button-select-${user.username}`}
                >
                  {alreadyEvaluated.has(user.username) ? "Enviado" : "Escolher"}
                </Button>
              </div>
            ))}
            
            {filteredUsers.length === 0 && (
              <div className="text-sm text-gray-600" data-testid="no-partners">
                Nenhum colaborador encontrado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
