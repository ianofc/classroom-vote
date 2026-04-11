import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Loader2, PlayCircle, StopCircle, Globe, Users, CheckCircle2, Star, Tags, Save, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Eleicao { id: string; nome: string; status: string; tipo: 'turma' | 'geral' | 'universal'; cargos: string; created_at: string; }

const ManageEleicoes = () => {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newNome, setNewNome] = useState("");
  const [newCargos, setNewCargos] = useState("");
  const [newTipo, setNewTipo] = useState<'turma' | 'geral' | 'universal'>('universal');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => { fetchEleicoes(); }, []);

  const fetchEleicoes = async () => {
    setLoading(true);
    const { data } = await supabase.from('eleicoes').select('*').order('created_at', { ascending: false });
    if (data) setEleicoes(data);
    setLoading(false);
  };

  const handleSaveEleicao = async () => {
    if (!newNome.trim() || !newCargos.trim()) { toast({ title: "Atenção", description: "Preencha todos os campos." }); return; }

    const payload = { nome: newNome.trim(), tipo: newTipo, cargos: newCargos.trim() };

    if (editingId) {
       const { error } = await supabase.from('eleicoes').update(payload).eq('id', editingId);
       if (!error) { toast({ title: "Eleição Atualizada!" }); cancelEdit(); fetchEleicoes(); }
    } else {
       const { error } = await supabase.from('eleicoes').insert({ ...payload, status: 'ativa' });
       if (!error) { toast({ title: "Eleição Criada!" }); cancelEdit(); fetchEleicoes(); }
    }
  };

  const startEdit = (e: Eleicao) => {
      setNewNome(e.nome); setNewTipo(e.tipo); setNewCargos(e.cargos || ""); setEditingId(e.id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => {
      setNewNome(""); setNewTipo("universal"); setNewCargos(""); setEditingId(null);
  };

  const toggleStatus = async (eleicao: Eleicao) => {
    const novoStatus = eleicao.status === 'ativa' ? 'encerrada' : 'ativa';
    const { error } = await supabase.from('eleicoes').update({ status: novoStatus }).eq('id', eleicao.id);
    if (!error) { fetchEleicoes(); toast({ title: "Status Atualizado", description: `Eleição ${novoStatus}.` }); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Atenção! Excluir a eleição apagará TODOS OS VOTOS vinculados a ela. Tem certeza?")) return;
    await supabase.from('votes').delete().eq('eleicao_id', id);
    const { error } = await supabase.from('eleicoes').delete().eq('id', id);
    if (!error) { setEleicoes(eleicoes.filter(e => e.id !== id)); toast({ title: "Excluída", description: "Eleição removida." }); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className={`bg-slate-50 p-6 rounded-xl border mb-8 transition-all ${editingId ? 'border-blue-400 ring-4 ring-blue-50' : 'border-slate-200'}`}>
        <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${editingId ? 'text-blue-600' : 'text-slate-400'}`}>
          {editingId ? "A Editar Eleição Selecionada" : "Iniciar Novo Pleito"}
        </h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input type="text" placeholder="Nome da Eleição" className="flex-1 p-3 border border-slate-300 rounded-lg text-sm font-bold outline-none focus:border-blue-500" value={newNome} onChange={e => setNewNome(e.target.value)} />
            <select className="p-3 border border-slate-300 rounded-lg text-sm font-bold bg-white outline-none focus:border-blue-500 md:w-[350px]" value={newTipo} onChange={(e) => setNewTipo(e.target.value as any)}>
              <option value="universal">Universal (A escola inteira vota)</option>
              <option value="geral">Geral Restrita (Só vota quem é do cargo)</option>
              <option value="turma">Por Turma (Votação interna da sala)</option>
            </select>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
              <input type="text" placeholder="Cargos separados por vírgula" className="w-full p-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" value={newCargos} onChange={e => setNewCargos(e.target.value)} />
              <p className="text-[10px] text-slate-400 mt-1 ml-1 uppercase font-bold flex items-center gap-1"><Tags className="w-3 h-3"/> Separe os segmentos por vírgula</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              {editingId && <button onClick={cancelEdit} className="bg-slate-200 text-slate-700 px-4 py-3 rounded-lg font-bold text-sm hover:bg-slate-300"><X className="w-4 h-4"/></button>}
              <button onClick={handleSaveEleicao} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md whitespace-nowrap">
                {editingId ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {editingId ? "Salvar Alterações" : "Criar Eleição"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : eleicoes.map(eleicao => (
            <div key={eleicao.id} className={`p-5 rounded-xl border flex flex-col md:flex-row items-center justify-between gap-4 transition-all ${eleicao.status === 'ativa' ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col">
                 <h4 className="font-black text-lg flex items-center gap-2">{eleicao.nome} {eleicao.status === 'ativa' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}</h4>
                 <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${eleicao.tipo === 'universal' ? 'bg-green-100 text-green-700' : eleicao.tipo === 'geral' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                      {eleicao.tipo === 'universal' && <span className="flex items-center gap-1"><Globe className="w-3 h-3"/> UNIVERSAL</span>}
                      {eleicao.tipo === 'geral' && <span className="flex items-center gap-1"><Star className="w-3 h-3"/> GERAL RESTRITA</span>}
                      {eleicao.tipo === 'turma' && <span className="flex items-center gap-1"><Users className="w-3 h-3"/> POR TURMA</span>}
                    </span>
                    {eleicao.cargos?.split(',').map((c, i) => (<span key={i} className="text-[9px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase border border-slate-300">{c.trim()}</span>))}
                 </div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => toggleStatus(eleicao)} className={`text-xs font-bold px-4 py-2 rounded-lg transition-colors ${eleicao.status === 'ativa' ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                    {eleicao.status === 'ativa' ? 'Encerrar' : 'Reativar'}
                 </button>
                 <button onClick={() => startEdit(eleicao)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"><Edit2 className="w-4 h-4"/></button>
                 <button onClick={() => handleDelete(eleicao.id)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"><Trash2 className="w-4 h-4"/></button>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};
export default ManageEleicoes;
