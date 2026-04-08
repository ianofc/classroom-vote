import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { User, Camera, Loader2, Save, BadgeCheck, Building2, Image as ImageIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function MeuPerfil({ escolaNome }: { escolaNome: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [escolaId, setEscolaId] = useState("");
  
  const [perfil, setPerfil] = useState({
    nome_completo: "",
    cargo: "",
    bio: "",
    avatar_url: "",
    logo_url: "" // NOVO: Logo da escola
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
        .select('nome_completo, cargo, bio, avatar_url, escola_id, escolas(logo_url)')
        .eq('auth_id', userData.user.id)
        .single();

      if (data) {
        setEscolaId(data.escola_id);
        
        let logo = "";
        if (data.escolas && !Array.isArray(data.escolas)) logo = (data.escolas as any).logo_url;
        else if (data.escolas && Array.isArray(data.escolas)) logo = (data.escolas[0] as any).logo_url;

        setPerfil({
          nome_completo: data.nome_completo || "",
          cargo: data.cargo || "Gestor Eleitoral",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          logo_url: logo || ""
        });
      }
    }
    setLoading(false);
  };

  const uploadImagem = async (event: any, tipo: 'avatar' | 'logo') => {
    try {
      setSaving(true);
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const bucket = tipo === 'avatar' ? 'avatars' : 'escolas-logos';

      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
      
      if (tipo === 'avatar') {
        setPerfil({ ...perfil, avatar_url: data.publicUrl });
        toast({ title: "Foto de Perfil enviada!", description: "Salve as alterações para aplicar." });
      } else {
        setPerfil({ ...perfil, logo_url: data.publicUrl });
        toast({ title: "Brasão/Logótipo enviado!", description: "Salve as alterações para aplicar." });
      }
    } catch (error: any) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const salvarTudo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // 1. Salva os dados do Admin
        const { error: errAdmin } = await supabase.from('admins').update({
            nome_completo: perfil.nome_completo,
            cargo: perfil.cargo,
            bio: perfil.bio,
            avatar_url: perfil.avatar_url
          }).eq('auth_id', userData.user.id);
        if (errAdmin) throw errAdmin;

        // 2. Salva o Logo da Escola
        if (escolaId) {
          const { error: errEscola } = await supabase.from('escolas').update({
            logo_url: perfil.logo_url
          }).eq('id', escolaId);
          if (errEscola) throw errEscola;
        }

        toast({ title: "Tudo Atualizado!", description: "Identidade visual e perfil foram salvos com sucesso.", className: "bg-green-50 text-green-900" });
      }
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* COLUNA 1: PERFIL DO GESTOR */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-800 relative"></div>
        <div className="px-6 pb-6 flex-1 flex flex-col">
          <div className="relative w-20 h-20 -mt-10 mb-4 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center shadow-md overflow-hidden group">
            {perfil.avatar_url ? <img src={perfil.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-slate-400" />}
            <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all">
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" onChange={(e) => uploadImagem(e, 'avatar')} className="hidden" disabled={saving} />
            </label>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5">{perfil.nome_completo || "Gestor Anônimo"} <BadgeCheck className="w-4 h-4 text-blue-500" /></h2>
            <p className="text-xs font-bold text-slate-500">{perfil.cargo} em {escolaNome}</p>
          </div>
          <div className="mt-6 space-y-4 flex-1">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Nome Completo</label>
              <input type="text" className="w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={perfil.nome_completo} onChange={e => setPerfil({...perfil, nome_completo: e.target.value})} placeholder="Seu nome" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Cargo</label>
              <input type="text" className="w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50" value={perfil.cargo} onChange={e => setPerfil({...perfil, cargo: e.target.value})} placeholder="Diretor, Professor..." />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Mini Bio</label>
              <textarea className="w-full p-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 h-20 resize-none" value={perfil.bio} onChange={e => setPerfil({...perfil, bio: e.target.value})} placeholder="Sua descrição..." />
            </div>
          </div>
        </div>
      </div>

      {/* COLUNA 2: IDENTIDADE DA ESCOLA E BOTÃO SALVAR */}
      <div className="flex flex-col gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Building2 className="w-6 h-6" /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800">Identidade Visual</h3>
              <p className="text-xs font-medium text-slate-500">Logótipo ou Brasão oficial de {escolaNome}</p>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50">
            {perfil.logo_url ? (
              <div className="relative group">
                <img src={perfil.logo_url} alt="Logo" className="h-24 object-contain mb-4 drop-shadow-sm" />
                <label className="absolute inset-0 bg-white/80 hidden group-hover:flex items-center justify-center cursor-pointer transition-all rounded-lg">
                  <ImageIcon className="w-6 h-6 text-slate-700" />
                  <input type="file" accept="image/*" onChange={(e) => uploadImagem(e, 'logo')} className="hidden" disabled={saving} />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center hover:opacity-70 transition-opacity">
                <div className="w-16 h-16 bg-white border shadow-sm rounded-full flex items-center justify-center mb-3">
                  <ImageIcon className="w-6 h-6 text-slate-400" />
                </div>
                <span className="text-sm font-bold text-indigo-600">Fazer Upload do Logótipo</span>
                <span className="text-[10px] text-slate-400 mt-1">Recomendado: Fundo transparente (PNG)</span>
                <input type="file" accept="image/*" onChange={(e) => uploadImagem(e, 'logo')} className="hidden" disabled={saving} />
              </label>
            )}
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-4 font-medium">Esta imagem aparecerá no topo da Urna Eletrônica e nos relatórios em PDF.</p>
        </div>

        <button onClick={salvarTudo} disabled={saving} className="w-full bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest py-5 rounded-3xl flex justify-center items-center gap-2 transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 mt-auto">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? "Salvando Alterações..." : "Salvar Configurações"}
        </button>
      </div>

    </div>
  );
}
