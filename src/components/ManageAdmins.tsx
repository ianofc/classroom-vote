import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, X, Check, ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AdminUser {
  id: string;
  username: string;
  password?: string;
}

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formUser, setFormUser] = useState("");
  const [formPass, setFormPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('admins').select('id, username').order('username');
    if (!error && data) setAdmins(data);
    setLoading(false);
  };

  const startNew = () => {
    setIsNew(true);
    setFormUser("");
    setFormPass("");
    setEditing({ id: "new", username: "" });
  };

  const startEdit = (admin: AdminUser) => {
    setIsNew(false);
    setFormUser(admin.username);
    setFormPass(""); // Senha em branco significa que não vai alterar
    setEditing(admin);
  };

  const cancelEdit = () => {
    setEditing(null);
    setIsNew(false);
    setShowPass(false);
  };

  const saveAdmin = async () => {
    if (!editing || !formUser.trim()) return;
    if (isNew && !formPass.trim()) {
      toast({ title: "Erro", description: "A senha é obrigatória para novos admins.", variant: "destructive" });
      return;
    }

    setIsSaving(true);

    if (isNew) {
      const { error } = await supabase.from('admins').insert({ username: formUser.trim(), password: formPass.trim() });
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Sucesso", description: "Admin criado!" });
    } else {
      const updateData: any = { username: formUser.trim() };
      if (formPass.trim()) updateData.password = formPass.trim(); // Atualiza senha só se digitou algo
      
      const { error } = await supabase.from('admins').update(updateData).eq('id', editing.id);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else toast({ title: "Sucesso", description: "Admin atualizado!" });
    }

    setIsSaving(false);
    cancelEdit();
    fetchAdmins();
  };

  const handleDelete = async (id: string) => {
    if (admins.length <= 1) {
      toast({ title: "Atenção", description: "Você não pode excluir o último administrador!", variant: "destructive" });
      return;
    }
    if (!confirm("Deseja realmente excluir este administrador?")) return;
    
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchAdmins();
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          {isNew ? "Novo Administrador" : "Editar Administrador"}
        </h3>

        <div>
          <label htmlFor="adminUsername" className="text-xs text-muted-foreground block mb-1">Usuário</label>
          <input
            id="adminUsername"
            name="adminUsername"
            value={formUser}
            onChange={(e) => setFormUser(e.target.value)}
            placeholder="Nome de usuário"
            maxLength={30}
            className="w-full h-10 rounded-lg bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="adminPassword" className="text-xs text-muted-foreground block mb-1">
            {isNew ? "Senha" : "Nova Senha (deixe em branco para não alterar)"}
          </label>
          <div className="relative">
            <input
              id="adminPassword"
              name="adminPassword"
              type={showPass ? "text" : "password"}
              value={formPass}
              onChange={(e) => setFormPass(e.target.value)}
              placeholder="Senha de acesso"
              maxLength={50}
              className="w-full h-10 rounded-lg bg-muted border border-border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={cancelEdit} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={saveAdmin}
            disabled={isSaving || !formUser.trim() || (isNew && !formPass.trim())}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          Administradores Globais
        </h3>
        <button onClick={startNew} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all">
          <Plus className="w-3 h-3" /> Novo Admin
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6 animate-pulse">Carregando...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum administrador cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">{admin.username}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Acesso Global</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(admin)} className="w-8 h-8 rounded-lg hover:bg-blue-50 flex items-center justify-center transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-blue-600" />
                </button>
                <button onClick={() => handleDelete(admin.id)} className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageAdmins;
