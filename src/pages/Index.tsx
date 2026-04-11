import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Urna from "@/components/Urna";
import AdminPanel from "@/components/AdminPanel";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ShieldCheck, Loader2, Moon, Sun, Lock, User, LogOut, CheckCircle2, MessageSquareQuote, Building2, Search, UserCheck } from "lucide-react";
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
  const [escolaNome, setEscolaNome] = useState("Escola");
  const [escolaId, setEscolaId] = useState<string | null>(null);
  
  // MULTIPLAS ELEIÇÕES ATIVAS
  const [activeElections, setActiveElections] = useState<any[]>([]); 
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // MESA DO MESÁRIO (PESQUISA DO ELEITOR)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [voterData, setVoterData] = useState<any | null>(null);

  // DADOS DA URNA
  const [urnaPayload, setUrnaPayload] = useState<any | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const [loginData, setLoginData] = useState({ user: "", pass: "" });
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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
    const { data } = await supabase.from('admins').select('escolas(id, nome)').eq('auth_id', userId).single();
    let idDaEscola = null;

    if (data?.escolas) {
      const escolaData = Array.isArray(data.escolas) ? data.escolas[0] : data.escolas;
      if (escolaData?.nome) {
        setEscolaNome(escolaData.nome);
        idDaEscola = escolaData.id;
        setEscolaId(idDaEscola);
      }
    }

    if (idDaEscola) {
      const { data: eleicoes } = await supabase
        .from('eleicoes')
        .select('*')
        .eq('escola_id', idDaEscola)
        .eq('status', 'ativa')
        .order('created_at', { ascending: false });

      if (eleicoes) {
        setActiveElections(eleicoes);
      }
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
      setLoginData({ user: "", pass: "" }); 
      await fetchEscola(data.user.id);
      setPhase("welcome"); 
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEscolaNome("Escola");
    setActiveElections([]);
    setVoterData(null);
    setPhase("auth");
  };

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  useEffect(() => {
    if (phase === "welcome") {
      // ⚠️ AQUI ESTÁ A CORREÇÃO: O sistema agora vai direto para "identify" (Mesa do Mesário)
      const timer = setTimeout(() => setPhase("identify"), 3500);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // ============================================================================
  // BUSCA INTELIGENTE DE ELEITORES
  // ============================================================================
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length >= 3) {
        searchStudent(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const searchStudent = async (query: string) => {
    setSearching(true);
    const { data } = await supabase
      .from('students')
      .select('*, turmas!inner(name)')
      .ilike('name', `%${query}%`)
      .limit(10);
    
    setSearchResults(data || []);
    setSearching(false);
  };

  
// ============================================================================
  // A MENTE DO TSE: ELEIÇÃO MESTRA E SEGMENTAÇÃO AUTOMÁTICA
  // ============================================================================
  const selectVoter = async (student: any) => {
    setLoadingCandidates(true);
    setVoterData(student);
    setSearchQuery("");
    setSearchResults([]);
    
    if (activeElections.length === 0) {
      toast({ title: "Nenhuma Eleição Ativa", description: "O gestor precisa abrir uma eleição no painel.", variant: "destructive" });
      setLoadingCandidates(false);
      return;
    }

    // Pega as tags do aluno (Ex: ['líder geral', 'jovem ouvidor lgbt'])
    const rolesDoAluno = student.candidate_role 
      ? student.candidate_role.split(',').map((r: string) => r.trim().toLowerCase()) 
      : [];

    let allowedRoles: string[] = [];

    // 1. Descobre QUAIS SEGMENTOS (Cargos) esse aluno tem o direito de votar nas eleições ativas
    activeElections.forEach(eleicao => {
      // Pega os segmentos da eleição separados por vírgula (Ex: ['jovem ouvidor geral', 'jovem ouvidor do campo'])
      // Se a eleição não tiver a coluna cargos preenchida, usa o nome da própria eleição como fallback
      const cargosDaEleicao = eleicao.cargos 
        ? eleicao.cargos.split(',').map((c: string) => c.trim()) 
        : [eleicao.nome];

      if (eleicao.tipo === 'universal' || eleicao.tipo === 'turma') {
        // Universal e Turma: O aluno vota em TODOS os segmentos definidos dentro dessa eleição
        cargosDaEleicao.forEach((cargo: string) => {
          if (!allowedRoles.includes(cargo)) allowedRoles.push(cargo);
        });
      } 
      else if (eleicao.tipo === 'geral') {
        // Geral Restrita (Role-Based): O aluno SÓ vota nos segmentos que ele também possua no crachá dele
        cargosDaEleicao.forEach((cargo: string) => {
          if (rolesDoAluno.includes(cargo.toLowerCase())) {
             if (!allowedRoles.includes(cargo)) allowedRoles.push(cargo);
          }
        });
      }
    });

    if (allowedRoles.length === 0) {
      toast({ title: "Acesso Negado", description: "Este aluno não possui perfil para votar nas eleições atualmente abertas.", variant: "destructive" });
      setLoadingCandidates(false);
      setVoterData(null);
      return;
    }

    // 2. Busca TODOS os candidatos do banco que concorrem a esses cargos autorizados
    const { data: allCandidatesData } = await supabase
      .from('students')
      .select('*')
      .eq('is_candidate', true);

    // Filtra para pegar apenas os candidatos que têm ao menos uma das tags autorizadas
    const filteredByRole = allCandidatesData?.filter(cand => {
       if (!cand.candidate_role) return false;
       const candRoles = cand.candidate_role.split(',').map((r: string) => r.trim().toLowerCase());
       return allowedRoles.some(allowed => candRoles.includes(allowed.toLowerCase()));
    }) || [];

    // 3. O FILTRO DA SALA DE AULA (Garante que eleitor da Turma A só veja candidato da Turma A nas eleições "Por Turma")
    const finalCandidates = filteredByRole.filter(cand => {
      // Pega as tags do candidato
      const candRoles = cand.candidate_role.split(',').map((r: string) => r.trim().toLowerCase());
      
      // Verifica se alguma das tags desse candidato pertence a uma eleição do tipo 'turma'
      const isFromTurmaElection = activeElections.some(eleicao => {
         if (eleicao.tipo !== 'turma') return false;
         const cargosEleicao = eleicao.cargos ? eleicao.cargos.split(',').map((c: string) => c.trim().toLowerCase()) : [eleicao.nome.toLowerCase()];
         // Se a eleição é de turma e o candidato tem um cargo dela
         return cargosEleicao.some((c: string) => candRoles.includes(c));
      });

      if (isFromTurmaElection) {
        return cand.turma_id === student.turma_id; // Trava na mesma turma
      }
      return true; // Se for Universal ou Geral, libera pra escola toda ver!
    });

    // 4. Monta o pacote de dados para a Urna iterar
    setUrnaPayload({
      id: student.turma_id,
      name: student.turmas?.name,
      allowedRoles: allowedRoles, // Passamos as Strings dos Segmentos (E a urna vai gerar uma tela pra cada)
      candidates: finalCandidates
    });

    setPhase("setup");
    setLoadingCandidates(false);
  };
  
  
  // ============================================================================
  // GRAVAÇÃO MÚLTIPLA NA BLOCKCHAIN
  // ============================================================================
  const handleVote = async (votesArray: any[], currentVoterData: any) => {
    try {
      const rowsToInsert = [];
      let hashAtual = "GENESIS_BLOCK_0000000000000000000000000000000000000000000000000000";

      for (const vote of votesArray) {
        const eleicaoReferente = activeElections.find(e => e.nome.toLowerCase() === vote.role.toLowerCase());
        const eleicaoIdParaGravar = eleicaoReferente?.id;

        if (!eleicaoIdParaGravar) continue;

        const { data: lastVote } = await supabase
          .from('votes')
          .select('hash_voto')
          .eq('eleicao_id', eleicaoIdParaGravar)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        hashAtual = lastVote?.hash_voto || hashAtual;

        const stringParaGravar = `${eleicaoIdParaGravar}|${urnaPayload.id}|${voterData.name}|${vote.role}|${vote.number}|${vote.type}|${hashAtual}`;
        const novoHash = await gerarHash256(stringParaGravar);

        rowsToInsert.push({
          session_id: currentSessionId,
          turma_id: urnaPayload.id,
          eleicao_id: eleicaoIdParaGravar,
          voter_name: voterData.name, 
          candidate_role: vote.role,
          candidate_number: vote.number,
          vote_type: vote.type,
          hash_anterior: hashAtual,
          hash_voto: novoHash
        });
      }
      
      const { error } = await supabase.from('votes').insert(rowsToInsert);
      if (error) throw error;

    } catch (err: any) {
      toast({ title: "Falha de Integridade", description: err.message, variant: "destructive" });
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="bg-aurora min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-aurora flex flex-col items-center justify-center min-h-screen relative overflow-hidden text-slate-900 dark:text-white transition-colors duration-300">
      
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)} 
        className="fixed top-6 right-6 p-3 rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:scale-105 transition-transform z-[60] flex items-center justify-center shadow-lg border border-slate-200 dark:border-slate-700"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* ================= FASE 1: LOGIN ================= */}
      {phase === "auth" && (
        <div className="w-full max-w-6xl min-h-screen md:min-h-[85vh] md:my-8 bg-white dark:bg-slate-900 md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-500 border border-slate-200 dark:border-slate-800">
          
          <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-blue-700 to-indigo-900 p-12 flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-30 pointer-events-none">
               <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-400 blur-[120px]"></div>
               <div className="absolute bottom-0 -right-20 w-80 h-80 rounded-full bg-red-500 blur-[120px]"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <ShieldCheck className="w-10 h-10 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <h1 className="text-3xl font-black tracking-tight text-white">Classroom Vote</h1>
              </div>
              <h2 className="text-4xl font-black leading-tight mb-6 text-white tracking-tighter">
                A democracia na sua escola levada a sério.
              </h2>
              <p className="text-blue-100 text-lg mb-12 max-w-sm font-medium">
                Plataforma de votação criptografada em Blockchain, simples de usar e com apuração em tempo real.
              </p>

              <div className="bg-white/10 backdrop-blur-sm border border-red-500/30 p-6 rounded-2xl mb-8 shadow-2xl">
                <MessageSquareQuote className="w-8 h-8 text-red-500 mb-4 opacity-90" />
                <p className="font-medium text-blue-50 italic leading-relaxed mb-6">
                  "O sistema revolucionou a forma como elegemos os nossos líderes! A apuração na Eleição de Líderes de Sala foi instantânea e 100% à prova de fraudes."
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center font-black text-white shadow-lg border-2 border-red-400">
                    IS
                  </div>
                  <div>
                    <p className="font-black text-sm text-white tracking-wide">Ian Santos</p>
                    <p className="text-xs text-blue-300 mt-0.5 leading-tight">
                      Professor, CEEPS Seabra-Ba e<br/>Criador do App Classroom Vote
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 border-t border-red-500/30 pt-8 mt-auto">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200 mb-4">Instituições que confiam</p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-blue-800/80 px-4 py-2.5 rounded-xl border border-blue-700 shadow-sm transition-transform hover:scale-105">
                  <Building2 className="w-4 h-4 text-blue-400"/> 
                  <span className="text-sm font-black tracking-widest text-white">CEEPS</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full md:w-7/12 p-8 md:p-16 flex flex-col justify-center bg-slate-50 dark:bg-slate-900 relative">
            <div className="max-w-md w-full mx-auto">
              <div className="text-center md:text-left mb-10">
                <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Acesso Restrito</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Bem-vindo de volta! Inicie sessão para gerir o painel da sua escola.</p>
              </div>

              <form onSubmit={submitLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">E-mail do Gestor</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      required autoFocus type="email" placeholder="diretoria@escola.com.br"
                      className="w-full pl-12 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 dark:text-white transition-all shadow-sm"
                      value={loginData.user} onChange={e => setLoginData({...loginData, user: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider ml-1">Palavra-passe</label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
                    <input 
                      required type="password" placeholder="••••••••"
                      className="w-full pl-12 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-800 dark:text-white transition-all shadow-sm"
                      value={loginData.pass} onChange={e => setLoginData({...loginData, pass: e.target.value})}
                    />
                  </div>
                </div>
                
                {loginError && <p className="text-xs text-red-600 font-bold text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-xl animate-in shake border border-red-100 dark:border-red-800/50">{loginError}</p>}
                
                <button type="submit" disabled={isLoggingIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-2 mt-4 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50">
                  {isLoggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : "Entrar no Sistema"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ================= FASE 2: BOAS VINDAS ================= */}
      {phase === "welcome" && (
        <div className="glass-panel p-12 rounded-3xl flex flex-col items-center max-w-lg w-[90%] text-center animate-in fade-in zoom-in duration-1000 z-10">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-tight mb-2">
            Bem-vindo às<br/>Eleições
          </h1>
          <h2 className="text-xl md:text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest px-4 py-2 bg-blue-50 dark:bg-blue-900/30 rounded-xl mt-2">{escolaNome}</h2>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Sincronizando Cadeia Criptográfica...
          </p>
        </div>
      )}

      {/* ================= FASE 3: MESA DO MESÁRIO (IDENTIFICAÇÃO DO ELEITOR) ================= */}
      {phase === "identify" && (
        <div className="w-full h-full animate-in fade-in duration-700 flex flex-col items-center pt-24 z-10 px-4">
          
          <div className="fixed top-4 left-4 right-4 md:left-auto md:right-auto md:w-[700px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex justify-between items-center z-40">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 p-2.5 rounded-full">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-0.5">Mesa Receptora</p>
                <p className="text-sm font-black text-slate-800 dark:text-white leading-tight truncate max-w-[150px] md:max-w-[250px]">{escolaNome}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={() => setPhase("admin")} className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 py-2 px-3 rounded-lg transition-colors border border-blue-100 dark:border-blue-800">
                 Painel de Gestão
               </button>
               <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 px-3 rounded-lg transition-colors border border-red-100 dark:border-red-900/30">
                 <LogOut className="w-3.5 h-3.5" /> Sair
               </button>
            </div>
          </div>

          <div className="w-full max-w-[700px] mt-10">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Identificação do Eleitor</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                Existem <strong className="text-blue-600 dark:text-blue-400">{activeElections.length}</strong> eleições abertas. O sistema decidirá a cédula automaticamente.
              </p>
            </div>

            <div className="relative mb-6">
              <Search className="w-6 h-6 absolute left-5 top-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Digite o nome do aluno para liberar a urna..." 
                className="w-full pl-14 pr-6 py-4 text-lg bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-blue-500 dark:focus:border-blue-500 text-slate-800 dark:text-white shadow-lg transition-all"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searching && <Loader2 className="w-5 h-5 absolute right-5 top-4 text-blue-500 animate-spin" />}
            </div>

            {searchQuery.length >= 3 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden max-h-[400px] overflow-y-auto">
                {searchResults.length === 0 && !searching ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">Nenhum aluno encontrado com esse nome.</div>
                ) : (
                  searchResults.map(student => (
                    <button 
                      key={student.id} 
                      onClick={() => selectVoter(student)}
                      className="w-full p-4 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors text-left"
                    >
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white text-lg">{student.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Turma: {student.turmas?.name}</p>
                      </div>
                      
                      {student.candidate_role && (
                        <div className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                          <UserCheck className="w-3 h-3" /> PERFIL: {student.candidate_role}
                        </div>
                      )}
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
        <div className="w-[90%] max-w-md glass-panel rounded-3xl p-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 z-10">
          <div className="space-y-6">
            
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
              <User className="w-8 h-8" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{voterData.name}</h1>
              <p className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">Turma: {urnaPayload.name}</p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Eleições Autorizadas para este Perfil:</p>
              <div className="space-y-2">
                {urnaPayload.allowedRoles.map((role: string) => (
                  <div key={role} className="bg-blue-100/50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-sm font-bold px-3 py-2 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" /> {role}
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleStartVoting} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-blue-500/30">
              Liberar Urna
            </button>
            <button onClick={() => { setPhase("identify"); setVoterData(null); setSearchQuery(""); }} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest">
              Cancelar e Voltar
            </button>
          </div>
        </div>
      )}

      {/* ================= FASE 5: URNA ================= */}
      {phase === "voting" && urnaPayload && (
        <div className="w-full animate-in fade-in duration-500 z-10">
          <Urna turma={urnaPayload} onVoteConfirmed={(votes) => handleVote(votes, voterData)} onBack={() => setPhase("identify")} />
          
          <button onClick={() => setPhase("admin")} className="fixed bottom-6 right-6 w-12 h-12 rounded-full glass-panel flex items-center justify-center transition-all hover:scale-110 z-50 text-slate-500 dark:text-slate-400 shadow-lg">
            <ShieldCheck className="w-5 h-5" />
          </button>
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
