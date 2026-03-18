import { useState } from "react";
import { Turma, Candidate } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { Trash2, Plus, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ManageTurmasProps {
  onTurmasChanged: () => void;
}

const ManageTurmas = ({ onTurmasChanged }: ManageTurmasProps) => {
  // Nota: Em um app real, turmas devem vir do Supabase. 
  // Adaptado aqui para o seu fluxo atual.
  const [selectedTurma, setSelectedTurma] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  // Estados do formulário de candidato
  const [newCandidate, setNewCandidate] = useState<Partial<Candidate>>({
    name: "", number: 0, vice_name: "", document: "", contact: "", photo: ""
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPhotoFile(e.target.files[0]);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `fotos/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('candidatos-fotos')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      return null;
    }

    const { data } = supabase.storage.from('candidatos-fotos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.number || !selectedTurma) {
      toast({ title: "Erro", description: "Nome, número e turma são obrigatórios.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    let photoUrl = newCandidate.photo;

    // Se o usuário selecionou uma imagem nova, faz o upload
    if (photoFile) {
      const uploadedUrl = await uploadPhoto(photoFile);
      if (uploadedUrl) photoUrl = uploadedUrl;
    }

    // Aqui você deve inserir a lógica de salvar no Supabase (Tabela candidates que criamos antes)
    const { error } = await supabase.from('candidates').insert({
      name: newCandidate.name,
      number: newCandidate.number,
      vice_name: newCandidate.vice_name,
      document: newCandidate.document,
      contact: newCandidate.contact,
      photo_url: photoUrl,
      // turma_id: selectedTurma (Se estiver usando IDs UUID reais no Supabase)
    });

    setIsUploading(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Candidato registrado!" });
      setNewCandidate({ name: "", number: 0, vice_name: "", document: "", contact: "", photo: "" });
      setPhotoFile(null);
      onTurmasChanged(); // Atualiza a lista pai
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-lg font-bold text-slate-800">Cadastro de Candidatos e Chapas</h2>
        <p className="text-sm text-slate-500">Adicione os dados completos para auditoria e impressão.</p>
      </div>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Nome do Candidato / Chapa</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md text-sm"
              value={newCandidate.name}
              onChange={e => setNewCandidate({...newCandidate, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Número</label>
            <input 
              type="number" 
              className="w-full p-2 border rounded-md text-sm"
              value={newCandidate.number || ''}
              onChange={e => setNewCandidate({...newCandidate, number: parseInt(e.target.value)})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Nome do Vice (Opcional)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md text-sm"
              value={newCandidate.vice_name || ''}
              onChange={e => setNewCandidate({...newCandidate, vice_name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Documento (RG/CPF)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md text-sm"
              value={newCandidate.document || ''}
              onChange={e => setNewCandidate({...newCandidate, document: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Contato (Tel/Email)</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded-md text-sm"
              value={newCandidate.contact || ''}
              onChange={e => setNewCandidate({...newCandidate, contact: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Foto do Candidato</label>
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer bg-white border border-dashed border-slate-300 hover:border-blue-500 rounded-md p-2 flex items-center justify-center gap-2 text-sm text-slate-500 transition-colors">
                <Upload className="w-4 h-4" />
                {photoFile ? photoFile.name : "Escolher Imagem"}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
              </label>
            </div>
          </div>
        </div>

        <button 
          onClick={handleAddCandidate}
          disabled={isUploading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isUploading ? "Salvando..." : "Cadastrar Candidato"}
        </button>
      </div>
    </div>
  );
};

export default ManageTurmas;
