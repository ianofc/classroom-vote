import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Urna from "@/components/Urna";
import AdminPanel from "@/components/AdminPanel";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ShieldCheck, Loader2, Moon, Sun, Lock, User, LogOut, CheckCircle2, MessageSquareQuote, Landmark, Search, UserCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Phase = "auth" | "welcome" | "identify" | "setup" | "voting" | "admin";

const gerarHash256 = async (mensagem: string) => {
  const msgBuffer = new TextEncoder().encode(mensagem);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const Index = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("auth");
  const [escolaNome, setEscolaNome] = useState("Colégio Eleitoral");
  const [escolaId, setEscolaId] = useState<string | null>(null);
  
  const [activeElections, setActiveElections] = useState<any[]>([]); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [voterData, setVoterData] = useState<any | null>(null);

  const [urnaPayload, setUrnaPayload] = useState<any | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [loginData, setLoginData] = useState({ user: "", pass: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  useEffect(() => { checkSession(); }, []);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) { await fetchEscola(session.user.id); setPhase("welcome"); } 
    else { setPhase("auth"); }
    setIsCheckingAuth(false);
  };

  const fetchEscola = async (userId: string) => {
    const { data } = await supabase.from('admins').select('escolas(id, nome)').eq('auth_id', userId).single();
    let idDaEscola = null;
    if (data?.escolas) {
      const escolaData = Array.isArray(data.escolas) ? data.escolas[0] : data.escolas;
      if (escolaData?.nome) { setEscolaNome(escolaData.nome); idDaEscola = escolaData.id; setEscolaId(idDaEscola); }
    }
    // Mantemos a chamada inicial para a UI, mas a Urna usará sempre dados em tempo real
    if (idDaEscola) {
      const { data: eleicoes } = await supabase.from('eleicoes').select('*').eq('escola_id', idDaEscola).eq('status', 'ativa').order('created_at', { ascending: false });
      if (eleicoes) setActiveElections(eleicoes);
    }
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError(""); setIsLoggingIn(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginData.user, password: loginData.pass });
    setIsLoggingIn(false);
    if (error || !data.user) { setLoginError("Credenciais inválidas."); } 
    else { setLoginData({ user: "", pass: "" }); await fetchEscola(data.user.id); setPhase("welcome"); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEscolaNome("Colégio Eleitoral"); setActiveElections([]); setVoterData(null); setPhase("auth");
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (phase === "welcome") {
      const timer = setTimeout(() => setPhase("identify"), 3500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 3) searchStudent(searchQuery);
      else setSearchResults([]);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const searchStudent = async (query: string) => {
    setSearching(true);
    const { data } = await supabase.from('students').select('*, turmas!inner(name)').ilike('name', `%${query}%`).limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  // ============================================================================
  // O NOVO CÉREBRO DA URNA: BLINDADO CONTRA CACHE E COM LÓGICA RESTRITA CORRIGIDA
  // ============================================================================
  const selectVoter = async (student: any) => {
    setLoadingCandidates(true); setVoterData(student); setSearchQuery(""); setSearchResults([]);
    
    if (!escolaId) {
      toast({ title: "Erro de Sessão", description: "Recarregue a página.", variant: "destructive" });
      setLoadingCandidates(false); return;
    }

    // 1. DADOS FRESCOS: Busca as eleições no exato momento para ignorar a cache.
    const { data: eleicoesFrescas } = await supabase.from('eleicoes')
      .select('*')
      .eq('escola_id', escolaId)
      .eq('status', 'ativa')
      .order('created_at', { ascending: false });

    const currentActiveElections = eleicoesFrescas || [];

    if (currentActiveElections.length === 0) {
      toast({ title: "Urnas Fechadas", description: "A comissão precisa abrir uma eleição no painel.", variant: "destructive" });
      setLoadingCandidates(false); return;
    }

    const rolesDoAluno = student.candidate_role ? student.candidate_role.split(',').map((r: string) => r.trim().toLowerCase()) : [];
    let allowedRoles: string[] = [];
    let allowedElectionsDocs: any[] = []; 

    // 2. PROCESSA QUEM PODE VOTAR NO QUÊ
    currentActiveElections.forEach(eleicao => {
      const cargosDaEleicao = eleicao.cargos ? eleicao.cargos.split(',').map((c: string) => c.trim()) : [eleicao.nome];
      
      if (eleicao.tipo === 'universal' || eleicao.tipo === 'turma') {
        // Toda a gente vota sem restrições
        cargosDaEleicao.forEach((cargo: string) => { 
          if (!allowedRoles.includes(cargo)) {
             allowedRoles.push(cargo);
             allowedElectionsDocs.push({ nome: cargo, tipo: eleicao.tipo, eleicao_id: eleicao.id });
          }
        });
      } else if (eleicao.tipo === 'geral') {
        // GERAL RESTRITA CORRIGIDA: Qualquer eleitor que já possua um cargo (Delegado/Líder de turma) está autorizado a votar.
        if (rolesDoAluno.length > 0) { 
           cargosDaEleicao.forEach((cargo: string) => {
              if (!allowedRoles.includes(cargo)) {
                 allowedRoles.push(cargo);
                 allowedElectionsDocs.push({ nome: cargo, tipo: eleicao.tipo, eleicao_id: eleicao.id });
              }
           });
        }
      }
    });

    if (allowedElectionsDocs.length === 0) {
      toast({ title: "Acesso Negado", description: "Este eleitor não possui perfil para votar nos pleitos atuais.", variant: "destructive" });
      setLoadingCandidates(false); setVoterData(null); return;
    }

    const { data: allCandidatesData } = await supabase.from('students').select('*').eq('is_candidate', true);
    
    const finalCandidates = (allCandidatesData || []).filter(cand => {
       if (!cand.candidate_role) return false;
       const candRoles = cand.candidate_role.split(',').map((r: string) => r.trim().toLowerCase());
       
       const isCompeting = allowedRoles.some(allowed => candRoles.includes(allowed.toLowerCase()));
       if (!isCompeting) return false;

       const isFromTurmaElection = allowedElectionsDocs.some(eleicao => {
          if (eleicao.tipo !== 'turma') return false;
          return candRoles.includes(eleicao.nome.toLowerCase());
       });
       if (isFromTurmaElection) return cand.turma_id === student.turma_id; 
       return true;
    });

    setUrnaPayload({ 
      id: student.turma_id, 
      name: student.turmas?.name, 
      allowedRoles: allowedRoles, 
      allowedElections: allowedElectionsDocs, 
      candidates: finalCandidates 
    });
    setPhase("setup"); setLoadingCandidates(false);
  };

  const handleStartVoting = () => { setCurrentSessionId(crypto.randomUUID()); setPhase("voting"); };

  const handleVote = async (votesArray: any[], currentVoterData: any) => {
    if (isSubmittingVote) return;
    setIsSubmittingVote(true);

    try {
      const rowsToInsert = [];
      let hashAtual = "GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000";

      for (const vote of votesArray) {
        const eleicaoIdParaGravar = vote.eleicao_id;
        if (!eleicaoIdParaGravar) continue;

        let lastVoteData = null;
        if (navigator.onLine) {
           const { data } = await supabase.from('votes').select('hash_voto').eq('eleicao_id', eleicaoIdParaGravar).order('created_at', { ascending: false }).limit(1).single();
           lastVoteData = data;
        }

        hashAtual = lastVoteData?.hash_voto || hashAtual;
        const stringParaGravar = `${eleicaoIdParaGravar}|${urnaPayload.id}|${voterData.name}|${vote.role}|${vote.number}|${vote.type}|${hashAtual}`;
        const novoHash = await gerarHash256(stringParaGravar);

        rowsToInsert.push({
          session_id: currentSessionId, turma_id: urnaPayload.id, eleicao_id: eleicaoIdParaGravar,
          voter_name: voterData.name, candidate_role: vote.role, candidate_number: vote.number, vote_type: vote.type,
          hash_anterior: hashAtual, hash_voto: novoHash
        });
      }
      
      if (!navigator.onLine) throw new Error("Dispositivo offline");

      const { error } = await supabase.from('votes').insert(rowsToInsert);
      if (error) throw error;
      
    } catch (err: any) {
      const offlineVotes = JSON.parse(localStorage.getItem('offline_votes_queue') || '[]');
      localStorage.setItem('offline_votes_queue', JSON.stringify([...offlineVotes, ...rowsToInsert]));
      toast({ title: "Modo Offline Ativo", description: "O voto foi salvo na urna e será sincronizado com a rede.", className: "bg-orange-50 text-orange-900 border-orange-200" });
    } finally {
      setIsSubmittingVote(false);
      setVoterData(null);
      setUrnaPayload(null);
      setPhase("identify");
    }
  };

  useEffect(() => {
    const syncOfflineVotes = async () => {
      const offlineVotes = JSON.parse(localStorage.getItem('offline_votes_queue') || '[]');
      if (offlineVotes.length > 0 && navigator.onLine) {
        const { error } = await supabase.from('votes').insert(offlineVotes);
        if (!error) {
          localStorage.removeItem('offline_votes_queue');
          toast({ title: "Sincronização Concluída", description: `${offlineVotes.length} votos offline enviados para a rede!` });
        }
      }
    };
    window.addEventListener('online', syncOfflineVotes);
    syncOfflineVotes(); 
    return () => window.removeEventListener('online', syncOfflineVotes);
  }, []);

  if (isCheckingAuth) return <div className="bg-slate-50 min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-blue-600 animate-spin" /></div>;

  return (
    <div className="bg-slate-100 flex flex-col items-center justify-center min-h-screen relative overflow-hidden text-slate-900 dark:text-white transition-colors duration-300">
      
      <button onClick={() => setIsDarkMode(!isDarkMode)} className="fixed top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform z-[60] flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-700">
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* ================= FASE 1: LOGIN (ÁGORA OS - COLÉGIO ELEITORAL) ================= */}
      {phase === "auth" && (
        <div className="w-full max-w-6xl min-h-screen md:min-h-[85vh] md:my-8 bg-white dark:bg-slate-900 md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500 border border-slate-200 dark:border-slate-800">
          <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-slate-900 to-blue-900 p-12 flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
               <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500 blur-[120px]"></div>
               <div className="absolute bottom-0 -right-20 w-80 h-80 rounded-full bg-indigo-500 blur-[120px]"></div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <Landmark className="w-10 h-10 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                <h1 className="text-3xl font-black tracking-tight text-white">Ágora OS</h1>
              </div>
              <h2 className="text-4xl font-black leading-tight mb-6 text-white tracking-tighter">A democracia nas suas mãos.</h2>
              <p className="text-blue-100 text-lg mb-12 max-w-sm font-medium">O Simulador Oficial de Cidadania para Colégios Eleitorais e Escolas. Votação criptografada, simples e com apuração em tempo real.</p>
              
              <div className="bg-white/10 backdrop-blur-sm border border-blue-500/30 p-6 rounded-2xl mb-8 shadow-2xl">
                <MessageSquareQuote className="w-8 h-8 text-blue-400 mb-4 opacity-90" />
                <p className="font-medium text-blue-50 italic leading-relaxed mb-6">"O sistema elevou o nível do debate democrático. A apuração foi instantânea, transparente e 100% à prova de fraudes."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center font-black text-white shadow-lg border-2 border-blue-400">IS</div>
                  <div><p className="font-black text-sm text-white tracking-wide">Ian Santos</p><p className="text-xs text-blue-300 mt-0.5 leading-tight">Criador do Ágora OS</p></div>
                </div>
              </div>
            </div>
            <div className="relative z-10 border-t border-blue-500/30 pt-8 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mb-4">Tecnologia Confiável</p>
              <div className="flex items-center gap-6"><div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 shadow-sm"><ShieldCheck className="w-4 h-4 text-blue-400"/> <span className="text-sm font-black tracking-widest text-white">GovTech / EdTech</span></div></div>
            </div>
          </div>

          <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-slate-50 dark:bg-slate-900 relative">
            <div className="max-w-md w-full mx-auto">
              <div className="text-center md:text-left mb-10"><h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Comissão Eleitoral</h2><p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Inicie sessão com as credenciais de gestão para configurar o pleito do seu Colégio Eleitoral.</p></div>
              <form onSubmit={submitLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">E-mail do Gestor / Juiz</label>
                  <div className="relative"><User className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" /><input required autoFocus type="email" placeholder="admin@agoraos.com" className="w-full pl-12 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 dark:text-white transition-all shadow-sm" value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})} /></div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Chave de Segurança</label>
                  <div className="relative"><Lock className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" /><input required type="password" placeholder="••••••••" className="w-full pl-12 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 dark:text-white transition-all shadow-sm" value={loginData.pass} onChange={e => setLoginData({...loginData, pass: e.target.value})} /></div>
                </div>
                {loginError && <p className="text-xs text-red-600 font-bold text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl animate-in shake border border-red-100 dark:border-red-800/50">{loginError}</p>}
                <button type="submit" disabled={isLoggingIn} className="w-full bg-slate-900 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-2 mt-4 transition-all shadow-lg shadow-slate-900/30 disabled:opacity-50">{isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Desbloquear Sistema"}</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= FASE 2: BOAS VINDAS ================= */}
      {phase === "welcome" && (
        <div className="bg-white/80 backdrop-blur-md p-12 rounded-3xl flex flex-col items-center max-w-lg w-[90%] text-center animate-in fade-in zoom-in duration-1000 z-10 border border-slate-200 shadow-xl">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner"><CheckCircle2 className="w-10 h-10" /></div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-2">Pleito Eleitoral</h1>
          <h2 className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl mt-2">{escolaNome}</h2>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Preparando Colégio Eleitoral...</p>
        </div>
      )}

      {/* ================= FASE 3: MESA RECEPTORA ================= */}
      {phase === "identify" && (
        <div className="w-full h-full animate-in fade-in duration-700 flex flex-col items-center pt-24 z-10 px-4">
          <div className="fixed top-4 left-4 right-4 md:left-auto md:right-auto md:w-[700px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center z-40">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2.5 rounded-full"><Landmark className="w-5 h-5 text-blue-600 dark:text-blue-400" /></div>
              <div className="text-left"><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Colégio Eleitoral</p><p className="text-sm font-black text-slate-800 dark:text-white leading-tight truncate max-w-[150px] md:max-w-[250px]">{escolaNome}</p></div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => setPhase("admin")} className="text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 py-2 px-3 rounded-lg transition-colors border border-slate-800">Painel do Juiz</button>
               <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 px-3 rounded-lg transition-colors border border-red-100 dark:border-red-900/30"><LogOut className="w-3.5 h-3.5" /> Sair</button>
            </div>
          </div>

          <div className="w-full max-w-[700px] mt-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Identificação do Eleitor</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">A cédula e os pleitos serão validados automaticamente para o eleitor.</p>
            </div>

            <div className="relative mb-6">
              <Search className="w-6 h-6 absolute left-5 top-4 text-slate-400" />
              <input type="text" placeholder="Digite o nome do eleitor para habilitar a urna..." className="w-full pl-14 pr-6 py-4 text-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 dark:focus:border-blue-500 text-slate-800 dark:text-white shadow-lg transition-all" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus />
              {searching && <Loader2 className="w-5 h-5 absolute right-5 top-4 text-blue-500 animate-spin" />}
            </div>

            {searchQuery.length >= 3 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
                {searchResults.length === 0 && !searching ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">Nenhum registo encontrado com esse nome.</div>
                ) : (
                  searchResults.map(student => (
                    <button key={student.id} onClick={() => selectVoter(student)} className="w-full p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors text-left">
                      <div><p className="font-bold text-slate-800 dark:text-white text-lg">{student.name}</p><p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Seção/Turma: {student.turmas?.name}</p></div>
                      {student.candidate_role && (<div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5"><UserCheck className="w-3 h-3" /> CANDIDATO / DELEGADO</div>)}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= FASE 4: CONFIRMAÇÃO ================= */}
      {phase === "setup" && voterData && urnaPayload && (
        <div className="w-[90%] max-w-md bg-white/90 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 z-10">
          <div className="space-y-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner"><User className="w-8 h-8" /></div>
            <div><h1 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{voterData.name}</h1><p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Seção: {urnaPayload.name}</p></div>
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Pleitos Habilitados para o Eleitor:</p>
              <div className="space-y-2">
                {urnaPayload.allowedElections.map((el: any, idx: number) => (
                  <div key={idx} className="bg-blue-100/50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm font-bold px-3 py-2 rounded-lg flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {el.nome}</div>
                ))}
              </div>
            </div>
            <button onClick={handleStartVoting} className="w-full py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-slate-900/30">Habilitar Urna</button>
            <button onClick={() => { setPhase("identify"); setVoterData(null); setSearchQuery(""); }} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest">Cancelar e Voltar</button>
          </div>
        </div>
      )}

      {/* ================= FASE 5: URNA ================= */}
      {phase === "voting" && urnaPayload && (
        <div className="w-full animate-in fade-in duration-500 z-10">
          <Urna turma={urnaPayload} onVoteConfirmed={(votes) => handleVote(votes, voterData)} onBack={() => setPhase("identify")} />
          <button onClick={() => setPhase("admin")} className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-white/80 border border-slate-200 flex items-center justify-center transition-all hover:scale-110 z-50 text-slate-500 dark:text-slate-400 shadow-lg"><ShieldCheck className="w-5 h-5" /></button>
        </div>
      )}

      {/* ================= FASE 6: ADMIN ================= */}
      {phase === "admin" && (
        <div className="w-full animate-in fade-in duration-500 z-10 relative">
          <AdminPanel turma={null} onBack={() => setPhase("identify")} onTurmasChanged={() => {}} />
        </div>
      )}
    </div>
  );
};

export default Index;
