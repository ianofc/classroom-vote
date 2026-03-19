import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Upload, Loader2, CheckSquare, Square, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Turma {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  document: string;
  contact: string;
  is_candidate: boolean;
  candidate_number?: number;
  vice_name?: string;
  photo_url?: string;
}

const ManageTurmas = ({ onTurmasChanged }: { onTurmasChanged: () => void }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados dos Formulários
  const [newTurmaName, setNewTurmaName] = useState("");
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    name: "", document: "", contact: "", is_candidate: false
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Carrega as turmas ao abrir
  useEffect(() => {
    fetchTurmas();
  }, []);

  // Carrega os alunos sempre que uma turma é selecionada
  useEffect(() => {
    if (selectedTurma) fetchStudents(selectedTurma.id);
  }, [selectedTurma]);

  const fetchTurmas = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('turmas').select('*').order('name');
    if (!error && data) setTurmas(data);
    setLoading(false);
  };

  const fetchStudents = async (turmaId: string) => {
    setLoading(true);
    const { data, error } = await supabase.from('students').select('*').eq('turma_id', turmaId).order('name');
    if (!error && data) setStudents(data);
    setLoading(false);
  };

  const handleAddTurma = async () => {
    if (!newTurmaName) return;
    const { data, error } = await supabase.from('turmas').insert({ name: newTurmaName }).select().single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setTurmas([...turmas, data]);
      setNewTurmaName("");
      toast({ title: "Sucesso", description: "Turma criada!" });
      onTurmasChanged();
    }
  };

  const handleDeleteTurma = async (id: string) => {
    if (!confirm("Tem certeza? Isso apagará a turma e TODOS os alunos dela!")) return;
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
      toast({ title: "Atenção", description: "Candidatos precisam de um número.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    let photoUrl = null;
    if (newStudent.is_candidate && photoFile) {
      photoUrl = await uploadPhoto(photoFile);
    }

    const { data, error } = await supabase.from('students').insert({
      turma_id: selectedTurma.id,
      name: newStudent.name,
      document: newStudent.document,
      contact: newStudent.contact,
      is_candidate: newStudent.is_candidate,
      candidate_number: newStudent.is_candidate ? newStudent.candidate_number : null,
      vice_name: newStudent.is_candidate ? newStudent.vice_name : null,
      photo_url: photoUrl
    }).select().single();

    setIsUploading(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      setStudents([...students, data]);
      setNewStudent({ name: "", document: "", contact: "", is_candidate: false });
      setPhotoFile(null);
      toast({ title: "Sucesso", description: "Aluno cadastrado com sucesso!" });
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Apagar aluno?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) setStudents(students.filter(s => s.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* COLUNA ESQUERDA: LISTA DE TURMAS */}
      <div className="lg:col-span-1 space-y-4 border-r border-slate-200 pr-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" /> Turmas
        </h3>
        
        <div className="flex gap-2">
          <input 
            type="text" placeholder="Nova Turma (Ex: 3º Ano A)" 
            className="flex-1 p-2 border rounded-md text-sm"
            value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)}
          />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700">
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
          {loading && !selectedTurma ? <p className="text-xs text-slate-400 text-center">Carregando...</p> : null}
          {turmas.map(t => (
            <div 
              key={t.id} 
              onClick={() => setSelectedTurma(t)}
              className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer transition-colors ${selectedTurma?.id === t.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
            >
              <span className="font-semibold text-sm text-slate-700">{t.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteTurma(t.id); }} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {turmas.length === 0 && !loading && <p className="text-xs text-slate-400 text-center">Nenhuma turma cadastrada.</p>}
        </div>
      </div>

      {/* COLUNA DIREITA: ALUNOS DA TURMA SELECIONADA */}
      <div className="lg:col-span-2 space-y-6">
        {!selectedTurma ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-10">
            <Users className="w-12 h-12 mb-2 opacity-50" />
            <p>Selecione uma turma ao lado para gerenciar seus alunos e candidatos.</p>
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-xl font-black text-slate-800 border-b pb-2 mb-4">
                Lista de Alunos: <span className="text-blue-600">{selectedTurma.name}</span>
              </h2>
            </div>

            {/* FORMULÁRIO DE NOVO ALUNO */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-slate-700">Cadastrar Novo Aluno</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome Completo" className="w-full p-2 border rounded-md text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                <input type="text" placeholder="Documento (RG/CPF)" className="w-full p-2 border rounded-md text-sm" value={newStudent.document} onChange={e => setNewStudent({...newStudent, document: e.target.value})} />
                <input type="text" placeholder="Contato (Opcional)" className="w-full p-2 border rounded-md text-sm md:col-span-2" value={newStudent.contact} onChange={e => setNewStudent({...newStudent, contact: e.target.value})} />
              </div>

              {/* TOGGLE CANDIDATO */}
              <div className="pt-2 border-t border-slate-200">
                <button 
                  onClick={() => setNewStudent({...newStudent, is_candidate: !newStudent.is_candidate})}
                  className={`flex items-center gap-2 text-sm font-bold p-2 rounded-md transition-colors ${newStudent.is_candidate ? 'text-blue-700 bg-blue-100' : 'text-slate-500 hover:bg-slate-200'}`}
                >
                  {newStudent.is_candidate ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  ESTE ALUNO É UM CANDIDATO A LÍDER DA TURMA
                </button>
              </div>

              {/* CAMPOS EXTRAS DE CANDIDATO */}
              {newStudent.is_candidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <input type="number" placeholder="Número do Candidato" className="w-full p-2 border rounded-md text-sm" value={newStudent.candidate_number || ''} onChange={e => setNewStudent({...newStudent, candidate_number: parseInt(e.target.value)})} />
                  <input type="text" placeholder="Nome do Vice (Opcional)" className="w-full p-2 border rounded-md text-sm" value={newStudent.vice_name || ''} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                  <div className="md:col-span-2">
                    <label className="flex-1 cursor-pointer bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-md p-2 flex items-center justify-center gap-2 text-sm text-slate-500">
                      <Upload className="w-4 h-4" /> {photoFile ? photoFile.name : "Anexar Foto da Chapa"}
                      <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setPhotoFile(e.target.files[0])} />
                    </label>
                  </div>
                </div>
              )}

              <button onClick={handleAddStudent} disabled={isUploading} className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-900 disabled:opacity-50">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Salvar Aluno
              </button>
            </div>

            {/* LISTAGEM DE ALUNOS DA TURMA */}
            <div className="space-y-2 mt-6 max-h-[300px] overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">Doc: {s.document}</p>
                    {s.is_candidate && (
                      <span className="inline-flex items-center gap-1 mt-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                        <UserCheck className="w-3 h-3" /> Candidato (Nº {s.candidate_number})
                      </span>
                    )}
                  </div>
                  <button onClick={() => handleDeleteStudent(s.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {students.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Nenhum aluno cadastrado nesta turma ainda.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManageTurmas;
