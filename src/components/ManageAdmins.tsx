import { useState } from "react";
import { AdminUser } from "@/data/store";
import { getAdmins, saveAdmins, generateId } from "@/data/store";
import { Plus, Pencil, Trash2, X, Check, ShieldCheck, Eye, EyeOff } from "lucide-react";

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<AdminUser[]>(getAdmins());
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [formUser, setFormUser] = useState("");
  const [formPass, setFormPass] = useState("");
  const [showPass, setShowPass] = useState(false);

  const refresh = () => setAdmins(getAdmins());

  const startNew = () => {
    setIsNew(true);
    setFormUser("");
    setFormPass("");
    setEditing({ id: generateId(), username: "", password: "" });
  };

  const startEdit = (admin: AdminUser) => {
    setIsNew(false);
    setFormUser(admin.username);
    setFormPass(admin.password);
    setEditing(admin);
  };

  const cancelEdit = () => {
    setEditing(null);
    setIsNew(false);
    setShowPass(false);
  };

  const saveAdmin = () => {
    if (!editing || !formUser.trim() || !formPass.trim()) return;

    const all = getAdmins();
    if (isNew) {
      all.push({ id: editing.id, username: formUser.trim(), password: formPass.trim() });
    } else {
      const idx = all.findIndex((a) => a.id === editing.id);
      if (idx !== -1) all[idx] = { ...all[idx], username: formUser.trim(), password: formPass.trim() };
    }

    saveAdmins(all);
    cancelEdit();
    refresh();
  };

  const handleDelete = (id: string) => {
    const all = getAdmins();
    if (all.length <= 1) {
      alert("É necessário manter pelo menos um administrador!");
      return;
    }
    if (!confirm("Deseja realmente excluir este administrador?")) return;
    saveAdmins(all.filter((a) => a.id !== id));
    refresh();
  };

  if (editing) {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" />
          {isNew ? "Novo Administrador" : "Editar Administrador"}
        </h3>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Usuário</label>
          <input
            value={formUser}
            onChange={(e) => setFormUser(e.target.value)}
            placeholder="Nome de usuário"
            maxLength={30}
            className="w-full h-10 rounded-lg bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Senha</label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              value={formPass}
              onChange={(e) => setFormPass(e.target.value)}
              placeholder="Senha de acesso"
              maxLength={50}
              className="w-full h-10 rounded-lg bg-muted border border-border px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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
          <button
            onClick={cancelEdit}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={saveAdmin}
            disabled={!formUser.trim() || !formPass.trim()}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40"
          >
            <Check className="w-4 h-4 inline mr-1" /> Salvar
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
          Administradores
        </h3>
        <button
          onClick={startNew}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
        >
          <Plus className="w-3 h-3" /> Novo Admin
        </button>
      </div>

      {admins.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum administrador cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((admin) => (
            <div key={admin.id} className="bg-muted/50 border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">{admin.username}</p>
                  <p className="text-xs text-muted-foreground">••••••••</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => startEdit(admin)}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(admin.id)}
                  className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
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
