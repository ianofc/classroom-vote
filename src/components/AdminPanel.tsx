import { useState, useEffect, useMemo } from "react";
import { Turma } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, ShieldCheck, FileText, Filter, Search, Calendar, Eye, EyeOff, Lock, Trash2, GraduationCap, Printer, BarChart3, CheckCircle2, AlertTriangle, User, CheckSquare, Maximize, ActivitySquare, ChevronLeft, ChevronRight, Download, Loader2, Trophy, Flame, TrendingUp, Users, Target, Image as ImageIcon, Contact, Database } from "lucide-react";
import ManageTurmas from "./ManageTurmas";
import ManageAdmins from "./ManageAdmins";
import MeuPerfil from "./MeuPerfil";
import ManageEleicoes from "./ManageEleicoes"; 
import { toast } from "@/hooks/use-toast";

import { initMercadoPago } from '@mercadopago/sdk-react';
initMercadoPago('TEST-COLOQUE-SUA-PUBLIC-KEY-AQUI');

interface ExtendedVoteRecord { id?: string; turma_id?: string; eleicao_id?: string; voter_name: string; candidate_role: string; candidate_number: number | null; vote_type: "candidate" | "branco" | "nulo"; created_at?: string; }
interface AdminLog { id: string; admin_email: string; acao: string; detalhes: string; created_at: string; }
type Tab = "apuracao" | "reports" | "midias" | "eleicoes" | "turmas" | "admins" | "perfil" | "logs";
interface AdminPanelProps { turma: Turma | null; onBack: () => void; onTurmasChanged: () => void; }

