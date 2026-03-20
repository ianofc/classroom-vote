import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Upload, Loader2, CheckSquare, Square, FileUp, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Turma { id: string; name: string; }
interface Student {
  id: string; turma_id: string; name: string; document: string; contact: string;
  is_candidate: boolean; candidate_role?: string; candidate_number?: number; vice_name?: string; photo_url?: string; vice_photo_url?: string;
}

// LISTA DE CARGOS DISPONÍVEIS
const ROLES = [
  "Líder Geral", 
  "Líder Quilombola", 
  "Líder Rural", 
  "Líder LGBTQIA+", 
  "Líder Indígena"
];

const ManageTurmas = ({ onTurmasChanged }: { onTurmasChanged: () => void }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados dos Formulários
  const [newTurmaName, setNewTurmaName] = useState("");
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ 
    name: "", document: "", contact: "", is_candidate: false, candidate_role: ROLES[0] 
  });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vicePhotoFile, setVicePhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isImportingCSV, setIsImportingCSV] = useState(false);

  useEffect(() => { fetchTurmas(); }, []);
  useEffect(() => { if (selectedTurma) fetchStudents(selectedTurma.id); }, [selectedTurma]);

  const fetchTurmas = async () => {
    setLoading(true);
    const { data } = await supabase.from('turmas').select('*').order('name');
    if (data) setTurmas(data);
    setLoading(false);
  };

  const fetchStudents = async (turmaId: string) => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').eq('turma_id', turmaId).order('name');
    if (data) setStudents(data);
    setLoading(false);
  };

  const handleAddTurma = async () => {
    if (!newTurmaName.trim()) return;
    const { data, error } = await supabase.from('turmas').insert({ name: newTurmaName.trim() }).select().single();
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setTurmas([...turmas, data]);
      setNewTurmaName("");
      toast({ title: "Sucesso", description: "Turma criada!" });
      onTurmasChanged();
    }
  };

  const handleDeleteTurma = async (id: string) => {
    if (!confirm("Isso apagará a turma e TODOS os alunos nela. Continuar?")) return;
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    if (!error) {
      setTurmas(turmas.filter(t => t.id !== id));
      if (selectedTurma?.id === id) setSelectedTurma(null);
      onTurmasChanged();
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `fotos/${Math.random()}.${fileExt}`;
    const { error } = await supabase.storage.from('candidatos-fotos').upload(filePath, file);
    if (error) {
      toast({ title: "Erro na foto", description: error.message, variant: "destructive" });
      return null;
    }
    return supabase.storage.from('candidatos-fotos').getPublicUrl(filePath).data.publicUrl;
  };

  const handleAddStudent = async () => {
    if (!selectedTurma || !newStudent.name || !newStudent.document) {
      toast({ title: "Atenção", description: "Nome e documento são obrigatórios.", variant: "destructive" });
      return;
    }
    if (newStudent.is_candidate && !newStudent.candidate_number) {
      toast({ title: "Atenção", description: "Candidatos precisam de um número de chapa.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    let pUrl = null, vpUrl = null;
    
    if (newStudent.is_candidate) {
      if (photoFile) pUrl = await uploadPhoto(photoFile);
      if (vicePhotoFile) vpUrl = await uploadPhoto(vicePhotoFile);
    }

    const { data, error } = await supabase.from('students').insert({
      turma_id: selectedTurma.id, 
      name: newStudent.name.trim(), 
      document: newStudent.document.trim(), 
      contact: newStudent.contact,
      is_candidate: newStudent.is_candidate, 
      candidate_role: newStudent.is_candidate ? newStudent.candidate_role : null,
      candidate_number: newStudent.is_candidate ? newStudent.candidate_number : null, 
      vice_name: newStudent.is_candidate ? newStudent.vice_name : null, 
      photo_url: pUrl, 
      vice_photo_url: vpUrl
    }).select().single();

    setIsUploading(false);

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setStudents([...students, data]);
      // Reseta o formulário
      setNewStudent({ name: "", document: "", contact: "", is_candidate: false, candidate_role: ROLES[0] });
      setPhotoFile(null);
      setVicePhotoFile(null);
      toast({ title: "Sucesso", description: "Aluno cadastrado!" });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Apagar aluno/candidato?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) setStudents(students.filter(s => s.id !== id));
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTurma) return;

    setIsImportingCSV(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        
        const newStudents = rows.slice(1).map(row => ({
          turma_id: selectedTurma.id,
          name: row[0]?.trim(),
          document: row[1]?.trim(),
          contact: row[2]?.trim(),
          is_candidate: false
        })).filter(s => s.name && s.document);

        if (newStudents.length === 0) throw new Error("Nenhum aluno válido encontrado.");

        const { data, error } = await supabase.from('students').insert(newStudents).select();
        if (error) throw error;
        
        setStudents([...students, ...(data as Student[])]);
        toast({ title: "Sucesso", description: `${data.length} alunos importados!` });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
      setIsImportingCSV(false);
      e.target.value = "";
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* COLUNA ESQUERDA: TURMAS */}
      <div className="lg:col-span-1 space-y-4 border-r border-slate-200 pr-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Turmas</h3>
        <div className="flex gap-2">
          <input type="text" placeholder="Nova Turma" className="flex-1 p-2 border rounded-md text-sm" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
          {turmas.map(t => (
            <div key={t.id} onClick={() => setSelectedTurma(t)} className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer ${selectedTurma?.id === t.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
              <span className="font-semibold text-sm text-slate-700">{t.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteTurma(t.id); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* COLUNA DIREITA: ALUNOS E CANDIDATOS */}
      <div className="lg:col-span-2 space-y-6">
        {!selectedTurma ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-10">
            <Users className="w-12 h-12 mb-2 opacity-50" />
            <p>Selecione uma turma para gerenciar alunos e importar lista.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center border-b pb-2 mb-4">
              <h2 className="text-xl font-black text-slate-800">Turma: <span className="text-blue-600">{selectedTurma.name}</span></h2>
              
              <label className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors ${isImportingCSV ? 'bg-slate-200 text-slate-500' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                {isImportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                {isImportingCSV ? "Importando..." : "Importar CSV"}
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={isImportingCSV} />
              </label>
            </div>

            {/* FORMULÁRIO DE CADASTRO */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-700">Cadastrar Manualmente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome Completo do Aluno" className="w-full p-2 border rounded-md text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                <input type="text" placeholder="Documento (RG/CPF)" className="w-full p-2 border rounded-md text-sm" value={newStudent.document} onChange={e => setNewStudent({...newStudent, document: e.target.value})} />
              </div>
              
              <div className="pt-2 border-t border-slate-200">
                <button onClick={() => setNewStudent({...newStudent, is_candidate: !newStudent.is_candidate})} className={`flex items-center gap-2 text-sm font-bold p-2 rounded-md ${newStudent.is_candidate ? 'text-blue-700 bg-blue-100' : 'text-slate-500 hover:bg-slate-200'}`}>
                  {newStudent.is_candidate ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />} ESTE ALUNO É CANDIDATO A UMA CHAPA
                </button>
              </div>

              {/* CAMPOS SE FOR CANDIDATO */}
              {newStudent.is_candidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">A qual cargo esta chapa concorre?</label>
                    <select 
                      className="w-full p-2 border rounded-md text-sm font-bold text-slate-800 bg-white" 
                      value={newStudent.candidate_role} 
                      onChange={e => setNewStudent({...newStudent, candidate_role: e.target.value})}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Número na Urna</label>
                    <input type="number" placeholder="Ex: 10" className="w-full p-2 border rounded-md text-sm" value={newStudent.candidate_number || ''} onChange={e => setNewStudent({...newStudent, candidate_number: parseInt(e.target.value)})} />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Nome do Vice (Opcional)</label>
                    <input type="text" placeholder="Nome do companheiro de chapa" className="w-full p-2 border rounded-md text-sm" value={newStudent.vice_name || ''} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                  </div>

                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <label className="cursor-pointer bg-white border border-dashed border-slate-300 p-3 flex flex-col items-center justify-center text-xs text-slate-500 rounded-md hover:border-blue-500 hover:bg-slate-50">
                      <Upload className="w-4 h-4 mb-1 text-blue-500" /> {photoFile ? <span className="text-green-600 font-bold">Foto do Titular OK</span> : "Anexar Foto Titular"}
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setPhotoFile(e.target.files[0])} />
                    </label>
                    
                    <label className="cursor-pointer bg-white border border-dashed border-slate-300 p-3 flex flex-col items-center justify-center text-xs text-slate-500 rounded-md hover:border-blue-500 hover:bg-slate-50">
                      <Upload className="w-4 h-4 mb-1 text-slate-400" /> {vicePhotoFile ? <span className="text-green-600 font-bold">Foto do Vice OK</span> : "Anexar Foto Vice"}
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setVicePhotoFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              )}
              <button onClick={handleAddStudent} disabled={isUploading} className="w-full bg-slate-800 text-white font-bold py-3 rounded-lg flex justify-center gap-2 hover:bg-slate-900 disabled:opacity-50">
                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} {isUploading ? "Salvando Dados..." : "Salvar Aluno"}
              </button>
            </div>

            {/* LISTA DE ALUNOS CADASTRADOS */}
            <div className="space-y-2 mt-6 max-h-[300px] overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">Doc: {s.document}</p>
                    {s.is_candidate && (
                      <span className="inline-flex items-center mt-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        <UserCheck className="w-3 h-3 mr-1" /> {s.candidate_role} (Nº {s.candidate_number})
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDeleteStudent(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
              {students.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Nenhum aluno nesta turma.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManageTurmas;
