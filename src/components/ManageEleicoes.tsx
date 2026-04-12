import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Loader2, Globe, Users, CheckCircle2, Star, Tags, Save, X, AlertCircle, CalendarX } from "lucide-react";
import { toast } from "@/hooks/use-toast";

// NOVO: Importações de Validação
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { EmptyState } from "./ui/empty-state";

// 1. O CONTRATO ZOD (A Segurança)
const eleicaoSchema = z.object({
  nome: z.string().min(3, "O nome deve ter no mínimo 3 letras."),
  tipo: z.enum(['turma', 'geral', 'universal']),
  cargos: z.string().min(2, "Insira os cargos a concorrer.")
});

type EleicaoFormValues = z.infer<typeof eleicaoSchema>;

interface Eleicao { id: string; nome: string; status: string; tipo: 'turma' | 'geral' | 'universal'; cargos: string; created_at: string; }

const ManageEleicoes = () => {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Estados dos Modais de UX
  const [dialogConfig, setDialogConfig] = useState({ isOpen: false, id: "", nome: "" });
  const [isDialogLoading, setIsDialogLoading] = useState(false);

  // 2. INICIALIZAÇÃO DO REACT HOOK FORM
  const { register, handleSubmit, formState: { errors, isValid }, reset } = useForm<EleicaoFormValues>({
    resolver: zodResolver(eleicaoSchema),
    defaultValues: { nome: "", tipo: "universal", cargos: "" },
    mode: "onChange"
  });

  useEffect(() => { fetchEleicoes(); }, []);

  const fetchEleicoes = async () => {
    setLoading(true);
    const { data } = await supabase.from('eleicoes').select('*').order('created_at', { ascending: false });
    if (data) setEleicoes(data);
    setLoading(false);
  };

  const onSubmit = async (data: EleicaoFormValues) => {
    setIsSaving(true);
    try {
      if (editingId) {
         const { error } = await supabase.from('eleicoes').update(data).eq('id', editingId);
         if (error) throw error;
         toast({ title: "Eleição Atualizada com Segurança!" }); 
      } else {
         const { error } = await supabase.from('eleicoes').insert({ ...data, status: 'ativa' });
         if (error) throw error;
         toast({ title: "Eleição Criada!" }); 
      }
      cancelEdit(); 
      fetchEleicoes();
    } catch (err: any) {
      toast({ title: "Erro na Gravação", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (e: Eleicao) => {
      setEditingId(e.id);
      reset({ nome: e.nome, tipo: e.tipo, cargos: e.cargos || "" });
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const cancelEdit = () => {
      setEditingId(null);
      reset({ nome: "", tipo: "universal", cargos: "" });
  };

  const toggleStatus = async (eleicao: Eleicao) => {
    const novoStatus = eleicao.status === 'ativa' ? 'encerrada' : 'ativa';
    const { error } = await supabase.from('eleicoes').update({ status: novoStatus }).eq('id', eleicao.id);
    if (!error) { fetchEleicoes(); toast({ title: "Status Atualizado", description: `A eleição agora está ${novoStatus}.` }); }
  };

  const executeDelete = async () => {
    setIsDialogLoading(true);
    await supabase.from('votes').delete().eq('eleicao_id', dialogConfig.id);
    const { error } = await supabase.from('eleicoes').delete().eq('id', dialogConfig.id);
    if (!error) { 
      setEleicoes(eleicoes.filter(e => e.id !== dialogConfig.id)); 
      toast({ title: "Excluída", description: "A eleição e os seus votos foram removidos." }); 
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
        title="Excluir Eleição Base?" 
        description={`Atenção! Ao apagar a eleição "${dialogConfig.nome}", TODOS OS VOTOS computados nela serão dizimados. Esta ação é irreverssível.`} 
        confirmText="Apagar Tudo"
        isLoading={isDialogLoading} 
      />

      <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
        
        {/* FORMULÁRIO BLINDADO PELO RHF + ZOD */}
        <form onSubmit={handleSubmit(onSubmit)} className={`bg-slate-50 p-6 rounded-xl border mb-8 transition-all ${editingId ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
          <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${editingId ? 'text-blue-600' : 'text-slate-400'}`}>
            {editingId ? "A Editar Eleição Selecionada" : "Iniciar Novo Pleito"}
          </h3>
          
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-1">
                <input 
                  type="text" 
                  placeholder="Nome da Eleição (Ex: Grêmio 2026)" 
                  {...register("nome")}
                  className={`w-full p-3 border rounded-lg text-sm font-bold outline-none transition-colors ${errors.nome ? 'border-red-500 bg-red-50/50 focus:border-red-600' : 'border-slate-300 focus:border-blue-500 bg-white'}`} 
                />
                {errors.nome && <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.nome.message}</span>}
              </div>
              
              <div className="md:w-[350px] space-y-1">
                <select 
                  {...register("tipo")}
                  className={`w-full p-3 border rounded-lg text-sm font-bold bg-white outline-none transition-colors ${errors.tipo ? 'border-red-500 bg-red-50/50' : 'border-slate-300 focus:border-blue-500'}`}
                >
                  <option value="universal">Universal (A escola inteira vota)</option>
                  <option value="geral">Geral Restrita (Só vota quem é do cargo)</option>
                  <option value="turma">Por Turma (Votação interna da sala)</option>
                </select>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="flex-1 w-full space-y-1">
                <input 
                  type="text" 
                  placeholder="Cargos separados por vírgula (Ex: Presidente, Vice, Tesoureiro)" 
                  {...register("cargos")}
                  className={`w-full p-3 border rounded-lg text-sm outline-none transition-colors ${errors.cargos ? 'border-red-500 bg-red-50/50 focus:border-red-600' : 'border-slate-300 focus:border-blue-500 bg-white'}`} 
                />
                {errors.cargos ? (
                  <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3"/> {errors.cargos.message}</span>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1 ml-1 uppercase font-bold flex items-center gap-1"><Tags className="w-3 h-3"/> Separe os segmentos por vírgula</p>
                )}
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                {editingId && <button type="button" onClick={cancelEdit} className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-bold text-sm hover:bg-slate-300 transition-colors"><X className="w-4 h-4"/></button>}
                <button type="submit" disabled={isSaving || !isValid} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md whitespace-nowrap disabled:opacity-50 transition-colors">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : (editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />)} 
                  {editingId ? "Salvar Alterações" : "Criar Eleição"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* LISTAGEM */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : eleicoes.length === 0 ? (
            <EmptyState icon={<CalendarX className="w-8 h-8"/>} title="Nenhuma Eleição Ativa" description="Crie a primeira eleição do sistema para abrir as urnas." />
          ) : (
            eleicoes.map(eleicao => (
              <div key={eleicao.id} className={`p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all group hover:shadow-md ${eleicao.status === 'ativa' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                <div className="flex flex-col">
                   <h4 className="font-black text-lg flex items-center gap-2">{eleicao.nome} {eleicao.status === 'ativa' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}</h4>
                   <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg ${eleicao.tipo === 'universal' ? 'bg-green-100 text-green-700 border border-green-200' : eleicao.tipo === 'geral' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-orange-100 text-orange-700 border border-orange-200'}`}>
                        {eleicao.tipo === 'universal' && <span className="flex items-center gap-1"><Globe className="w-3 h-3"/> UNIVERSAL</span>}
                        {eleicao.tipo === 'geral' && <span className="flex items-center gap-1"><Star className="w-3 h-3"/> GERAL RESTRITA</span>}
                        {eleicao.tipo === 'turma' && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> POR TURMA</span>}
                      </span>
                      {eleicao.cargos?.split(',').map((c, i) => (<span key={i} className="text-[9px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase border border-slate-200">{c.trim()}</span>))}
                   </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                   <button onClick={() => toggleStatus(eleicao)} className={`flex-1 md:flex-none text-xs font-bold px-5 py-2.5 rounded-lg transition-colors ${eleicao.status === 'ativa' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                      {eleicao.status === 'ativa' ? 'Pausar Urnas' : 'Ativar Eleição'}
                   </button>
                   <button onClick={() => startEdit(eleicao)} className="p-2.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 className="w-4 h-4"/></button>
                   <button onClick={() => setDialogConfig({ isOpen: true, id: eleicao.id, nome: eleicao.nome })} className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ManageEleicoes;
