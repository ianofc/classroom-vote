import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Building, Mail, Lock, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Cadastro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [formData, setFormData] = useState({
    nomeEscola: "",
    email: "",
    password: "",
  });

  const handleCadastro = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Cria o usuário no sistema de autenticação do Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Chama a função no banco para criar a Escola e o Admin vinculados
        const { error: rpcError } = await supabase.rpc('registrar_nova_escola', {
          p_nome_escola: formData.nomeEscola,
          p_admin_email: formData.email,
          p_auth_id: authData.user.id
        });

        if (rpcError) throw rpcError;

        setSucesso(true);
        toast({ title: "Sucesso!", description: "Conta criada com 7 dias grátis!" });
        
        // Redireciona para a página inicial após 3 segundos
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (error: any) {
      toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center space-y-4 animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">Conta Criada!</h2>
          <p className="text-slate-500 font-medium">Sua escola já está pronta para realizar eleições seguras. Redirecionando para o login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comece a usar agora</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium">Crie sua conta e ganhe 7 dias de teste grátis. Sem cartão de crédito.</p>
        </div>

        <form onSubmit={handleCadastro} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nome da Instituição</label>
            <div className="relative">
              <Building className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input 
                required 
                type="text" 
                placeholder="Ex: Colégio Estadual Central" 
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-700 bg-slate-50 focus:bg-white"
                value={formData.nomeEscola}
                onChange={e => setFormData({...formData, nomeEscola: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">E-mail do Gestor</label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input 
                required 
                type="email" 
                placeholder="diretoria@escola.com.br" 
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-700 bg-slate-50 focus:bg-white"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Senha Segura</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" />
              <input 
                required 
                type="password" 
                placeholder="Mínimo de 6 caracteres" 
                className="w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium text-slate-700 bg-slate-50 focus:bg-white"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-200 flex justify-center items-center gap-2 mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? "Criando ambiente..." : "Criar Conta Grátis"}
          </button>
          
          <p className="text-center text-xs text-slate-500 font-medium mt-6">
            Já tem uma conta? <button type="button" onClick={() => navigate('/')} className="text-blue-600 hover:underline font-bold">Faça Login</button>
          </p>
        </form>
      </div>
    </div>
  );
}
