import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Save, X, Archive, CheckCircle2, Loader2, CheckSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Eleicao { id: string; nome: string; status: string; created_at: string; }

export default function ManageEleicoes() {
  const [eleicoes, setEleicoes] = useState<Eleicao[]>([]);
  const [loading, setLoading] = useState(false);
  const [newNome, setNewNome] = useState("");
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => { fetchEleicoes(); }, []);

  const fetchEleicoes = async () => {
    setLoading(true);
    const { data } = await supabase.from('eleicoes').select('*').order('created_at', { ascending: false });
    if (data) setEleicoes(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newNome.trim()) return;
    const { data, error } = await supabase.from('eleicoes').insert({ nome: newNome.trim(), status: 'ativa' }).select().single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setEleicoes([data, ...eleicoes]);
      setNewNome("");
      toast({ title: "Sucesso", description: "Eleição criada com sucesso!" });
    }
  };

  const startEdit = (e: Eleicao) => {
    setEditingId(e.id);
    setEditNome(e.nome);
    setEditStatus(e.status);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editNome.trim()) return;
    const { error } = await supabase.from('eleicoes').update({ nome: editNome.trim(), status: editStatus }).eq('id', id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setEleicoes(eleicoes.map(e => e.id === id ? { ...e, nome: editNome.trim(), status: editStatus } : e));
      setEditingId(null);
      toast({ title: "Sucesso", description: "Eleição atualizada!" });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center gap-4 mb-6 border-b border-slate-100 pb-6">
        <div className="p-4 bg-indigo-100 text-indigo-700 rounded-2xl">
          <CheckSquare className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Gestão de Eleições</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Crie novos eventos ou encerre os antigos. <strong className="text-red-500">Por segurança, eleições não podem ser apagadas (Histórico).</strong>
          </p>
        </div>
      </div>

      <div className="flex gap-3 mb-8 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <input 
          type="text" 
          placeholder="Dê um nome (Ex: Eleição Jovem Ouvidor 2026...)" 
          className="flex-1 p-3.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
          value={newNome} 
          onChange={e => setNewNome(e.target.value)} 
        />
        <button onClick={handleCreate} className="bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 transition-all shadow-lg font-bold text-sm flex items-center gap-2">
          <Plus className="w-5 h-5" /> Criar Evento
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
          {eleicoes.map(eleicao => (
            <div key={eleicao.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-slate-200 rounded-2xl bg-white shadow-sm gap-4 hover:border-indigo-300 transition-colors">
              {editingId === eleicao.id ? (
                <div className="flex flex-1 flex-col md:flex-row gap-3 w-full">
                  <input 
                    type="text" 
                    className="flex-1 p-3 border border-indigo-300 outline-none text-sm font-bold text-slate-800 bg-indigo-50/50 rounded-xl" 
                    value={editNome} 
                    onChange={e => setEditNome(e.target.value)} 
                  />
                  <select 
                    className="p-3 border border-slate-300 rounded-xl text-sm font-bold outline-none bg-white"
                    value={editStatus}
                    onChange={e => setEditStatus(e.target.value)}
                  >
                    <option value="ativa">🟢 STATUS: ATIVA</option>
                    <option value="encerrada">🔴 STATUS: ENCERRADA</option>
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(eleicao.id)} className="flex-1 md:flex-none bg-green-600 text-white px-5 py-3 rounded-xl hover:bg-green-700 font-bold flex items-center justify-center gap-2 shadow-md"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingId(null)} className="flex-1 md:flex-none bg-slate-200 text-slate-600 px-5 py-3 rounded-xl hover:bg-slate-300 font-bold flex items-center justify-center gap-2"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">{eleicao.nome}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1 tracking-widest uppercase">ID: {eleicao.id.split('-')[0]} • Criada em {new Date(eleicao.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm ${eleicao.status === 'ativa' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                      {eleicao.status === 'ativa' ? <CheckCircle2 className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      {eleicao.status}
                    </span>
                    <button onClick={() => startEdit(eleicao)} className="text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 p-2.5 rounded-xl transition-colors border border-slate-200 hover:border-indigo-200 shadow-sm">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {eleicoes.length === 0 && <p className="text-center text-sm text-slate-400 font-medium py-12 border-2 border-dashed border-slate-200 rounded-2xl">Nenhuma eleição criada ainda. Crie a primeira para começar!</p>}
        </div>
      )}
    </div>
  );
}
