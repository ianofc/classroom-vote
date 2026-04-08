import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Activity, Users, ShieldCheck, Maximize } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Telao() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [escolaNome, setEscolaNome] = useState("Escola");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [eleicaoNome, setEleicaoNome] = useState("Aguardando Eleição Ativa...");
  
  const [totalVotos, setTotalVotos] = useState(0);
  const [ultimoVoto, setUltimoVoto] = useState<Date | null>(null);
  const [pulse, setPulse] = useState(false); // Para a animação de piscar

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    try {
      // 1. Pega a sessão do Admin logado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/"); // Se não estiver logado, volta pro início
        return;
      }

      // 2. Busca os dados da escola do Admin
      const { data: adminData } = await supabase
        .from('admins')
        .select('escola_id, escolas(nome, logo_url)')
        .eq('auth_id', session.user.id)
        .single();

      let escolaId = null;
      if (adminData) {
        escolaId = adminData.escola_id;
        const escolaInfo = Array.isArray(adminData.escolas) ? adminData.escolas[0] : adminData.escolas;
        if (escolaInfo) {
          setEscolaNome(escolaInfo.nome);
          setLogoUrl(escolaInfo.logo_url);
        }
      }

      // 3. Busca a Eleição Ativa
      if (escolaId) {
        const { data: eleicoes } = await supabase
          .from('eleicoes')
          .select('*')
          .eq('escola_id', escolaId)
          .eq('status', 'ativa')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (eleicoes) {
          setEleicaoNome(eleicoes.nome);

          // 4. Conta os votos que já existem nesta eleição
          const { count } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('eleicao_id', eleicoes.id);

          setTotalVotos(count || 0);

          // 5. A MAGIA DO REALTIME (WebSockets)
          // Fica "escutando" a tabela de votos para esta eleição
          const subscription = supabase
            .channel('votos-realtime')
            .on('postgres_changes', { 
              event: 'INSERT', 
              schema: 'public', 
              table: 'votes',
              filter: `eleicao_id=eq.${eleicoes.id}`
            }, (payload) => {
              // Quando entra um novo voto, atualiza o número e faz piscar!
              setTotalVotos((prev) => prev + 1);
              setUltimoVoto(new Date());
              setPulse(true);
              setTimeout(() => setPulse(false), 1000); // Tira o brilho depois de 1 segundo
            })
            .subscribe();

          // Limpa a escuta quando fechar a página
          return () => {
            supabase.removeChannel(subscription);
          };
        }
      }
    } catch (err) {
      console.error("Erro ao carregar telão:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-between p-8 relative overflow-hidden">
      
      {/* Botão Tela Cheia Invisível (Aparece no hover) */}
      <button onClick={toggleFullscreen} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all opacity-0 hover:opacity-100 focus:opacity-100 z-50">
        <Maximize className="w-6 h-6" />
      </button>

      {/* Efeito de Luz de Fundo */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Cabeçalho */}
      <div className="z-10 flex flex-col items-center text-center mt-10 w-full animate-in fade-in slide-in-from-top-10 duration-1000">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-32 md:h-40 object-contain mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
        ) : (
          <div className="w-24 h-24 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-600/50 transform rotate-3">
            <ShieldCheck className="w-12 h-12 text-white" />
          </div>
        )}
        <h2 className="text-2xl md:text-3xl font-bold text-slate-300 tracking-widest uppercase mb-2">{escolaNome}</h2>
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 uppercase tracking-tighter">
          {eleicaoNome}
        </h1>
      </div>

      {/* Centro: O Grande Contador */}
      <div className="z-10 flex flex-col items-center justify-center flex-1 my-12 w-full animate-in zoom-in duration-700 delay-300">
        <p className="text-lg md:text-2xl font-bold text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" /> Votos Computados em Tempo Real
        </p>
        
        {/* A caixa do número que brilha quando recebe voto */}
        <div className={`relative flex items-center justify-center transition-all duration-300 ${pulse ? 'scale-110' : 'scale-100'}`}>
          {pulse && <div className="absolute inset-0 bg-blue-500 rounded-full blur-3xl opacity-50 animate-ping"></div>}
          <span className={`text-[120px] md:text-[200px] font-black leading-none tracking-tighter tabular-nums transition-colors duration-300 ${pulse ? 'text-white text-shadow-glow' : 'text-blue-50'}`}>
            {totalVotos.toLocaleString('pt-BR')}
          </span>
        </div>
        
        <div className="mt-8 flex items-center gap-2 text-slate-500 font-medium">
          <Users className="w-5 h-5" /> 
          <p>Participação segura e sigilosa garantida pela Justiça Eleitoral</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="z-10 w-full flex justify-between items-end border-t border-white/10 pt-6 animate-in fade-in slide-in-from-bottom-10 duration-1000">
        <div className="flex items-center gap-3">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500"></span>
          </span>
          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Sistema Online • Blockchain Ativo</span>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Último Voto Computado</p>
          <p className="text-sm text-slate-300 font-mono">
            {ultimoVoto ? ultimoVoto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute:'2-digit', second:'2-digit' }) : "Aguardando..."}
          </p>
        </div>
      </div>

      <style>{`
        .text-shadow-glow { text-shadow: 0 0 30px rgba(59, 130, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.4); }
      `}</style>
    </div>
  );
}
