import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Upload, Loader2, CheckSquare, Square, UserCheck, FileUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Turma { id: string; name: string; }
interface Student {
  id: string; turma_id: string; name: string; document: string; contact: string;
  is_candidate: boolean; candidate_number?: number; vice_name?: string; photo_url?: string;
}

const ManageTurmas = ({ onTurmasChanged }: { onTurmasChanged: () => void }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados dos Formulários
  const [newTurmaName, setNewTurmaName] = useState("");
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ name: "", document: "", contact: "", is_candidate: false });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
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
    if (!newTurmaName) return;
    const { data, error } = await supabase.from('turmas').insert({ name: newTurmaName }).select().single();
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

  const handleAddStudent = async () => {
    if (!selectedTurma || !newStudent.name || !newStudent.document) {
      toast({ title: "Atenção", description: "Nome e documento são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    let photoUrl = null;
    if (newStudent.is_candidate && photoFile) {
      const fileExt = photoFile.name.split('.').pop();
      const filePath = `fotos/${Math.random()}.${fileExt}`;
      const uploadRes = await supabase.storage.from('candidatos-fotos').upload(filePath, photoFile);
      if (!uploadRes.error) {
        photoUrl = supabase.storage.from('candidatos-fotos').getPublicUrl(filePath).data.publicUrl;
      }
    }

    const { data, error } = await supabase.from('students').insert({
      turma_id: selectedTurma.id, name: newStudent.name, document: newStudent.document, contact: newStudent.contact,
      is_candidate: newStudent.is_candidate, candidate_number: newStudent.candidate_number || null,
      vice_name: newStudent.vice_name || null, photo_url: photoUrl
    }).select().single();

    setIsUploading(false);

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setStudents([...students, data]);
      setNewStudent({ name: "", document: "", contact: "", is_candidate: false });
      setPhotoFile(null);
      toast({ title: "Sucesso", description: "Aluno cadastrado!" });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Apagar aluno?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) setStudents(students.filter(s => s.id !== id));
  };

  // Lógica de Importação CSV
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTurma) return;

    setIsImportingCSV(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        
        // Pula o cabeçalho (linha 0) e mapeia os alunos
        const newStudents = rows.slice(1).map(row => ({
          turma_id: selectedTurma.id,
          name: row[0]?.trim(),
          document: row[1]?.trim(),
          contact: row[2]?.trim(),
          is_candidate: false
        })).filter(s => s.name && s.document); // Ignora linhas vazias

        if (newStudents.length === 0) {
          toast({ title: "Aviso", description: "Nenhum aluno válido encontrado no CSV.", variant: "destructive" });
          setIsImportingCSV(false);
          return;
        }

        const { data, error } = await supabase.from('students').insert(newStudents).select();
        
        if (error) throw error;
        
        setStudents([...students, ...(data as Student[])]);
        toast({ title: "Sucesso", description: `${data.length} alunos importados!` });
      } catch (err: any) {
        toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
      }
      setIsImportingCSV(false);
      // Limpa o input file
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
          <input type="text" placeholder="Nova Turma (Ex: 3º Ano A)" className="flex-1 p-2 border rounded-md text-sm" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
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
              
              {/* BOTÃO DE IMPORTAÇÃO CSV */}
              <label className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors ${isImportingCSV ? 'bg-slate-200 text-slate-500' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                {isImportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                {isImportingCSV ? "Importando..." : "Importar CSV"}
                <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={isImportingCSV} />
              </label>
            </div>
            <p className="text-xs text-slate-500 -mt-2 mb-4">Formato do CSV: <strong>Nome, Documento, Contato</strong> (O cabeçalho será ignorado).</p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-700">Adicionar Manualmente</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome Completo" className="w-full p-2 border rounded-md text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                <input type="text" placeholder="Documento (RG/CPF)" className="w-full p-2 border rounded-md text-sm" value={newStudent.document} onChange={e => setNewStudent({...newStudent, document: e.target.value})} />
              </div>
              
              <div className="pt-2 border-t border-slate-200">
                <button onClick={() => setNewStudent({...newStudent, is_candidate: !newStudent.is_candidate})} className={`flex items-center gap-2 text-sm font-bold p-2 rounded-md ${newStudent.is_candidate ? 'text-blue-700 bg-blue-100' : 'text-slate-500 hover:bg-slate-200'}`}>
                  {newStudent.is_candidate ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />} ESTE ALUNO É CANDIDATO
                </button>
              </div>

              {newStudent.is_candidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <input type="number" placeholder="Número do Candidato" className="w-full p-2 border rounded-md text-sm" value={newStudent.candidate_number || ''} onChange={e => setNewStudent({...newStudent, candidate_number: parseInt(e.target.value)})} />
                  <input type="text" placeholder="Nome do Vice" className="w-full p-2 border rounded-md text-sm" value={newStudent.vice_name || ''} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                  <label className="md:col-span-2 cursor-pointer bg-white border border-dashed border-slate-300 p-2 flex justify-center gap-2 text-sm text-slate-500 rounded-md">
                    <Upload className="w-4 h-4" /> {photoFile ? photoFile.name : "Anexar Foto"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setPhotoFile(e.target.files[0])} />
                  </label>
                </div>
              )}
              <button onClick={handleAddStudent} disabled={isUploading} className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg flex justify-center gap-2 hover:bg-slate-900 disabled:opacity-50">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Salvar
              </button>
            </div>

            <div className="space-y-2 mt-6 max-h-[300px] overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">Doc: {s.document}</p>
                    {s.is_candidate && <span className="inline-flex mt-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Candidato (Nº {s.candidate_number})</span>}
                  </div>
                  <button onClick={() => handleDeleteStudent(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManageTurmas;
