import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Loader2, PlayCircle, StopCircle, Globe, Users, CheckCircle2, Star, Tags, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type TipoEleicao = 'turma' | 'geral' | 'universal';

interface Eleicao {
  id: string;
  nome: string;
  status: string;
  tipo: TipoEleicao;
  cargos: string;
  created_at: string;
}

const ManageEleicoes = () => {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [newNome, setNewNome] = useState("");
  const [newCargos, setNewCargos] = useState("");
  const [newTipo, setNewTipo] = useState<TipoEleicao>('universal');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEleicoes();
  }, []);

  const fetchEleicoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eleicoes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setEleicoes(data);
    } catch (error: any) {
      toast({ title: "Erro ao buscar", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEleicao = async () => {
    if (!newNome.trim() || !newCargos.trim()) {
      toast({ title: "Atenção", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }

    const payload = { 
      nome: newNome.trim(), 
      tipo: newTipo, 
      cargos: newCargos.trim() 
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('eleicoes').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: "Eleição Atualizada!" });
      } else {
        const { error } = await supabase.from('eleicoes').insert({ ...payload, status: 'ativa' });
        if (error) throw error;
        toast({ title: "Eleição Criada!" });
      }
      cancelEdit();
      fetchEleicoes();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const startEdit = (e: Eleicao) => {
    setNewNome(e.nome);
    setNewTipo(e.tipo);
    setNewCargos(e.cargos || "");
    setEditingId(e.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const cancelEdit = () => {
    setNewNome("");
    setNewTipo("universal");
    setNewCargos("");
    setEditingId(null);
  };

  const toggleStatus = async (eleicao: Eleicao) => {
    const novoStatus = eleicao.status === 'ativa' ? 'encerrada' : 'ativa';
    const { error } = await supabase.from('eleicoes').update({ status: novoStatus }).eq('id', eleicao.id);
    
    if (!error) {
      fetchEleicoes();
      toast({ title: "Status Atualizado", description: `Eleição ${novoStatus}.` });
    } else {
      toast({ title: "Erro", description: "Não foi possível atualizar o status.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Atenção! Excluir a eleição apagará TODOS OS VOTOS vinculados a ela na Auditoria. Tem certeza?")) return;
    
    try {
      await supabase.from('votes').delete().eq('eleicao_id', id);
      const { error } = await supabase.from('eleicoes').delete().eq('id', id);
      
      if (error) throw error;
      
      setEleicoes(prev => prev.filter(e => e.id !== id));
      toast({ title: "Excluída", description: "Eleição removida com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="mb-8 border-b border-slate-100 pb-6">
        <h2 className="text-xl font-black text-slate-800 mb-2">Eleições em Lote (Multi-Segmentos)</h2>
        <p className="text-sm text-slate-500 font-medium">Crie uma Eleição Mestra e defina todos os segmentos que pertencem a ela. A urna exibirá os cargos em sequência automaticamente.</p>
      </div>

      <div className={`bg-slate-50 p-6 rounded-xl border mb-8 transition-all ${editingId ? 'border-blue-300 ring-4 ring-blue-50' : 'border-slate-200'}`}>
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
          {editingId ? "Editar Eleição" : "Iniciar Novo Pleito"}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              placeholder="Nome da Eleição (Ex: Jovem Ouvidor 2026)" 
              className="flex-1 p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
              value={newNome}
              onChange={e => setNewNome(e.target.value)}
            />
            <select 
              className="p-3 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none focus:border-blue-500 md:w-[350px]"
              value={newTipo}
              onChange={(e) => setNewTipo(e.target.value as TipoEleicao)}
            >
              <option value="universal">Universal (A escola inteira vota)</option>
              <option value="geral">Geral Restrita (Só vota quem é do cargo)</option>
              <option value="turma">Por Turma (Votação interna da sala)</option>
            </select>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <input 
                type="text" 
                placeholder="Cargos em disputa separados por vírgula (Ex: Jovem Ouvidor Geral, Jovem Ouvidor LGBT)" 
                className="w-full p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
                value={newCargos}
                onChange={e => setNewCargos(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold ml-1 flex items-center gap-1">
                <Tags className="w-3 h-3"/> Digite os segmentos separados por vírgula.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {editingId && (
                <button onClick={cancelEdit} className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-bold text-sm hover:bg-slate-300 transition-colors">
                  <X className="w-4 h-4"/>
                </button>
              )}
              <button onClick={handleSaveEleicao} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md whitespace-nowrap">
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                {editingId ? "Salvar Alterações" : "Criar Eleição"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : eleicoes.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Nenhuma eleição registrada.</p>
        ) : (
          eleicoes.map(eleicao => (
            <div key={eleicao.id} className={`p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${eleicao.status === 'ativa' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200'}`}>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                <div className={`p-3 rounded-full hidden md:block ${eleicao.status === 'ativa' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100 text-slate-400'}`}>
                  {eleicao.status === 'ativa' ? <PlayCircle className="w-6 h-6 animate-pulse" /> : <StopCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    {eleicao.nome} 
                    {eleicao.status === 'ativa' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full flex items-center gap-1 ${eleicao.tipo === 'universal' ? 'bg-green-100 text-green-700' : eleicao.tipo === 'geral' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                      {eleicao.tipo === 'universal' && <><Globe className="w-3 h-3"/> UNIVERSAL</>}
                      {eleicao.tipo === 'geral' && <><Star className="w-3 h-3"/> GERAL RESTRITA</>}
                      {eleicao.tipo === 'turma' && <><Users className="w-3 h-3"/> POR TURMA</>}
                    </span>
                    {eleicao.cargos?.split(',').filter(c => c.trim()).map((c, i) => (
                      <span key={i} className="text-[9px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-bold uppercase border border-slate-300">
                        {c.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-4 md:pt-0 border-slate-200 mt-2 md:mt-0">
                <button 
                  onClick={() => toggleStatus(eleicao)} 
                  className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors flex-1 md:flex-none ${eleicao.status === 'ativa' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                >
                  {eleicao.status === 'ativa' ? 'Encerrar' : 'Reativar'}
                </button>
                <button onClick={() => startEdit(eleicao)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 rounded-lg transition-colors">
                  <Edit2 className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(eleicao.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-800 rounded-lg transition-colors">
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

export default ManageEleicoes;
