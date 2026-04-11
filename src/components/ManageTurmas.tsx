import { useState, useEffect } from "react";
import { Turma, Student } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Users, FileSpreadsheet, Loader2, Save, X, UserPlus, FileDown, UploadCloud, Tag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Papa from 'papaparse';

interface ManageTurmasProps {
  onTurmasChanged: () => void;
}

const ManageTurmas = ({ onTurmasChanged }: ManageTurmasProps) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [newTurmaName, setNewTurmaName] = useState("");
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", document: "", contact: "", is_candidate: false, candidate_number: "", vice_name: "" });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [escolaId, setEscolaId] = useState<string | null>(null);

  // NOVO SISTEMA DE TAGS DE CARGOS PARA O ALUNO
  const [studentTags, setStudentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { fetchTurmas(); }, []);

  const fetchTurmas = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: adminData } = await supabase.from('admins').select('escola_id').eq('auth_id', userData.user.id).single();
      if (adminData?.escola_id) {
        setEscolaId(adminData.escola_id);
        const { data } = await supabase.from('turmas').select('*').eq('escola_id', adminData.escola_id).order('name');
        setTurmas(data || []);
      }
    }
    setLoading(false);
  };

  const handleAddTurma = async () => {
    if (!newTurmaName.trim() || !escolaId) return;
    const { data, error } = await supabase.from('turmas').insert([{ name: newTurmaName, escola_id: escolaId }]).select().single();
    if (!error && data) {
      setTurmas([...turmas, data]);
      setNewTurmaName("");
      onTurmasChanged();
      toast({ title: "Sucesso", description: "Turma adicionada!" });
    }
  };

  const handleDeleteTurma = async (id: string) => {
    if (!confirm("Excluir esta turma apagará todos os alunos nela. Continuar?")) return;
    await supabase.from('students').delete().eq('turma_id', id);
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    if (!error) {
      setTurmas(turmas.filter(t => t.id !== id));
      if (selectedTurma?.id === id) setSelectedTurma(null);
      onTurmasChanged();
      toast({ title: "Sucesso", description: "Turma removida." });
    }
  };

  const fetchStudents = async (turmaId: string) => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').eq('turma_id', turmaId).order('name');
    setStudents(data || []);
    setLoading(false);
  };

  const selectTurma = (t: Turma) => {
    setSelectedTurma(t);
    fetchStudents(t.id);
    resetForm();
  };

  const resetForm = () => {
    setNewStudent({ name: "", document: "", contact: "", is_candidate: false, candidate_number: "", vice_name: "" });
    setStudentTags([]);
    setTagInput("");
    setEditingStudentId(null);
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

  const handleSaveStudent = async () => {
    if (!newStudent.name.trim() || !selectedTurma) return;
    
    // Junta as tags com vírgula para salvar no banco
    const cargosFinal = studentTags.join(', ');

    const payload = {
      turma_id: selectedTurma.id,
      name: newStudent.name,
      document: newStudent.document,
      contact: newStudent.contact,
      is_candidate: newStudent.is_candidate,
      candidate_role: cargosFinal,
      candidate_number: newStudent.candidate_number ? parseInt(newStudent.candidate_number) : null,
      vice_name: newStudent.vice_name
    };

    if (editingStudentId) {
      const { error } = await supabase.from('students').update(payload).eq('id', editingStudentId);
      if (!error) {
        toast({ title: "Atualizado", description: "Dados do aluno atualizados." });
        fetchStudents(selectedTurma.id);
        resetForm();
      }
    } else {
      const { error } = await supabase.from('students').insert([payload]);
      if (!error) {
        toast({ title: "Adicionado", description: "Aluno adicionado com sucesso." });
        fetchStudents(selectedTurma.id);
        resetForm();
      }
    }
  };

  const startEditStudent = (s: Student) => {
    setNewStudent({
      name: s.name, document: s.document || "", contact: s.contact || "",
      is_candidate: s.is_candidate || false,
      candidate_number: s.candidate_number?.toString() || "",
      vice_name: s.vice_name || ""
    });
    // Separa a string do banco em tags visuais
    setStudentTags(s.candidate_role ? s.candidate_role.split(',').map(r => r.trim()) : []);
    setEditingStudentId(s.id!);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Remover aluno?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) {
      setStudents(students.filter(s => s.id !== id));
      toast({ title: "Removido", description: "Aluno removido." });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTurma) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const formattedStudents = rows.map(row => ({
          turma_id: selectedTurma.id,
          name: row.Nome || row.name || row.NOME,
          document: row.Matricula || row.document || row.MATRICULA || null,
          is_candidate: false
        })).filter(s => s.name);

        if (formattedStudents.length > 0) {
          const { error } = await supabase.from('students').insert(formattedStudents);
          if (error) toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
          else {
            toast({ title: "Planilha Importada!", description: `${formattedStudents.length} alunos cadastrados.` });
            fetchStudents(selectedTurma.id);
          }
        }
        setLoading(false);
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* LATERAL ESQUERDA: LISTA DE TURMAS */}
      <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 h-fit">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><Users className="w-4 h-4"/> Turmas Cadastradas</h3>
        
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="Nova Turma" className="w-full p-2 text-sm border rounded outline-none focus:border-blue-500" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {turmas.map(t => (
            <div key={t.id} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedTurma?.id === t.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-slate-100'}`} onClick={() => selectTurma(t)}>
              <span className="font-bold text-slate-700 text-sm">{t.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteTurma(t.id); }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* LATERAL DIREITA: GESTÃO DE ALUNOS */}
      <div className="w-full md:w-2/3">
        {selectedTurma ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl">
              <h2 className="text-xl font-black flex items-center gap-2">Turma: <span className="text-blue-400">{selectedTurma.name}</span></h2>
              <label className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-2 transition-colors">
                <UploadCloud className="w-4 h-4"/> Importar CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* FORMULÁRIO DO ALUNO COM O NOVO SISTEMA DE TAGS */}
            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-4">{editingStudentId ? "Editar Aluno" : "Cadastrar Manualmente"}</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Nome Completo" className="w-full p-3 border border-slate-200 rounded bg-slate-50 text-sm font-bold" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                
                <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={newStudent.is_candidate} onChange={e => setNewStudent({...newStudent, is_candidate: e.target.checked})} />
                  <span className="text-sm font-black text-blue-900 uppercase">ESTE ALUNO É CANDIDATO OU POSSUI CARGO</span>
                </label>

                {newStudent.is_candidate && (
                  <div className="bg-white p-4 border-2 border-blue-100 rounded-xl space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Nº da Chapa (Ex: 10)" className="p-3 border rounded bg-slate-50 text-sm font-bold" value={newStudent.candidate_number} onChange={e => setNewStudent({...newStudent, candidate_number: e.target.value})} />
                      <input type="text" placeholder="Nome do Vice (Opcional)" className="p-3 border rounded bg-slate-50 text-sm" value={newStudent.vice_name} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                    </div>

                    {/* SISTEMA DE TAGS */}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Cargos / Segmentos do Aluno</p>
                      
                      <div className="flex gap-2 mb-3">
                        <input 
                          type="text" 
                          placeholder="Ex: Jovem Ouvidor LGBT" 
                          className="flex-1 p-2 border rounded text-sm outline-none focus:border-blue-500" 
                          value={tagInput} 
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if(e.key === 'Enter') handleAddTag() }}
                        />
                        <button onClick={handleAddTag} className="bg-slate-800 text-white px-3 py-2 rounded text-xs font-bold hover:bg-slate-700">Adicionar</button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {studentTags.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum cargo adicionado.</span>}
                        {studentTags.map((tag, i) => (
                          <div key={i} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200">
                            <Tag className="w-3 h-3"/> {tag}
                            <button onClick={() => removeTag(tag)} className="ml-1 text-indigo-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveStudent} className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 flex items-center justify-center gap-2">
                    {editingStudentId ? <Save className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>} 
                    {editingStudentId ? "SALVAR ALTERAÇÕES" : "CADASTRAR ALUNO"}
                  </button>
                  {editingStudentId && (
                    <button onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 rounded-lg font-bold hover:bg-slate-300">Cancelar</button>
                  )}
                </div>
              </div>
            </div>

            {/* LISTAGEM DE ALUNOS */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-3 border-b border-slate-200"><h3 className="text-xs font-bold uppercase text-slate-500">Lista da Turma ({students.length})</h3></div>
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : students.length === 0 ? (
                  <div className="text-center p-8 text-sm text-slate-400">Nenhum aluno cadastrado.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {students.map(s => (
                      <div key={s.id} className="p-4 hover:bg-slate-50 flex items-center justify-between group">
                        <div>
                          <p className="font-bold text-slate-800">{s.name}</p>
                          {s.is_candidate && s.candidate_role && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.candidate_role.split(',').map((tag, i) => (
                                <span key={i} className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                                  {tag.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEditStudent(s)} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteStudent(s.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium text-lg">Selecione uma turma ao lado</p>
            <p className="text-sm">para gerenciar os seus alunos e candidatos.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageTurmas;
