import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Loader2, ShieldCheck, Mail, Save, X, AlertCircle, UserX } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// NOVO: Importações de Validação
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { EmptyState } from "./ui/empty-state";

// 1. O CONTRATO ZOD (Regras de Ouro do Formulário)
const adminSchema = z.object({
  nome_completo: z.string().min(3, "Mínimo de 3 caracteres."),
  email: z.string().email("Formato de e-mail inválido."),
  cargo: z.enum(["Diretor Geral", "Coordenador", "Mesário", "Auditor"], { 
    errorMap: () => ({ message: "Cargo inválido." }) 
  }),
});

// Inferir o tipo do TypeScript automaticamente a partir do Zod
type AdminFormValues = z.infer<typeof adminSchema>;

interface Admin { id: string; nome_completo: string; email: string; cargo: string; escola_id: string; created_at: string; }

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [escolaId, setEscolaId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos Modais de UX
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, id: "", nome: "" });
  const [isDialogLoading, setIsDialogLoading] = useState(false);

  // 2. INICIALIZAÇÃO DO REACT HOOK FORM
  const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm<AdminFormValues>({
    resolver: zodResolver(adminSchema),
    defaultValues: { nome_completo: "", email: "", cargo: "Mesário" },
    mode: "onChange" // Valida assim que o utilizador digita
  });

  useEffect(() => { fetchAdmins(); }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: currentAdmin } = await supabase.from('admins').select('escola_id').eq('auth_id', userData.user.id).single();
      if (currentAdmin?.escola_id) {
        setEscolaId(currentAdmin.escola_id);
        const { data: adminsList } = await supabase.from('admins').select('*').eq('escola_id', currentAdmin.escola_id).order('created_at', { ascending: false });
        if (adminsList) setAdmins(adminsList);
      }
    }
    setLoading(false);
  };

  // 3. FUNÇÃO DE SUBMISSÃO (Só é chamada se o Zod aprovar!)
  const onSubmit = async (data: AdminFormValues) => {
    if (!escolaId) return;
    setIsSaving(true);
    
    const payload = { ...data, escola_id: escolaId };

    try {
      if (editingId) {
        const { error } = await supabase.from('admins').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: "Atualizado!", description: "Dados do administrador atualizados." });
      } else {
        const { error } = await supabase.from('admins').insert([payload]);
        if (error) throw error;
        toast({ title: "Cadastrado!", description: "Novo administrador adicionado." });
      }
      cancelEdit();
      fetchAdmins();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (admin: Admin) => {
    setEditingId(admin.id);
    // Injeta os dados da base de dados de volta no formulário
    reset({ nome_completo: admin.nome_completo || "", email: admin.email || "", cargo: (admin.cargo as any) || "Mesário" });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset({ nome_completo: "", email: "", cargo: "Mesário" }); // Limpa o Form
  };

  const executeDelete = async () => {
    setIsDialogLoading(true);
    const { error } = await supabase.from('admins').delete().eq('id', dialogConfig.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      setAdmins(admins.filter(a => a.id !== dialogConfig.id));
      toast({ title: "Removido", description: "Administrador removido com sucesso." });
    }
    setIsDialogLoading(false);
    setDialogConfig({ isOpen: false, id: "", nome: "" });
  };

  return (
    <>
      <ConfirmDialog 
        isOpen={dialogConfig.isOpen} 
        onClose={() => setDialogConfig(prev => ({...prev, isOpen: false}))} 
        onConfirm={executeDelete} 
        title="Revogar Acesso?" 
        description={`Tem certeza que deseja remover o acesso de ${dialogConfig.nome} ao sistema da escola?`} 
        confirmText="Revogar Acesso"
        isLoading={isDialogLoading} 
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        <div className="mb-8 border-b border-slate-100 pb-6">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" /> Gestão de Administradores
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Registe os diretores e mesários que terão acesso a este painel.</p>
        </div>

        {/* FORMULÁRIO BLINDADO PELO RHF + ZOD */}
        <form onSubmit={handleSubmit(onSubmit)} className={`bg-slate-50 p-6 rounded-xl border mb-8 transition-all ${editingId ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`text-xs font-bold uppercase tracking-widest ${editingId ? 'text-blue-600' : 'text-slate-400'}`}>
              {editingId ? "A Editar Registo" : "Novo Administrador"}
            </h3>
            {editingId && <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Completo</label>
              <input 
                {...register("nome_completo")}
                placeholder="Ex: João Silva" 
                className={`w-full p-3 border rounded-lg text-sm font-bold outline-none transition-colors ${errors.nome_completo ? 'border-red-500 bg-red-50/50 focus:border-red-600' : 'border-slate-300 focus:border-blue-500 bg-white'}`} 
              />
              {errors.nome_completo && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in"><AlertCircle className="w-3 h-3"/> {errors.nome_completo.message}</span>}
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">E-mail de Acesso</label>
              <input 
                {...register("email")}
                placeholder="diretor@escola.com" 
                className={`w-full p-3 border rounded-lg text-sm font-bold outline-none transition-colors ${errors.email ? 'border-red-500 bg-red-50/50 focus:border-red-600' : 'border-slate-300 focus:border-blue-500 bg-white'}`} 
              />
              {errors.email && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in"><AlertCircle className="w-3 h-3"/> {errors.email.message}</span>}
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nível / Cargo</label>
              <select 
                {...register("cargo")}
                className={`w-full p-3 border rounded-lg text-sm font-bold outline-none transition-colors ${errors.cargo ? 'border-red-500 bg-red-50/50 focus:border-red-600' : 'border-slate-300 focus:border-blue-500 bg-white'}`}
              >
                <option value="Diretor Geral">Diretor Geral</option>
                <option value="Coordenador">Coordenador</option>
                <option value="Mesário">Mesário</option>
                <option value="Auditor">Auditor (Apenas Leitura)</option>
              </select>
              {errors.cargo && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1 animate-in fade-in"><AlertCircle className="w-3 h-3"/> {errors.cargo.message}</span>}
            </div>
          </div>
          
          <div className="flex gap-2 justify-end border-t border-slate-200/60 pt-4">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="bg-slate-200 text-slate-700 px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-slate-300 transition-colors">
                Cancelar
              </button>
            )}
            {/* O Botão é desativado automaticamente se o Zod detetar um erro! */}
            <button type="submit" disabled={isSaving || !isValid} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)}
              {editingId ? "Guardar Alterações" : "Registar Admin"}
            </button>
          </div>
        </form>

        {/* LISTAGEM (READ) */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
          ) : admins.length === 0 ? (
            <EmptyState icon={<UserX className="w-8 h-8"/>} title="Sem Administradores" description="Registe o primeiro membro da equipa diretiva acima." />
          ) : (
            admins.map(admin => (
              <div key={admin.id} className="p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 bg-white hover:shadow-md transition-all group">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 text-indigo-600 font-black text-lg shadow-sm">
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

                <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(admin)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="Editar">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => setDialogConfig({ isOpen: true, id: admin.id, nome: admin.nome_completo })} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Remover Acesso">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ManageAdmins;
