import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Loader2, ShieldCheck, Mail, Save, X, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Admin {
  id: string;
  nome_completo: string;
  email: string;
  cargo: string;
  escola_id: string;
  created_at: string;
}

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [escolaId, setEscolaId] = useState<string | null>(null);

  // Estados do Formulário
  const [newNome, setNewNome] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newCargo, setNewCargo] = useState("Mesário");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    
    if (userData?.user) {
      // Descobre a escola do Admin logado
      const { data: currentAdmin } = await supabase
        .from('admins')
        .select('escola_id')
        .eq('auth_id', userData.user.id)
        .single();

      if (currentAdmin?.escola_id) {
        setEscolaId(currentAdmin.escola_id);
        
        // READ: Busca todos os admins dessa mesma escola
        const { data: adminsList, error } = await supabase
          .from('admins')
          .select('*')
          .eq('escola_id', currentAdmin.escola_id)
          .order('created_at', { ascending: false });

        if (!error && adminsList) {
          setAdmins(adminsList);
        }
      }
    }
    setLoading(false);
  };

  const handleSaveAdmin = async () => {
    if (!newNome.trim() || !newEmail.trim() || !escolaId) {
      toast({ title: "Atenção", description: "O Nome e o E-mail são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const payload = {
      nome_completo: newNome.trim(),
      email: newEmail.trim(),
      cargo: newCargo.trim(),
      escola_id: escolaId
    };

    if (editingId) {
      // UPDATE (Editar)
      const { error } = await supabase.from('admins').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Atualizado!", description: "Dados do administrador atualizados." });
        resetForm();
        fetchAdmins();
      }
    } else {
      // CREATE (Novo)
      const { error } = await supabase.from('admins').insert([payload]);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Cadastrado!", description: "Novo administrador adicionado à escola." });
        resetForm();
        fetchAdmins();
      }
    }
    setIsSaving(false);
  };

  const startEdit = (admin: Admin) => {
    setNewNome(admin.nome_completo || "");
    setNewEmail(admin.email || "");
    setNewCargo(admin.cargo || "Mesário");
    setEditingId(admin.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setNewNome("");
    setNewEmail("");
    setNewCargo("Mesário");
    setEditingId(null);
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!window.confirm(`Tem a certeza que deseja remover o acesso de ${nome}?`)) return;
    
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setAdmins(admins.filter(a => a.id !== id));
      toast({ title: "Removido", description: "Administrador removido com sucesso." });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="mb-8 border-b border-slate-100 pb-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" /> Gestão de Administradores
        </h2>
        <p className="text-sm text-slate-500 font-medium mt-1">Registe os diretores, coordenadores e mesários que terão acesso a este painel.</p>
      </div>

      {/* FORMULÁRIO CRUD */}
      <div className={`bg-slate-50 p-6 rounded-xl border mb-8 transition-all ${editingId ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${editingId ? 'text-blue-600' : 'text-slate-400'}`}>
          {editingId ? "A Editar Registo" : "Novo Administrador"}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Completo</label>
            <input type="text" placeholder="Ex: João Silva" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-white" value={newNome} onChange={e => setNewNome(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail de Acesso (Login)</label>
            <input type="email" placeholder="diretor@escola.com" className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500 bg-white" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Nível / Cargo</label>
            <select className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none focus:border-blue-500" value={newCargo} onChange={e => setNewCargo(e.target.value)}>
              <option value="Diretor Geral">Diretor Geral</option>
              <option value="Coordenador">Coordenador</option>
              <option value="Mesário">Mesário</option>
              <option value="Auditor">Auditor (Apenas Leitura)</option>
            </select>
          </div>
        </div>
        
        <div className="flex gap-2 justify-end">
          {editingId && (
            <button onClick={resetForm} className="bg-slate-200 text-slate-700 px-6 py-3 rounded-lg font-bold text-sm hover:bg-slate-300 transition-colors">
              Cancelar
            </button>
          )}
          <button onClick={handleSaveAdmin} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
            {editingId ? "Guardar Alterações" : "Registar Admin"}
          </button>
        </div>
      </div>

      {/* LISTAGEM (READ) */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : admins.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Nenhum administrador encontrado nesta instituição.</p>
        ) : (
          admins.map(admin => (
            <div key={admin.id} className="p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-white hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 text-indigo-600 font-black text-lg">
                  {admin.nome_completo ? admin.nome_completo.charAt(0).toUpperCase() : "A"}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg leading-tight">{admin.nome_completo || "Sem Nome"}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1"><Mail className="w-3 h-3"/> {admin.email}</p>
                    <span className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase">{admin.cargo}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <button onClick={() => startEdit(admin)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="Editar">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(admin.id, admin.nome_completo)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Remover Acesso">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageAdmins;
