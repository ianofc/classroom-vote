import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Upload, Loader2, CheckSquare, Square, UserCheck, FileUp } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CARGOS = ["Líder Geral", "Líder Quilombola", "Líder Indígena", "Líder LGBTQIA+", "Líder Rural"];

const ManageTurmas = ({ onTurmasChanged }: { onTurmasChanged: () => void }) => {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  
  const [newTurmaName, setNewTurmaName] = useState("");
  const [newStudent, setNewStudent] = useState<any>({ name: "", document: "", contact: "", is_candidate: false, category: "Líder Geral" });
  
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vicePhotoFile, setVicePhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => { fetchTurmas(); }, []);
  useEffect(() => { if (selectedTurma) fetchStudents(selectedTurma.id); }, [selectedTurma]);

  const fetchTurmas = async () => {
    const { data } = await supabase.from('turmas').select('*').order('name');
    if (data) setTurmas(data);
  };
  const fetchStudents = async (id: string) => {
    const { data } = await supabase.from('students').select('*').eq('turma_id', id).order('name');
    if (data) setStudents(data);
  };

  const handleAddTurma = async () => {
    if (!newTurmaName) return;
    const { data } = await supabase.from('turmas').insert({ name: newTurmaName }).select().single();
    if (data) { setTurmas([...turmas, data]); setNewTurmaName(""); onTurmasChanged(); }
  };
  const handleDeleteTurma = async (id: string) => {
    if (!confirm("Isso apagará a turma e TODOS os alunos nela. Continuar?")) return;
    await supabase.from('turmas').delete().eq('id', id);
    setTurmas(turmas.filter(t => t.id !== id));
    if (selectedTurma?.id === id) setSelectedTurma(null);
  };

  const uploadImg = async (file: File) => {
    const filePath = `fotos/${Math.random()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('candidatos-fotos').upload(filePath, file);
    return supabase.storage.from('candidatos-fotos').getPublicUrl(filePath).data.publicUrl;
  };

  const handleAddStudent = async () => {
    if (!selectedTurma || !newStudent.name || !newStudent.document) return toast({ title: "Erro", description: "Nome e documento obrigatórios.", variant: "destructive" });

    setIsUploading(true);
    let photoUrl = null; let vicePhotoUrl = null;
    
    if (newStudent.is_candidate) {
      if (photoFile) photoUrl = await uploadImg(photoFile);
      if (vicePhotoFile) vicePhotoUrl = await uploadImg(vicePhotoFile);
    }

    const payload = {
      turma_id: selectedTurma.id, name: newStudent.name, document: newStudent.document, contact: newStudent.contact,
      is_candidate: newStudent.is_candidate, candidate_number: newStudent.candidate_number || null,
      vice_name: newStudent.vice_name || null, photo_url: photoUrl, vice_photo_url: vicePhotoUrl, category: newStudent.is_candidate ? newStudent.category : null
    };

    const { data, error } = await supabase.from('students').insert(payload).select().single();
    setIsUploading(false);

    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setStudents([...students, data]);
      setNewStudent({ name: "", document: "", contact: "", is_candidate: false, category: "Líder Geral" });
      setPhotoFile(null); setVicePhotoFile(null);
      toast({ title: "Sucesso", description: "Cadastrado!" });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4 border-r pr-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Turmas</h3>
        <div className="flex gap-2">
          <input type="text" placeholder="Nova Turma" className="flex-1 p-2 border rounded-md" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
          {turmas.map(t => (
            <div key={t.id} onClick={() => setSelectedTurma(t)} className={`p-3 border rounded-lg flex justify-between cursor-pointer ${selectedTurma?.id === t.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
              <span className="font-semibold text-sm">{t.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteTurma(t.id); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {!selectedTurma ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed rounded-xl p-10">Selecione uma turma para gerenciar.</div>
        ) : (
          <>
            <h2 className="text-xl font-black text-slate-800 border-b pb-2">Turma: <span className="text-blue-600">{selectedTurma.name}</span></h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome Completo" className="w-full p-2 border rounded-md text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                <input type="text" placeholder="Documento (RG/CPF)" className="w-full p-2 border rounded-md text-sm" value={newStudent.document} onChange={e => setNewStudent({...newStudent, document: e.target.value})} />
              </div>
              
              <div className="pt-2 border-t">
                <button onClick={() => setNewStudent({...newStudent, is_candidate: !newStudent.is_candidate})} className={`flex items-center gap-2 text-sm font-bold p-2 rounded-md ${newStudent.is_candidate ? 'text-blue-700 bg-blue-100' : 'text-slate-500'}`}>
                  {newStudent.is_candidate ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />} ALUNO CANDIDATO
                </button>
              </div>

              {newStudent.is_candidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <select className="w-full p-2 border rounded-md text-sm" value={newStudent.category} onChange={e => setNewStudent({...newStudent, category: e.target.value})}>
                    {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="number" placeholder="Nº da Chapa" className="w-full p-2 border rounded-md text-sm" value={newStudent.candidate_number || ''} onChange={e => setNewStudent({...newStudent, candidate_number: parseInt(e.target.value)})} />
                  
                  <div className="space-y-2">
                     <p className="text-xs font-bold text-slate-500">Foto do Titular</p>
                     <label className="cursor-pointer bg-white border border-dashed p-2 flex text-xs text-slate-500 rounded-md truncate"><Upload className="w-3 h-3 mr-1" /> {photoFile ? photoFile.name : "Anexar Titular"}<input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setPhotoFile(e.target.files[0])} /></label>
                  </div>
                  
                  <div className="space-y-2">
                     <input type="text" placeholder="Nome do Vice" className="w-full p-2 border rounded-md text-sm mb-2" value={newStudent.vice_name || ''} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                     <label className="cursor-pointer bg-white border border-dashed p-2 flex text-xs text-slate-500 rounded-md truncate"><Upload className="w-3 h-3 mr-1" /> {vicePhotoFile ? vicePhotoFile.name : "Anexar Foto do Vice"}<input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setVicePhotoFile(e.target.files[0])} /></label>
                  </div>
                </div>
              )}
              <button onClick={handleAddStudent} disabled={isUploading} className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Salvar
              </button>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className="p-3 border rounded-lg flex justify-between bg-white">
                  <div>
                    <p className="font-bold text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.document}</p>
                    {s.is_candidate && <span className="inline-flex mt-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{s.category} (Nº {s.candidate_number})</span>}
                  </div>
                  <button onClick={async () => { if(confirm("Apagar?")) { await supabase.from('students').delete().eq('id', s.id); setStudents(students.filter(x => x.id !== s.id)); } }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
