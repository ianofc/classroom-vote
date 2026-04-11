import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Camera, Loader2, Save, BadgeCheck, Building2, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MeuPerfil({ escolaNome }: { escolaNome: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [escolaId, setEscolaId] = useState("");
  const [userId, setUserId] = useState("");
  
  const [perfil, setPerfil] = useState({
    nome_completo: "", cargo: "Gestor Eleitoral", bio: "", avatar_url: "", logo_url: ""
  });

  useEffect(() => { carregarPerfil(); }, []);

  const carregarPerfil = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      setUserId(userData.user.id);
      const { data } = await supabase.from('admins').select('nome_completo, cargo, bio, avatar_url, escola_id, escolas(logo_url)').eq('auth_id', userData.user.id).single();
      if (data) {
        setEscolaId(data.escola_id);
        let logo = "";
        if (data.escolas && !Array.isArray(data.escolas)) logo = (data.escolas as any).logo_url;
        else if (data.escolas && Array.isArray(data.escolas)) logo = (data.escolas[0] as any).logo_url;

        setPerfil({
          nome_completo: data.nome_completo || "", cargo: data.cargo || "Gestor Eleitoral",
          bio: data.bio || "", avatar_url: data.avatar_url || "", logo_url: logo || ""
        });
      }
    }
    setLoading(false);
  };

  // UPLOAD COM AUTO-SAVE NA BASE DE DADOS
  const uploadImagem = async (event: any, tipo: 'avatar' | 'logo') => {
    try {
      setSaving(true);
      const file = event.target.files[0];
      const fileName = `${Math.random()}.${file.name.split('.').pop()}`;
      const bucket = tipo === 'avatar' ? 'avatars' : 'escolas-logos';

      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      if (tipo === 'avatar') {
        setPerfil(p => ({ ...p, avatar_url: data.publicUrl }));
        // AUTO SAVE DB
        if (userId) await supabase.from('admins').update({ avatar_url: data.publicUrl }).eq('auth_id', userId);
        toast({ title: "Foto de Perfil Atualizada!" });
      } else {
        setPerfil(p => ({ ...p, logo_url: data.publicUrl }));
        // AUTO SAVE DB
        if (escolaId) await supabase.from('escolas').update({ logo_url: data.publicUrl }).eq('id', escolaId);
        toast({ title: "Logótipo Atualizado!" });
      }
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const salvarTextos = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (userId) {
        await supabase.from('admins').update({ nome_completo: perfil.nome_completo, cargo: perfil.cargo, bio: perfil.bio }).eq('auth_id', userId);
        toast({ title: "Dados Atualizados com sucesso!" });
      }
    } catch (error: any) { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* HTML MANTIDO - Coluna Perfil e Coluna Escola */}
      {/* ... */}
    </div>
  );
}
