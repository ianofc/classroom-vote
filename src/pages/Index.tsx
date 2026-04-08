import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import TurmaSelection from "@/components/TurmaSelection";
import Urna from "@/components/Urna";
import AdminPanel from "@/components/AdminPanel";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Loader2, Moon, Sun, Lock, User, LogOut, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Phase = "auth" | "welcome" | "select" | "setup" | "voting" | "admin";

const Index = () => {
  const navigate = useNavigate();
  
  // A fase inicial agora é 'auth' (Login), não mais o 'welcome'
  const [phase, setPhase] = useState<Phase>("auth");
  const [escolaNome, setEscolaNome] = useState("Escola");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [turma, setTurma] = useState<any | null>(null);
  const [currentVoter, setCurrentVoter] = useState(1);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Estados de Login
  const [loginData, setLoginData] = useState({ user: "", pass: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // ================= LÓGICA DE AUTENTICAÇÃO E SESSÃO =================
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await fetchEscola(session.user.id);
      setPhase("welcome");
    } else {
      setPhase("auth");
    }
    setIsCheckingAuth(false);
  };

  const fetchEscola = async (userId: string) => {
    const { data } = await supabase.from('admins').select('escolas(nome)').eq('auth_id', userId).single();
    if (data?.escolas) {
      const nome = Array.isArray(data.escolas) ? data.escolas[0]?.nome : data.escolas.nome;
      if (nome) setEscolaNome(nome);
    }
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginData.user,
      password: loginData.pass,
    });

    setIsLoggingIn(false);

    if (error || !data.user) {
      setLoginError("E-mail ou senha incorretos.");
    } else {
      setLoginData({ user: "", pass: "" }); // limpa formulário
      await fetchEscola(data.user.id);
      setPhase("welcome"); // Vai para as boas vindas com o nome da escola
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEscolaNome("Escola");
    setTurma(null);
    setPhase("auth");
  };

  // ================= GERENCIAMENTO DE TEMA E FLUXO =================
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (phase === "welcome") {
      const timer = setTimeout(() => setPhase("select"), 3500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  const handleSelectTurma = async (t: any) => {
    setLoadingCandidates(true);
    setPhase("setup");
    const { data } = await supabase.from('students').select('*').eq('turma_id', t.id).eq('is_candidate', true);
    setTurma({ ...t, candidates: data || [] });
    setLoadingCandidates(false);
  };

  const handleStartVoting = () => {
    setCurrentVoter(1);
    setCurrentSessionId(crypto.randomUUID());
    setPhase("voting");
  };

  const handleVote = async (votesArray: any[], voterData: any) => {
    const rowsToInsert = votesArray.map(vote => ({
      session_id: currentSessionId,
      turma_id: turma.id,
      voter_name: voterData.name,
      candidate_role: vote.role,
      candidate_number: vote.number,
      vote_type: vote.type
    }));
    
    const { error } = await supabase.from('votes').insert(rowsToInsert);

    if (error) {
      toast({ title: "Erro ao computar voto", description: error.message, variant: "destructive" });
      return; 
    }

    setCurrentVoter((v) => v + 1);
    toast({ title: "Voto Registrado", description: "O eleitor finalizou a votação." });
  };

  // Se estiver verificando se o usuário já estava logado, mostra apenas um loading
  if (isCheckingAuth) {
    return (
      <div className="bg-aurora min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-aurora flex flex-col items-center justify-center min-h-screen relative overflow-hidden">
      
      {/* Botão de Tema Global */}
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)} 
        className="fixed top-6 right-6 p-3 rounded-full glass-panel text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform z-[60] flex items-center justify-center shadow-md"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* ================= FASE 1: TELA DE LOGIN / CADASTRO ================= */}
      {phase === "auth" && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl w-[90%] max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-500 z-10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight text-center">Plataforma de Eleições</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 text-center">Inicie sessão para gerir a sua escola</p>
          </div>

          <form onSubmit={submitLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">E-mail do Gestor</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  required autoFocus type="email" placeholder="diretor@escola.com"
                  className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white transition-all"
                  value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Palavra-passe</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input 
                  required type="password" placeholder="••••••••"
                  className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white transition-all"
                  value={loginData.pass} onChange={e => setLoginData({...loginData, pass: e.target.value})}
                />
              </div>
            </div>
            
            {loginError && <p className="text-xs text-red-500 font-bold text-center bg-red-50 dark:bg-red-900/20 p-2 rounded-lg animate-in shake">{loginError}</p>}
            
            <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-3.5 rounded-xl flex justify-center items-center gap-2 mt-6 transition-all shadow-lg disabled:opacity-50">
              {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
            </button>
          </form>

          {/* Botão para Cadastro Self-Service */}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">A sua escola ainda não possui conta?</p>
            <button onClick={() => navigate('/cadastro')} className="mt-2 text-blue-600 dark:text-blue-400 font-bold hover:underline">
              Crie uma conta Gratuitamente
            </button>
          </div>
        </div>
      )}

      {/* ================= FASE 2: BOAS VINDAS (Dinâmico) ================= */}
      {phase === "welcome" && (
        <div className="glass-panel p-12 rounded-3xl flex flex-col items-center max-w-lg w-[90%] text-center animate-in fade-in zoom-in duration-1000 z-10">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-2">
            Bem-vindo às<br/>Eleições
          </h1>
          {/* Nome da Escola Buscado do Banco */}
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{escolaNome}</h2>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Preparando o ambiente seguro...
          </p>
        </div>
      )}

      {/* ================= FASE 3: SELEÇÃO DE TURMAS ================= */}
      {phase === "select" && (
        <div className="w-full h-full animate-in fade-in duration-700 flex flex-col items-center pt-24 z-10">
          
          {/* Barra Flutuante do Gestor Logado */}
          <div className="fixed top-4 left-4 right-4 md:left-auto md:right-auto md:w-[600px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center z-40">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2.5 rounded-full">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Conectado como</p>
                <p className="text-sm font-black text-slate-800 dark:text-white leading-tight truncate max-w-[200px] md:max-w-[300px]">{escolaNome}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => setPhase("admin")} className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 py-2 px-3 rounded-lg transition-colors">
                 Painel Admin
               </button>
               <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 px-3 rounded-lg transition-colors">
                 <LogOut className="w-3.5 h-3.5" /> Sair
               </button>
            </div>
          </div>

          {/* O componente TurmaSelection agora assume que já existe sessão */}
          <TurmaSelection onSelect={handleSelectTurma} onAdmin={() => setPhase("admin")} />
        </div>
      )}

      {/* ================= FASE 4: CONFIGURAÇÃO DA MESA RECEPTORA ================= */}
      {phase === "setup" && turma && (
        <div className="w-[90%] max-w-sm glass-panel rounded-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 z-10">
          {loadingCandidates ? (
            <div className="flex flex-col items-center py-10"><Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-4" /><p className="text-sm dark:text-slate-300">Carregando candidatos...</p></div>
          ) : (
            <div className="space-y-6">
              <h1 className="text-2xl font-black uppercase text-blue-600 dark:text-blue-400 border-b border-slate-200 dark:border-slate-700 pb-4">{turma.name}</h1>
              <div className="text-left space-y-2 mb-6">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Cargos em Disputa:</p>
                {Array.from(new Set(turma.candidates.map((c: any) => c.candidate_role))).map((role: any) => (
                  <span key={role} className="inline-block bg-blue-100/80 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-bold px-2 py-1 rounded mr-2 mb-2">{role}</span>
                ))}
              </div>
              <button onClick={handleStartVoting} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-500/30">Abrir Urna Agora</button>
              <button onClick={() => setPhase("select")} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest">Cancelar</button>
            </div>
          )}
        </div>
      )}

      {/* ================= FASE 5: URNA ELETRÔNICA (VOTAÇÃO) ================= */}
      {phase === "voting" && turma && (
        <div className="w-full animate-in fade-in duration-500 z-10">
          <Urna turma={turma} onVoteConfirmed={handleVote} onBack={() => setPhase("select")} />
          <button onClick={() => setPhase("admin")} className="fixed bottom-6 right-6 w-12 h-12 rounded-full glass-panel flex items-center justify-center transition-all hover:scale-110 z-50 text-slate-500 dark:text-slate-400 shadow-lg">
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ================= FASE 6: PAINEL DE GESTÃO ================= */}
      {phase === "admin" && (
        <div className="w-full animate-in fade-in duration-500 z-10 relative">
          <AdminPanel turma={turma} onBack={() => setPhase("select")} onTurmasChanged={() => {}} />
        </div>
      )}
    </div>
  );
};

export default Index;
