import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Loader2, PlayCircle, StopCircle, Globe, Users, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Eleicao {
  id: string;
  nome: string;
  status: string;
  tipo: 'turma' | 'geral';
  created_at: string;
}

const ManageEleicoes = () => {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newTipo, setNewTipo] = useState<'turma' | 'geral'>('turma');

  useEffect(() => {
    fetchEleicoes();
  }, []);

  const fetchEleicoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('eleicoes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEleicoes(data);
    }
    setLoading(false);
  };

  const handleAddEleicao = async () => {
    if (!newNome.trim()) {
      toast({ title: "Atenção", description: "Dê um nome para a eleição.", variant: "destructive" });
      return;
    }

    // REMOVIDA A TRAVA: Agora o sistema permite múltiplas eleições ativas simultaneamente!
    const { data, error } = await supabase
      .from('eleicoes')
      .insert({ nome: newNome.trim(), tipo: newTipo, status: 'ativa' })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Nova eleição iniciada com sucesso!" });
      setNewNome("");
      fetchEleicoes();
    }
  };

  const toggleStatus = async (eleicao: Eleicao) => {
    const novoStatus = eleicao.status === 'ativa' ? 'encerrada' : 'ativa';
    
    // REMOVIDA A TRAVA: Pode reativar sem desligar as outras
    const { error } = await supabase.from('eleicoes').update({ status: novoStatus }).eq('id', eleicao.id);
    
    if (!error) {
      fetchEleicoes();
      toast({ title: "Status Atualizado", description: `Eleição ${novoStatus}.` });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Atenção! Excluir a eleição apagará TODOS OS VOTOS vinculados a ela na Auditoria. Tem certeza?")) return;
    
    await supabase.from('votes').delete().eq('eleicao_id', id);
    const { error } = await supabase.from('eleicoes').delete().eq('id', id);
    
    if (!error) {
      setEleicoes(eleicoes.filter(e => e.id !== id));
      toast({ title: "Excluída", description: "Eleição e votos removidos." });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="mb-8 border-b border-slate-100 pb-6">
        <h2 className="text-xl font-black text-slate-800 mb-2">Abertura de Eleições (Multitarefa)</h2>
        <p className="text-sm text-slate-500 font-medium">Você pode ter múltiplas eleições ativas simultaneamente. O sistema usará inteligência artificial para decidir em quais delas cada aluno pode votar.</p>
      </div>

      {/* FORMULÁRIO DE NOVA ELEIÇÃO */}
      <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 mb-8">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Iniciar Novo Pleito</h3>
        <div className="flex flex-col md:flex-row gap-4">
          <input 
            type="text" 
            placeholder="Nome (Ex: Líder Geral 2026)" 
            className="flex-1 p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500"
            value={newNome}
            onChange={e => setNewNome(e.target.value)}
          />
          
          <select 
            className="p-3 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none focus:border-blue-500"
            value={newTipo}
            onChange={(e) => setNewTipo(e.target.value as 'turma' | 'geral')}
          >
            <option value="geral">Votação Geral (Todos ou Líderes)</option>
            <option value="turma">Votação por Turma (Interna)</option>
          </select>

          <button onClick={handleAddEleicao} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md">
            <Plus className="w-4 h-4" /> Criar e Ativar
          </button>
        </div>
      </div>

      {/* LISTA DE ELEIÇÕES */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-1">Painel de Controle Eleitoral</h3>
        
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
        ) : eleicoes.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Nenhuma eleição registada.</p>
        ) : (
          eleicoes.map(eleicao => (
            <div key={eleicao.id} className={`p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${eleicao.status === 'ativa' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200'}`}>
              
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className={`p-3 rounded-full ${eleicao.status === 'ativa' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-100 text-slate-400'}`}>
                  {eleicao.status === 'ativa' ? <PlayCircle className="w-6 h-6 animate-pulse" /> : <StopCircle className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-lg flex items-center gap-2">
                    {eleicao.nome} 
                    {eleicao.status === 'ativa' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${eleicao.tipo === 'geral' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                      {eleicao.tipo === 'geral' ? <span className="flex items-center gap-1"><Globe className="w-3 h-3"/> GERAL (ESCOLA)</span> : <span className="flex items-center gap-1"><Users className="w-3 h-3"/> POR TURMA</span>}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {new Date(eleicao.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                <button 
                  onClick={() => toggleStatus(eleicao)} 
                  className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${eleicao.status === 'ativa' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                >
                  {eleicao.status === 'ativa' ? 'Encerrar Eleição' : 'Reativar'}
                </button>
                <button onClick={() => handleDelete(eleicao.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
