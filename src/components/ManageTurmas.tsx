import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Upload, Loader2, CheckSquare, Square } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ROLES = ["Geral", "Quilombola", "Indígena", "LGBT", "Rural"];

const ManageTurmas = ({ onTurmasChanged }: { onTurmasChanged: () => void }) => {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  
  const [newTurmaName, setNewTurmaName] = useState("");
  const [newStudent, setNewStudent] = useState<any>({ name: "", document: "", is_candidate: false, candidate_role: "Geral" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [vicePhotoFile, setVicePhotoFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    supabase.from('turmas').select('*').order('name').then(({data}) => data && setTurmas(data));
  }, []);

  useEffect(() => {
    if (selectedTurma) supabase.from('students').select('*').eq('turma_id', selectedTurma.id).order('name').then(({data}) => data && setStudents(data));
  }, [selectedTurma]);

  const handleAddTurma = async () => {
    if (!newTurmaName.trim()) return;
    const { data } = await supabase.from('turmas').insert({ name: newTurmaName.trim() }).select().single();
    if (data) { setTurmas([...turmas, data]); setNewTurmaName(""); onTurmasChanged(); }
  };

  const uploadPhoto = async (file: File) => {
    const filePath = `fotos/${Math.random()}.${file.name.split('.').pop()}`;
    await supabase.storage.from('candidatos-fotos').upload(filePath, file);
    return supabase.storage.from('candidatos-fotos').getPublicUrl(filePath).data.publicUrl;
  };

  const handleAddStudent = async () => {
    setIsUploading(true);
    let pUrl = null, vpUrl = null;
    if (newStudent.is_candidate) {
      if (photoFile) pUrl = await uploadPhoto(photoFile);
      if (vicePhotoFile) vpUrl = await uploadPhoto(vicePhotoFile);
    }
    const { data, error } = await supabase.from('students').insert({
      turma_id: selectedTurma.id, name: newStudent.name, document: newStudent.document,
      is_candidate: newStudent.is_candidate, candidate_role: newStudent.candidate_role,
      candidate_number: newStudent.candidate_number || null, vice_name: newStudent.vice_name || null,
      photo_url: pUrl, vice_photo_url: vpUrl
    }).select().single();
    
    setIsUploading(false);
    if (!error) {
      setStudents([...students, data]);
      setNewStudent({ name: "", document: "", is_candidate: false, candidate_role: "Geral" });
      setPhotoFile(null); setVicePhotoFile(null);
    } else toast({ title: "Erro", description: error.message, variant: "destructive" });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4 border-r border-slate-200 pr-4">
        <h3 className="font-bold flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Turmas</h3>
        <div className="flex gap-2">
          <input type="text" placeholder="Nova Turma" className="flex-1 p-2 border rounded-md text-sm" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded-md"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto">
          {turmas.map(t => (
            <div key={t.id} onClick={() => setSelectedTurma(t)} className={`p-3 border rounded-lg cursor-pointer ${selectedTurma?.id === t.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}>
              <span className="font-semibold text-sm text-slate-700">{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-6">
        {!selectedTurma ? <p className="text-slate-400 text-center py-10">Selecione uma turma.</p> : (
          <>
            <h2 className="text-xl font-black text-slate-800 border-b pb-2">Turma: {selectedTurma.name}</h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Nome Completo do Aluno" className="w-full p-2 border rounded-md text-sm" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                <input type="text" placeholder="Documento (RG/CPF)" className="w-full p-2 border rounded-md text-sm" value={newStudent.document} onChange={e => setNewStudent({...newStudent, document: e.target.value})} />
              </div>
              
              <button onClick={() => setNewStudent({...newStudent, is_candidate: !newStudent.is_candidate})} className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600">
                {newStudent.is_candidate ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />} ESTE ALUNO É CANDIDATO A UM CARGO
              </button>

              {newStudent.is_candidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Qual cargo ele concorre?</label>
                    <select className="w-full p-2 border rounded-md text-sm font-bold text-slate-800" value={newStudent.candidate_role} onChange={e => setNewStudent({...newStudent, candidate_role: e.target.value})}>
                      {ROLES.map(r => <option key={r} value={r}>Líder {r}</option>)}
                    </select>
                  </div>
                  <input type="number" placeholder="Número do Candidato" className="w-full p-2 border rounded-md text-sm" value={newStudent.candidate_number || ''} onChange={e => setNewStudent({...newStudent, candidate_number: parseInt(e.target.value)})} />
                  <input type="text" placeholder="Nome do Vice" className="w-full p-2 border rounded-md text-sm" value={newStudent.vice_name || ''} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                  <label className="cursor-pointer bg-white border border-dashed border-slate-300 p-2 flex justify-center text-xs text-slate-500 rounded-md">
                    <Upload className="w-3 h-3 mr-2" /> {photoFile ? "Titular OK" : "Foto Titular"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setPhotoFile(e.target.files[0])} />
                  </label>
                  <label className="cursor-pointer bg-white border border-dashed border-slate-300 p-2 flex justify-center text-xs text-slate-500 rounded-md">
                    <Upload className="w-3 h-3 mr-2" /> {vicePhotoFile ? "Vice OK" : "Foto Vice"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && setVicePhotoFile(e.target.files[0])} />
                  </label>
                </div>
              )}
              <button onClick={handleAddStudent} disabled={isUploading} className="w-full bg-slate-800 text-white font-bold py-2 rounded-lg hover:bg-slate-900 disabled:opacity-50">
                {isUploading ? "Salvando..." : "Salvar Aluno"}
              </button>
            </div>

            <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
              {students.map(s => (
                <div key={s.id} className="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                    {s.is_candidate && <span className="inline-flex mt-1 bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">{s.candidate_role} (Nº {s.candidate_number})</span>}
                  </div>
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
