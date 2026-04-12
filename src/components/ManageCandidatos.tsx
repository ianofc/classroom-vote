import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Edit2, Loader2, Save, X, Search, Tag, UserCheck, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ManageCandidatos() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Estados de Edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editVice, setEditVice] = useState("");
  const [studentTags, setStudentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Puxa as turmas (só para mostrar o nome da turma na listagem) e os candidatos
      const [tRes, cRes] = await Promise.all([
        supabase.from('turmas').select('id, name'),
        supabase.from('students').select('*').eq('is_candidate', true).order('name')
      ]);

      if (tRes.data) setTurmas(tRes.data);
      if (cRes.data) setCandidates(cRes.data);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro", description: "Falha ao carregar candidatos.", variant: "destructive" });
    }
    setLoading(false);
  };

  const getTurmaName = (id: string) => {
    return turmas.find(t => t.id === id)?.name || "Turma Desconhecida";
  };

  const startEdit = (candidate: any) => {
    setEditingId(candidate.id);
    setEditName(candidate.name);
    setEditNumber(candidate.candidate_number ? candidate.candidate_number.toString() : "");
    setEditVice(candidate.vice_name || "");
    setStudentTags(candidate.candidate_role ? candidate.candidate_role.split(',').map((r: string) => r.trim()) : []);
    setTagInput("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setStudentTags([]);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !studentTags.includes(tagInput.trim())) {
      setStudentTags([...studentTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setStudentTags(studentTags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    if (!editingId) return;
    setIsSaving(true);
    
    const cargosFinal = studentTags.join(', ');
    const numParsed = parseInt(editNumber);

    const payload = {
      name: editName.trim(),
      candidate_role: cargosFinal || null,
      candidate_number: !isNaN(numParsed) ? numParsed : null,
      vice_name: editVice.trim() || null
    };

    try {
      const { error } = await supabase.from('students').update(payload).eq('id', editingId);
      if (error) throw error;
      
      toast({ title: "Candidato Atualizado!", description: "Os cargos e dados foram alterados globalmente." });
      fetchData();
      cancelEdit();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Remover a candidatura de ${name}? O aluno voltará a ser apenas eleitor.`)) return;
    try {
      const { error } = await supabase.from('students').update({ is_candidate: false, candidate_role: null, candidate_number: null, vice_name: null }).eq('id', id);
      if (error) throw error;
      setCandidates(prev => prev.filter(c => c.id !== id));
      toast({ title: "Candidatura Revogada" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const filteredCandidates = candidates.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.candidate_role && c.candidate_role.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-blue-600" /> Gestão Global de Candidatos
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">Altere cargos, números e vices de todos os candidatos sem precisar navegar pelas turmas.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou cargo..." 
            className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* FORMULÁRIO DE EDIÇÃO GLOBAL RÁPIDA */}
      {editingId && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-800">A Editar Candidatura</h3>
            <button onClick={cancelEdit} className="text-blue-400 hover:text-blue-600"><X className="w-5 h-5"/></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Candidato</label>
              <input type="text" className="w-full p-2.5 border rounded-lg text-sm font-bold outline-none focus:border-blue-500" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Número na Urna</label>
              <input type="number" className="w-full p-2.5 border rounded-lg text-sm font-bold outline-none focus:border-blue-500" value={editNumber} onChange={e => setEditNumber(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome do Vice (Opcional)</label>
              <input type="text" className="w-full p-2.5 border rounded-lg text-sm outline-none focus:border-blue-500" value={editVice} onChange={e => setEditVice(e.target.value)} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-blue-100 mb-4">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Cargos Concorridos (Tags)</p>
            <div className="flex gap-2 mb-3">
              <input type="text" placeholder="Ex: Jovem Ouvidor Geral" className="flex-1 p-2 border rounded text-sm outline-none focus:border-blue-500" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleAddTag() }} />
              <button onClick={handleAddTag} className="bg-slate-800 text-white px-4 py-2 rounded text-xs font-bold hover:bg-slate-700">Adicionar Cargo</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {studentTags.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum cargo. O aluno não aparecerá na urna.</span>}
              {studentTags.map((tag, i) => (
                <div key={i} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200">
                  <Tag className="w-3 h-3"/> {tag}
                  <button onClick={() => removeTag(tag)} className="ml-1 text-indigo-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 shadow-md disabled:opacity-50">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar Alterações
            </button>
          </div>
        </div>
      )}

      {/* LISTA GERAL DE CANDIDATOS */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : filteredCandidates.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
          <p className="font-bold">Nenhum candidato encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCandidates.map(cand => (
            <div key={cand.id} className={`bg-white border rounded-xl p-4 flex flex-col hover:shadow-md transition-shadow ${editingId === cand.id ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-black text-slate-800 leading-tight">{cand.name}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Turma: <strong className="text-slate-700">{getTurmaName(cand.turma_id)}</strong></p>
                  <p className="text-xs text-blue-600 font-black mt-0.5">Nº {cand.candidate_number}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4 mt-2">
                {cand.candidate_role ? cand.candidate_role.split(',').map((role: string, i: number) => (
                  <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase font-bold">{role.trim()}</span>
                )) : <span className="text-[9px] text-red-500 font-bold uppercase">Sem Cargo Definido</span>}
              </div>

              <div className="mt-auto flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => startEdit(cand)} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => handleRevoke(cand.id, cand.name)} className="px-3 bg-red-50 text-red-600 hover:bg-red-100 py-2 rounded-lg transition-colors" title="Revogar Candidatura">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