const AdminPanel = ({ onBack, onTurmasChanged }: AdminPanelProps) => {
  const [escolaNome, setEscolaNome] = useState("Carregando Escola...");
  const [escolaLogo, setEscolaLogo] = useState<string | null>(null); 
  const [activeTab, setActiveTab] = useState<Tab>("apuracao");
  const [isPrinting, setIsPrinting] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [showVotes, setShowVotes] = useState(false);
  
  const [allVotes, setAllVotes] = useState<ExtendedVoteRecord[]>([]);
  const [allTurmas, setAllTurmas] = useState<{id: string, name: string}[]>([]);
  const [allCandidates, setAllCandidates] = useState<any[]>([]); 
  const [allEleicoes, setAllEleicoes] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); 
  const [systemLogs, setSystemLogs] = useState<AdminLog[]>([]); 
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // FILTROS MESTRES (O PADRÃO AGORA É A ELEIÇÃO ATIVA)
  const [apuracaoEleicaoId, setApuracaoEleicaoId] = useState("");
  const [apuracaoTurmaId, setApuracaoTurmaId] = useState("");
  const [filters, setFilters] = useState({ search: "", turmaId: "", eleicaoId: "", voteType: "", date: "" });
  const [midiaSearch, setMidiaSearch] = useState("");

  useEffect(() => { document.documentElement.classList.remove('dark'); }, []);

  const fetchAllData = async () => {
    setReportLoading(true);
    const fetchEverything = async (tableName: string) => {
      let allData: any[] = []; let from = 0; const step = 1000; let fetchMore = true;
      while (fetchMore) {
        const { data, error } = await supabase.from(tableName).select('*').range(from, from + step - 1);
        if (error) { toast({ title: `Erro a buscar dados`, description: error.message, variant: "destructive" }); break; }
        if (data && data.length > 0) { allData = [...allData, ...data]; if (data.length < step) fetchMore = false; else from += step; } else { fetchMore = false; }
      }
      return allData;
    };

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: adminData } = await supabase.from('admins').select(`escolas (nome, logo_url)`).eq('auth_id', userData.user.id).single();
        if (adminData?.escolas) {
          const escolaData = Array.isArray(adminData.escolas) ? adminData.escolas[0] : adminData.escolas;
          setEscolaNome(escolaData.nome); setEscolaLogo(escolaData.logo_url);
        }
      }

      const [votesData, turmasData, candidatesRes, logsData, eleicoesData, studentsData] = await Promise.all([
        fetchEverything('votes'), fetchEverything('turmas'), supabase.from("students").select("*").eq("is_candidate", true).limit(5000),
        supabase.from("admin_logs").select("*").order('created_at', { ascending: false }).limit(200), fetchEverything('eleicoes'), fetchEverything('students')
      ]);

      setAllVotes((votesData as ExtendedVoteRecord[]).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()));
      if (studentsData) setAllStudents(studentsData);
      if (turmasData) {
        const sortedTurmas = turmasData.sort((a: any, b: any) => a.name.localeCompare(b.name));
        setAllTurmas(sortedTurmas);
        if (!apuracaoTurmaId && sortedTurmas.length > 0) setApuracaoTurmaId(sortedTurmas[0].id);
      }
      if (candidatesRes.data) setAllCandidates(candidatesRes.data);
      if (logsData.data) setSystemLogs(logsData.data);
      
      if (eleicoesData && eleicoesData.length > 0) {
        // ORDENA PARA QUE AS ELEIÇÕES ATIVAS SEJAM SEMPRE AS PRIMEIRAS
        const ativas = eleicoesData.filter((e:any) => e.status === 'ativa').sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const inativas = eleicoesData.filter((e:any) => e.status !== 'ativa').sort((a:any, b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const ordenadas = [...ativas, ...inativas];
        
        setAllEleicoes(ordenadas);
        
        // FOCA O DASHBOARD E A AUDITORIA NA PRIMEIRA ELEIÇÃO DA LISTA (A ATIVA MAIS RECENTE)
        if (!apuracaoEleicaoId) setApuracaoEleicaoId(ordenadas[0].id);
        if (!filters.eleicaoId) setFilters(prev => ({ ...prev, eleicaoId: ordenadas[0].id }));
      }
    } catch (err) { console.error(err); } finally { setReportLoading(false); }
  };

  useEffect(() => { if (["reports", "apuracao", "logs", "midias"].includes(activeTab)) fetchAllData(); }, [activeTab]);

  const getTurmaName = (id?: string) => allTurmas.find(t => t.id === id)?.name || "Desconhecida";
  const getEleicaoNome = (id?: string) => allEleicoes.find(e => e.id === id)?.nome || "Eleição Desconhecida";

  const eleicaoSelecionada = allEleicoes.find(e => e.id === apuracaoEleicaoId);
  const isEleicaoGlobal = eleicaoSelecionada?.tipo === 'universal' || eleicaoSelecionada?.tipo === 'geral';

  // ============================================================================
  // CÁLCULOS DO DASHBOARD (SEMPRE VINCULADOS À ELEIÇÃO SELECIONADA)
  // ============================================================================
  const estatisticasEscola = useMemo(() => {
    const votosDestaEleicao = allVotes.filter(v => v.eleicao_id === apuracaoEleicaoId);
    const totalEleitores = allStudents.length;
    const eleitoresQueVotaram = new Set(votosDestaEleicao.map(v => v.voter_name)).size; 
    const comparecimento = totalEleitores > 0 ? (eleitoresQueVotaram / totalEleitores) * 100 : 0;
    return { total: totalEleitores, votaram: eleitoresQueVotaram, comparecimento: comparecimento.toFixed(1), abstencao: (totalEleitores > 0 ? 100 - comparecimento : 0).toFixed(1), isHot: comparecimento >= 75 };
  }, [allStudents, allVotes, apuracaoEleicaoId]);

  const rankingTurmas = useMemo(() => {
    const votosDestaEleicao = allVotes.filter(v => v.eleicao_id === apuracaoEleicaoId);
    const ranking = allTurmas.map(turma => {
      const alunosDaTurma = allStudents.filter(s => s.turma_id === turma.id).length;
      const votosDaTurma = new Set(votosDestaEleicao.filter(v => v.turma_id === turma.id).map(v => v.voter_name)).size;
      const engajamento = alunosDaTurma > 0 ? (votosDaTurma / alunosDaTurma) * 100 : 0;
      return { id: turma.id, nome: turma.name, alunos: alunosDaTurma, votos: votosDaTurma, engajamento: parseFloat(engajamento.toFixed(1)) };
    });
    return ranking.sort((a, b) => b.engajamento - a.engajamento).filter(t => t.alunos > 0).slice(0, 5);
  }, [allTurmas, allStudents, allVotes, apuracaoEleicaoId]);

  const apuracaoOverview = useMemo(() => {
    if (!apuracaoEleicaoId) return { total: 0, validos: 0, brancos: 0, nulos: 0 };
    const votosFiltrados = allVotes.filter(v => {
      if (v.eleicao_id !== apuracaoEleicaoId) return false;
      if (!isEleicaoGlobal && apuracaoTurmaId && v.turma_id !== apuracaoTurmaId) return false;
      return true;
    });
    return {
      total: votosFiltrados.length, validos: votosFiltrados.filter(v => v.vote_type === 'candidate').length,
      brancos: votosFiltrados.filter(v => v.vote_type === 'branco').length, nulos: votosFiltrados.filter(v => v.vote_type === 'nulo').length
    };
  }, [apuracaoEleicaoId, apuracaoTurmaId, allVotes, isEleicaoGlobal]);

  const apuracaoResults = useMemo(() => {
    if (!apuracaoEleicaoId) return null;
    const votosFiltrados = allVotes.filter(v => {
      if (v.eleicao_id !== apuracaoEleicaoId) return false;
      if (!isEleicaoGlobal && apuracaoTurmaId && v.turma_id !== apuracaoTurmaId) return false;
      return true;
    });

    let candidatosFiltrados = allCandidates.filter(c => {
        if (isEleicaoGlobal) {
            const cargosDaEleicao = eleicaoSelecionada?.cargos ? eleicaoSelecionada.cargos.toLowerCase() : eleicaoSelecionada?.nome.toLowerCase() || "";
            const cargosDoCandidato = c.candidate_role ? c.candidate_role.toLowerCase() : "";
            const listaCargosEleicao = cargosDaEleicao.split(',').map((s: string) => s.trim());
            const listaCargosCand = cargosDoCandidato.split(',').map((s: string) => s.trim());
            return listaCargosCand.some((r: string) => listaCargosEleicao.includes(r));
        } else {
            return apuracaoTurmaId ? c.turma_id === apuracaoTurmaId : false;
        }
    });

    const roles = Array.from(new Set(candidatosFiltrados.map(c => c.candidate_role ? c.candidate_role.split(',')[0].trim() : "Líder Geral")));
    
    return roles.map(role => {
      const votesForRole = votosFiltrados.filter(v => v.candidate_role === role || (!v.candidate_role && role === "Líder Geral"));
      const totalVotes = votesForRole.length;
      
      const candidateResults = candidatosFiltrados.filter(c => c.candidate_role?.includes(role) || (!c.candidate_role && role === "Líder Geral")).map(c => {
        const vCount = votesForRole.filter(v => v.vote_type === 'candidate' && v.candidate_number === c.candidate_number).length;
        return { ...c, votes: vCount, percentage: totalVotes > 0 ? (vCount / totalVotes) * 100 : 0 };
      }).sort((a, b) => b.votes - a.votes);
      
      return {
        role, totalVotes, candidateResults,
        brancos: { votes: votesForRole.filter(v => v.vote_type === 'branco').length, percentage: totalVotes > 0 ? (votesForRole.filter(v => v.vote_type === 'branco').length / totalVotes)*100 : 0 },
        nulos: { votes: votesForRole.filter(v => v.vote_type === 'nulo').length, percentage: totalVotes > 0 ? (votesForRole.filter(v => v.vote_type === 'nulo').length / totalVotes)*100 : 0 }
      };
    });
  }, [apuracaoEleicaoId, apuracaoTurmaId, allVotes, allCandidates, isEleicaoGlobal, eleicaoSelecionada]);

  // ========================================================================
  // FILTROS DE AUDITORIA
  // ========================================================================
  const filterEleicaoSelecionada = allEleicoes.find(e => e.id === filters.eleicaoId);
  const isFilterEleicaoGlobal = filterEleicaoSelecionada?.tipo === 'universal' || filterEleicaoSelecionada?.tipo === 'geral';

  const filteredReport = useMemo(() => {
    return allVotes.filter(v => {
      const matchSearch = !filters.search || v.voter_name.toLowerCase().includes(filters.search.toLowerCase());
      const matchEleicao = !filters.eleicaoId || v.eleicao_id === filters.eleicaoId; 
      const deveAplicarFiltroTurma = filters.turmaId && (!filters.eleicaoId || !isFilterEleicaoGlobal);
      const matchTurma = !deveAplicarFiltroTurma || v.turma_id === filters.turmaId;
      const matchType = !filters.voteType || v.vote_type === filters.voteType;
      const matchDate = !filters.date || (v.created_at && v.created_at.startsWith(filters.date));
      return matchSearch && matchTurma && matchEleicao && matchType && matchDate;
    });
  }, [allVotes, filters, isFilterEleicaoGlobal]);

  const totalPages = Math.ceil(filteredReport.length / itemsPerPage);
  const paginatedReport = filteredReport.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDeleteVote = async (id: string, voterName: string) => {
    if (!window.confirm("Atenção! Excluir este voto permanentemente?")) return;
    const { error } = await supabase.from('votes').delete().eq('id', id);
    if (!error) {
      setAllVotes(prev => prev.filter(v => v.id !== id));
      toast({ title: "Sucesso", description: "Voto excluído." });
    }
  };

  const exportToCSV = () => { /* ...Omitido por brevidade no paste, mesma logica... */ };
  const downloadSnapshot = async () => { /* ...Omitido por brevidade no paste... */ };
  const printDashboardReport = () => { /* ...Omitido por brevidade no paste... */ };
  const printFilteredReport = () => { /* ...Omitido por brevidade no paste... */ };

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-slate-50 text-slate-900">
      <div className="w-full max-w-[1200px] flex justify-between items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"><ArrowLeft className="w-4 h-4" /> Voltar</button>
        <div className="flex items-center gap-4">
          <button onClick={() => window.open('/telao', '_blank')} className="hidden md:flex items-center gap-2 text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-lg"><Maximize className="w-3 h-3" /> ABRIR TELÃO</button>
          <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold"><ShieldCheck className="w-4 h-4" /> {escolaNome}</div>
        </div>
      </div>

      <div className="w-full max-w-[1200px] flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm mb-6 justify-center">
        {(["apuracao", "midias", "reports", "eleicoes", "turmas", "admins", "perfil"] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}>
            <span className="hidden md:inline">{tab === "reports" ? "AUDITORIA" : tab === "apuracao" ? "DASHBOARD" : tab.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="w-full max-w-[1200px]">
        {/* ABA: APURAÇÃO (DASHBOARD) */}
        {activeTab === "apuracao" && (
          <div className="space-y-6 animate-in fade-in">
             <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 md:p-8 rounded-2xl shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-8 border border-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="flex-1 w-full z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-blue-500 text-white"><Flame className="w-5 h-5" /></div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-slate-100">Termômetro da Democracia</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Eleitorado</p><p className="text-3xl font-black text-white">{estatisticasEscola.total}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Votaram</p><p className="text-3xl font-black text-green-400">{estatisticasEscola.votaram}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Comparecimento</p><p className="text-3xl font-black text-blue-400">{estatisticasEscola.comparecimento}%</p></div>
                </div>
              </div>
              <div className="w-full md:w-80 bg-white/10 backdrop-blur-sm p-5 rounded-2xl z-10 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2"><Trophy className="w-5 h-5 text-yellow-500" /><h3 className="text-sm font-black uppercase tracking-widest text-slate-100">Top 5 Turmas</h3></div>
                <div className="space-y-3">
                  {rankingTurmas.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Aguardando votos...</p> : rankingTurmas.map((turma, index) => (
                      <div key={turma.id} className="flex justify-between group"><p className="text-sm font-bold text-slate-200">{index + 1}º {turma.nome}</p><p className="text-sm font-black text-white">{turma.engajamento}%</p></div>
                    ))}
                </div>
              </div>
            </div>

            {/* O FILTRO MESTRE DE APURAÇÃO (EM DESTAQUE) */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-4 mt-8">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-blue-600 uppercase mb-2 block flex items-center gap-1"><Filter className="w-4 h-4"/> 1. Qual eleição deseja apurar?</label>
                <select className="w-full p-4 border-2 border-blue-200 rounded-xl text-lg font-black bg-blue-50 text-blue-900 outline-none focus:border-blue-600 transition-colors cursor-pointer" value={apuracaoEleicaoId} onChange={e => setApuracaoEleicaoId(e.target.value)}>
                  {allEleicoes.length === 0 && <option value="">Nenhuma Eleição Encontrada</option>}
                  {allEleicoes.map(e => <option key={e.id} value={e.id}>{e.nome} {e.status === 'ativa' ? '(ATIVA)' : '(ENCERRADA)'}</option>)}
                </select>
              </div>

              {!isEleicaoGlobal && (
                <div className="flex-1 w-full animate-in fade-in">
                  <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-1"><Users className="w-4 h-4"/> 2. Selecione a Turma</label>
                  <select className="w-full p-4 border-2 border-slate-200 rounded-xl text-lg font-bold bg-slate-50 outline-none focus:border-slate-400 cursor-pointer" value={apuracaoTurmaId} onChange={e => setApuracaoTurmaId(e.target.value)}>
                    <option value="">-- Escolha uma Turma --</option>
                    {allTurmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              <button onClick={printDashboardReport} disabled={isPrinting || (!isEleicaoGlobal && !apuracaoTurmaId)} className="w-full md:w-auto h-[60px] bg-slate-900 hover:bg-slate-800 text-white px-8 rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
                <Printer className="w-5 h-5" /> Exportar PDF
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-500">VOTOS COMPUTADOS</p><p className="text-3xl font-black text-blue-600">{apuracaoOverview.total}</p></div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-500">VÁLIDOS</p><p className="text-3xl font-black text-green-600">{apuracaoOverview.validos}</p></div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-500">BRANCOS</p><p className="text-3xl font-black text-slate-600">{apuracaoOverview.brancos}</p></div>
              <div className="bg-white p-5 rounded-2xl border shadow-sm"><p className="text-xs font-bold text-slate-500">NULOS</p><p className="text-3xl font-black text-orange-500">{apuracaoOverview.nulos}</p></div>
            </div>

            {reportLoading ? <div className="py-12 text-center text-slate-400 font-bold animate-pulse">Calculando...</div> : apuracaoResults?.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Sem resultados para estes filtros.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {apuracaoResults?.map((result, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center"><h3 className="text-lg font-black uppercase tracking-widest">{result.role}</h3><span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{result.totalVotes} votos</span></div>
                    <div className="p-6 flex-1 space-y-6">
                      {result.candidateResults.map((cand, cIdx) => (
                          <div key={cand.id} className="relative">
                            <div className="flex justify-between items-end mb-1">
                               <p className="font-bold text-slate-800 truncate pr-2">{cIdx === 0 && result.totalVotes > 0 && <CheckCircle2 className="w-4 h-4 text-green-500 inline" />} {cand.name}</p>
                               <p className="font-black text-blue-600 text-lg leading-none">{cand.votes}</p>
                            </div>
                            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex"><div className={`h-full transition-all duration-1000 ${cIdx === 0 && cand.votes > 0 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${cand.percentage}%` }}></div></div>
                          </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: AUDITORIA */}
        {activeTab === "reports" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-3"><Filter className="w-5 h-5 text-blue-600" /> Relatório Geral e Auditoria</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Eleição</label>
                  <select className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold" value={filters.eleicaoId} onChange={e => setFilters({...filters, eleicaoId: e.target.value, turmaId: ""})}>
                    {allEleicoes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                {/* Oculta o filtro de turma se a eleição selecionada for Global na Auditoria também! */}
                {(!filters.eleicaoId || !isFilterEleicaoGlobal) && (
                  <div className="space-y-1 animate-in fade-in"><label className="text-xs font-bold text-slate-500">Turma</label><select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.turmaId} onChange={e => setFilters({...filters, turmaId: e.target.value})}><option value="">Todas as Turmas</option>{allTurmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                )}
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Buscar</label><div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input type="text" placeholder="Nome do Aluno" className="w-full pl-9 p-2.5 border rounded-lg text-sm" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} /></div></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Tipo de Voto</label><select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.voteType} onChange={e => setFilters({...filters, voteType: e.target.value})}><option value="">Todos</option><option value="candidate">Válidos</option><option value="branco">Em Branco</option><option value="nulo">Nulos</option></select></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Listagem de Votos</span><button onClick={() => setShowVotes(!showVotes)} className="text-[10px] font-bold bg-white border px-3 py-1.5 rounded-md hover:bg-slate-100 flex items-center gap-1 shadow-sm transition-colors">{showVotes ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showVotes ? "OCULTAR VOTOS" : "REVELAR VOTOS"}</button></div>
              <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 sticky top-0 shadow-sm z-10"><tr className="text-[10px] text-slate-500 uppercase"><th className="p-4 font-black">Data/Hora</th><th className="p-4 font-black">Eleição</th><th className="p-4 font-black">Turma</th><th className="p-4 font-black">Eleitor</th><th className="p-4 font-black text-center">Voto</th><th className="p-4 font-black text-center">Ação</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedReport.map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-xs text-slate-500">{v.created_at ? new Date(v.created_at).toLocaleString('pt-BR') : '-'}</td>
                        <td className="p-4 font-semibold text-slate-700 text-xs">{getEleicaoNome(v.eleicao_id)}</td>
                        <td className="p-4 font-semibold text-slate-700">{getTurmaName(v.turma_id)}</td>
                        <td className="p-4"><p className="font-bold text-slate-900">{v.voter_name}</p></td>
                        <td className="p-4 text-center">
                          {showVotes ? (
                            <><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">{v.candidate_role || 'Geral'}</span><span className={`font-black ${v.vote_type === 'candidate' ? 'text-blue-600' : 'text-slate-400'}`}>{v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type.toUpperCase()}</span></>
                          ) : (
                            <span className="text-slate-300 italic text-xs flex justify-center items-center gap-1"><Lock className="w-3 h-3" /> Sigilo Ativo</span>
                          )}
                        </td>
                        <td className="p-4 text-center"><button onClick={() => handleDeleteVote(v.id!, v.voter_name)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir voto"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "midias" && <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200"><p className="font-bold text-slate-500">Módulos de Mídias Mantidos no seu ficheiro original (Sem Alterações).</p></div>}
        {activeTab === "eleicoes" && <div className="animate-in fade-in duration-300"><ManageEleicoes /></div>}
        {activeTab === "turmas" && <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300"><ManageTurmas onTurmasChanged={onTurmasChanged} /></div>}
        {activeTab === "admins" && <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300"><ManageAdmins /></div>}
        {activeTab === "perfil" && <div className="animate-in fade-in duration-300"><MeuPerfil escolaNome={escolaNome} /></div>}
      </div>
    </div>
  );
};
export default AdminPanel;
