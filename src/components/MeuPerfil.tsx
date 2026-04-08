import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Camera, Loader2, Save, BadgeCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MeuPerfil({ escolaNome }: { escolaNome: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [perfil, setPerfil] = useState({
    nome_completo: "",
    cargo: "",
    bio: "",
    avatar_url: ""
  });

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data } = await supabase
        .from('admins')
        .select('nome_completo, cargo, bio, avatar_url')
        .eq('auth_id', userData.user.id)
        .single();

      if (data) {
        setPerfil({
          nome_completo: data.nome_completo || "",
          cargo: data.cargo || "Gestor Eleitoral",
          bio: data.bio || "",
          avatar_url: data.avatar_url || ""
        });
      }
    }
    setLoading(false);
  };

  const uploadAvatar = async (event: any) => {
    try {
      setSaving(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pega o link público da imagem
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      setPerfil({ ...perfil, avatar_url: data.publicUrl });
      toast({ title: "Foto enviada!", description: "Sua foto de perfil foi atualizada temporariamente. Salve as alterações." });
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const salvarPerfil = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { error } = await supabase
          .from('admins')
          .update({
            nome_completo: perfil.nome_completo,
            cargo: perfil.cargo,
            bio: perfil.bio,
            avatar_url: perfil.avatar_url
          })
          .eq('auth_id', userData.user.id);

        if (error) throw error;
        toast({ title: "Perfil Atualizado", description: "As suas informações foram salvas com sucesso!" });
      }
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Capa do Perfil (Estilo Rede Social) */}
      <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-800 relative"></div>
      
      <div className="px-8 pb-8">
        {/* Avatar Flutuante */}
        <div className="relative w-24 h-24 -mt-12 mb-4 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center shadow-md overflow-hidden group">
          {perfil.avatar_url ? (
            <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-10 h-10 text-slate-400" />
          )}
          
          <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all">
            <Camera className="w-6 h-6 text-white" />
            <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" disabled={saving} />
          </label>
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            {perfil.nome_completo || "Administrador Anônimo"} 
            <BadgeCheck className="w-5 h-5 text-blue-500" />
          </h2>
          <p className="text-sm font-bold text-slate-500">{perfil.cargo} em {escolaNome}</p>
        </div>

        <form onSubmit={salvarPerfil} className="mt-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Nome Completo</label>
              <input 
                type="text" 
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                value={perfil.nome_completo}
                onChange={e => setPerfil({...perfil, nome_completo: e.target.value})}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Cargo na Escola</label>
              <input 
                type="text" 
                className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                value={perfil.cargo}
                onChange={e => setPerfil({...perfil, cargo: e.target.value})}
                placeholder="Ex: Diretor, Professor, Aluno"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Biografia Curta</label>
            <textarea 
              className="w-full p-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 h-24 resize-none"
              value={perfil.bio}
              onChange={e => setPerfil({...perfil, bio: e.target.value})}
              placeholder="Escreva um pouco sobre si e sua função na organização das eleições..."
            />
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button 
              type="submit" 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Salvando..." : "Salvar Perfil"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
