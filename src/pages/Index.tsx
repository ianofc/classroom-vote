import { useState, useEffect } from "react";
import TurmaSelection from "@/components/TurmaSelection";
import Urna from "@/components/Urna";
import AdminPanel from "@/components/AdminPanel";
import { validateAdmin } from "@/data/store";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Loader2, Moon, Sun, Lock, User, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Phase = "welcome" | "select" | "setup" | "voting" | "admin";

const Index = () => {
  const [phase, setPhase] = useState<Phase>("welcome");
  const [turma, setTurma] = useState<any | null>(null);
  const [currentVoter, setCurrentVoter] = useState(1);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Estados para o Modal de Login Elegante
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginData, setLoginData] = useState({ user: "", pass: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
      toast({ title: "Erro grave ao guardar o voto!", description: error.message, variant: "destructive" });
      return; 
    }

    setCurrentVoter((v) => v + 1);
    toast({ title: "Voto Computado", description: "O eleitor finalizou a votação." });
  };

  // Função de Login do Modal
  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const isValid = await validateAdmin(loginData.user, loginData.pass);
    
    setIsLoggingIn(false);

    if (isValid) {
      setShowLoginModal(false);
      setLoginData({ user: "", pass: "" }); // limpa dados
      setPhase("admin");
    } else {
      setLoginError("Credenciais incorretas. Tente novamente.");
    }
  };

  return (
    <div className="bg-aurora flex flex-col items-center justify-center min-h-screen relative">
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)} 
        className="fixed top-6 right-6 p-3 rounded-full glass-panel text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform z-[60] flex items-center justify-center"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* MODAL DE LOGIN ELEGANTE (GLASSMORPHISM) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300 px-4">
          <div className="bg-white dark:bg-slate-900 border border-white/50 dark:border-slate-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-3">
                <Lock className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Acesso Restrito</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Comissão Eleitoral CEEPS</p>
            </div>

            <form onSubmit={submitLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1">Utilizador</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                  <input 
                    required autoFocus type="text" placeholder="Nome de utilizador"
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
                {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Painel"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* RENDERIZAÇÃO DAS FASES DA APLICAÇÃO */}
      {phase === "welcome" && (
        <div className="glass-panel p-12 rounded-3xl flex flex-col items-center max-w-lg w-[90%] text-center animate-in fade-in zoom-in duration-1000">
          <div className="w-20 h-20 loader-ceeps mb-8"></div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-2">
            Bem-vindo às<br/>Eleições
          </h1>
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400">CEEPS 2026</h2>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 font-medium">Preparando o ambiente seguro...</p>
        </div>
      )}

      {phase === "select" && (
        <div className="w-full h-full animate-in fade-in duration-700">
          <TurmaSelection onSelect={handleSelectTurma} onAdmin={() => setShowLoginModal(true)} />
        </div>
      )}

      {phase === "setup" && turma && (
        <div className="w-[90%] max-w-sm glass-panel rounded-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
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

      {phase === "voting" && turma && (
        <div className="w-full animate-in fade-in duration-500">
          <Urna turma={turma} onVoteConfirmed={handleVote} onBack={() => setPhase("select")} />
          <button onClick={() => setShowLoginModal(true)} className="fixed bottom-6 right-6 w-12 h-12 rounded-full glass-panel flex items-center justify-center transition-all hover:scale-110 z-50 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
      )}

      {phase === "admin" && (
        <div className="w-full animate-in fade-in duration-500 z-10 relative">
          <AdminPanel turma={turma} onBack={() => setPhase("select")} onTurmasChanged={() => {}} />
        </div>
      )}
    </div>
  );
};

export default Index;
