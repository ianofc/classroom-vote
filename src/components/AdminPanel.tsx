import { useState, useEffect, useMemo } from "react";
import { Turma } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ShieldCheck, FileText, Filter, Search, Calendar, Eye, EyeOff, 
  Lock, Trash2, GraduationCap, Printer, BarChart3, CheckCircle2, User, 
  CheckSquare, Maximize, ActivitySquare, ChevronLeft, ChevronRight, 
  Download, Loader2, Trophy, Flame, Users, Target, 
  Image as ImageIcon, Contact, Database, UserCheck, LogOut, Menu, X
} from "lucide-react";

import ManageTurmas from "./ManageTurmas";
import ManageAdmins from "./ManageAdmins";
import MeuPerfil from "./MeuPerfil";
import ManageEleicoes from "./ManageEleicoes"; 
import ManageCandidatos from "./ManageCandidatos"; 
import { toast } from "@/hooks/use-toast";

import { initMercadoPago } from '@mercadopago/sdk-react';
initMercadoPago('TEST-COLOQUE-SUA-PUBLIC-KEY-AQUI');

interface ExtendedVoteRecord { id?: string; turma_id?: string; eleicao_id?: string; voter_name: string; voter_document?: string; candidate_role: string; candidate_number: number | null; vote_type: "candidate" | "branco" | "nulo"; created_at?: string; }
interface AdminLog { id: string; admin_email: string; acao: string; detalhes: string; created_at: string; }
type Tab = "apuracao" | "reports" | "midias" | "eleicoes" | "turmas" | "candidatos" | "admins" | "perfil" | "logs";
interface AdminPanelProps { turma: Turma | null; onBack: () => void; onTurmasChanged: () => void; }

// ============================================================================
// COMPONENTE DE TOOLTIP CUSTOMIZADO (Para o Dock Flutuante)
// ============================================================================
const DockItem = ({ icon: Icon, label, isActive, onClick }: { icon: any, label: string, isActive: boolean, onClick: () => void }) => (
  <div className="relative group flex items-center justify-center">
    <button
      onClick={onClick}
      className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 ${
        isActive 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-110" 
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      <Icon className={`w-5 h-5 ${isActive ? 'animate-in zoom-in duration-300' : ''}`} />
    </button>
    <div className="absolute left-16 px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-50 hidden md:block">
      {label}
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-y-4 border-y-transparent border-r-4 border-r-slate-900" />
    </div>
  </div>
);

// ESTRUTURA DO MENU
const menuItems: { id: Tab, label: string, icon: React.ElementType, group: string }[] = [
  { id: "apuracao", label: "Dashboard ao Vivo", icon: BarChart3, group: "Resultados" },
  { id: "reports", label: "Auditoria Oficial", icon: FileText, group: "Resultados" },
  { id: "midias", label: "Estúdio de Mídias", icon: ImageIcon, group: "Campanha" },
  { id: "eleicoes", label: "Gestão de Eleições", icon: CheckSquare, group: "Gestão Base" },
  { id: "turmas", label: "Turmas & Alunos", icon: GraduationCap, group: "Gestão Base" },
  { id: "candidatos", label: "Base de Candidatos", icon: UserCheck, group: "Gestão Base" },
  { id: "admins", label: "Administradores", icon: ShieldCheck, group: "Sistema" },
  { id: "logs", label: "Logs do Sistema", icon: ActivitySquare, group: "Sistema" },
  { id: "perfil", label: "Meu Perfil", icon: User, group: "Conta" },
];

const AdminPanel = ({ turma, onBack, onTurmasChanged }: AdminPanelProps) => {
  const [escolaNome, setEscolaNome] = useState("Carregando Escola...");
  const [escolaLogo, setEscolaLogo] = useState<string | null>(null); 
  const [isExpired, setIsExpired] = useState(false); 
  const [validadeStr, setValidadeStr] = useState("");
  
  const [activeTab, setActiveTab] = useState<Tab>("apuracao");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
  const [filters, setFilters] = useState({ search: "", turmaId: turma ? turma.id : "", eleicaoId: "", voteType: "", date: "" });
  const [apuracaoEleicaoId, setApuracaoEleicaoId] = useState("");
  const [apuracaoTurmaId, setApuracaoTurmaId] = useState("");
  const [midiaSearch, setMidiaSearch] = useState("");

  useEffect(() => { document.documentElement.classList.remove('dark'); }, []);

  const fetchAllData = async () => {
    setReportLoading(true);
    const fetchEverything = async (tableName: string) => {
      let allData: any[] = []; let from = 0; const step = 1000; let fetchMore = true;
      while (fetchMore) {
        const { data, error } = await supabase.from(tableName).select('*').range(from, from + step - 1);
        if (error) { toast({ title: "Erro ao buscar dados", description: error.message, variant: "destructive" }); break; }
        if (data && data.length > 0) { allData = [...allData, ...data]; if (data.length < step) fetchMore = false; else from += step; } else { fetchMore = false; }
      }
      return allData;
    };

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: adminData } = await supabase.from('admins').select(`escolas (nome, valid_until, status, logo_url)`).eq('auth_id', userData.user.id).single();
        let escolaData: any = null;
        if (adminData?.escolas) escolaData = Array.isArray(adminData.escolas) ? adminData.escolas[0] : adminData.escolas;
        if (escolaData) {
           setEscolaNome(escolaData.nome || "Escola");
           if (escolaData.logo_url) setEscolaLogo(escolaData.logo_url);
           if (escolaData.valid_until) {
             const dataValidade = new Date(escolaData.valid_until);
             setValidadeStr(dataValidade.toLocaleDateString('pt-BR'));
             if (new Date() > dataValidade || escolaData.status === 'suspended') { setIsExpired(true); setReportLoading(false); return; }
           }
        }
      }

      const [votesData, turmasData, candidatesRes, logsData, eleicoesData, studentsData] = await Promise.all([
        fetchEverything('votes'), fetchEverything('turmas'), supabase.from("students").select("*").eq("is_candidate", true).limit(5000),
        supabase.from("admin_logs").select("*").order('created_at', { ascending: false }).limit(200), fetchEverything('eleicoes'), fetchEverything('students')
      ]);

      const sortedVotes = (votesData as ExtendedVoteRecord[]).sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
      setAllVotes(sortedVotes);
      if (studentsData) setAllStudents(studentsData);
      
      if (turmasData) {
        const sortedTurmas = turmasData.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
        setAllTurmas(sortedTurmas);
        if (!apuracaoTurmaId && sortedTurmas.length > 0) setApuracaoTurmaId(sortedTurmas[0].id);
      }
      
      if (candidatesRes.data) setAllCandidates(candidatesRes.data);
      if (logsData.data) setSystemLogs(logsData.data);
      
      if (eleicoesData) {
        let eleicoesUnicas = eleicoesData.sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        if (sortedVotes.some(v => !v.eleicao_id)) {
          eleicoesUnicas.push({ id: 'legacy', nome: 'Eleições Legadas', tipo: 'turma', cargos: '', status: 'encerrada', created_at: '' });
        }
        setAllEleicoes(eleicoesUnicas);
        if (eleicoesUnicas.length > 0 && !apuracaoEleicaoId) setApuracaoEleicaoId(eleicoesUnicas[0].id);
      }
    } catch (err) { console.error(err); } finally { setReportLoading(false); }
  };

  useEffect(() => { if (["reports", "apuracao", "logs", "midias"].includes(activeTab)) fetchAllData(); }, [activeTab]);

  const getTurmaName = (id?: string) => allTurmas.find(t => t.id === id)?.name || "Desconhecida";
  const getEleicaoNome = (id?: string) => {
      if (!id || id === 'legacy') return "Eleições Legadas";
      return allEleicoes.find(e => e.id === id)?.nome || "Desconhecida";
  };

  const eleicaoSelecionada = allEleicoes.find(e => e.id === apuracaoEleicaoId);
  const isEleicaoGlobal = eleicaoSelecionada?.tipo === 'universal' || eleicaoSelecionada?.tipo === 'geral';

  // LÓGICAS INTELIGENTES DE CÁLCULO
  const estatisticasEscola = useMemo(() => {
    const totalEleitores = allStudents.length;
    const eleitoresQueVotaram = new Set(allVotes.map(v => v.voter_name || "Anônimo")).size; 
    const comparecimento = totalEleitores > 0 ? (eleitoresQueVotaram / totalEleitores) * 100 : 0;
    return { total: totalEleitores, votaram: eleitoresQueVotaram, comparecimento: comparecimento.toFixed(1), abstencao: (totalEleitores > 0 ? 100 - comparecimento : 0).toFixed(1), isHot: comparecimento >= 75 };
  }, [allStudents, allVotes]);

  const rankingTurmas = useMemo(() => {
    const ranking = allTurmas.map(turma => {
      const alunosDaTurma = allStudents.filter(s => s.turma_id === turma.id).length;
      const votosDaTurma = new Set(allVotes.filter(v => v.turma_id === turma.id).map(v => v.voter_name || "Anônimo")).size;
      const engajamento = alunosDaTurma > 0 ? (votosDaTurma / alunosDaTurma) * 100 : 0;
      return { id: turma.id, nome: turma.name || "", alunos: alunosDaTurma, votos: votosDaTurma, engajamento: parseFloat(engajamento.toFixed(1)) };
    });
    return ranking.sort((a, b) => b.engajamento - a.engajamento).filter(t => t.alunos > 0).slice(0, 5);
  }, [allTurmas, allStudents, allVotes]);

  const apuracaoOverview = useMemo(() => {
    if (!apuracaoEleicaoId) return { total: 0, validos: 0, brancos: 0, nulos: 0 };
    const votosFiltrados = allVotes.filter(v => {
      const matchEleicao = (apuracaoEleicaoId === 'legacy' && !v.eleicao_id) || v.eleicao_id === apuracaoEleicaoId;
      if (!matchEleicao) return false;
      if (!isEleicaoGlobal && apuracaoTurmaId && v.turma_id !== apuracaoTurmaId) return false;
      return true;
    });
    return { total: votosFiltrados.length, validos: votosFiltrados.filter(v => v.vote_type === 'candidate').length, brancos: votosFiltrados.filter(v => v.vote_type === 'branco').length, nulos: votosFiltrados.filter(v => v.vote_type === 'nulo').length };
  }, [apuracaoEleicaoId, apuracaoTurmaId, allVotes, isEleicaoGlobal]);

  const apuracaoResults = useMemo(() => {
    if (!apuracaoEleicaoId) return null;
    const votosFiltrados = allVotes.filter(v => {
      const matchEleicao = (apuracaoEleicaoId === 'legacy' && !v.eleicao_id) || v.eleicao_id === apuracaoEleicaoId;
      if (!matchEleicao) return false;
      if (!isEleicaoGlobal && apuracaoTurmaId && v.turma_id !== apuracaoTurmaId) return false;
      return true;
    });

    let candidatosFiltrados = allCandidates.filter(c => {
        if (isEleicaoGlobal) {
            const cargosDaEleicao = (eleicaoSelecionada?.cargos || eleicaoSelecionada?.nome || "").toLowerCase();
            const cargosDoCandidato = (c.candidate_role || "").toLowerCase();
            return cargosDaEleicao.includes(cargosDoCandidato) || cargosDoCandidato.includes(cargosDaEleicao);
        } else {
            return apuracaoTurmaId ? c.turma_id === apuracaoTurmaId : false;
        }
    });

    const roles = Array.from(new Set(candidatosFiltrados.map(c => c.candidate_role ? c.candidate_role.split(',')[0].trim() : "Líder Geral")));
    
    return roles.map(role => {
      const votesForRole = votosFiltrados.filter(v => v.candidate_role === role || (!v.candidate_role && role === "Líder Geral"));
      const totalVotes = votesForRole.length;
      const candidateResults = candidatosFiltrados.filter(c => (c.candidate_role || "").includes(role) || (!c.candidate_role && role === "Líder Geral")).map(c => {
        const vCount = votesForRole.filter(v => v.vote_type === 'candidate' && v.candidate_number === c.candidate_number).length;
        return { ...c, votes: vCount, percentage: totalVotes > 0 ? (vCount / totalVotes) * 100 : 0 };
      }).sort((a, b) => b.votes - a.votes);
      
      const brancos = votesForRole.filter(v => v.vote_type === 'branco').length;
      const nulos = votesForRole.filter(v => v.vote_type === 'nulo').length;
      return { role, totalVotes, candidateResults, brancos: { votes: brancos, percentage: totalVotes > 0 ? (brancos/totalVotes)*100 : 0 }, nulos: { votes: nulos, percentage: totalVotes > 0 ? (nulos/totalVotes)*100 : 0 } };
    });
  }, [apuracaoEleicaoId, apuracaoTurmaId, allVotes, allCandidates, isEleicaoGlobal, eleicaoSelecionada]);

  const filterEleicaoSelecionada = allEleicoes.find(e => e.id === filters.eleicaoId);
  const isFilterEleicaoGlobal = filterEleicaoSelecionada?.tipo === 'universal' || filterEleicaoSelecionada?.tipo === 'geral';

  const filteredReport = useMemo(() => {
    return allVotes.filter(v => {
      const searchString = (filters.search || "").toLowerCase();
      const voterName = (v.voter_name || "").toLowerCase();
      const voterDoc = (v.voter_document || "").toLowerCase();
      const matchSearch = !searchString || voterName.includes(searchString) || voterDoc.includes(searchString);
      const idParaFiltro = !v.eleicao_id ? 'legacy' : v.eleicao_id;
      const matchEleicao = !filters.eleicaoId || idParaFiltro === filters.eleicaoId; 
      const deveAplicarFiltroTurma = filters.turmaId && (!filters.eleicaoId || !isFilterEleicaoGlobal);
      const matchTurma = !deveAplicarFiltroTurma || v.turma_id === filters.turmaId;
      const matchType = !filters.voteType || v.vote_type === filters.voteType;
      const createdAtStr = v.created_at || "";
      const matchDate = !filters.date || createdAtStr.startsWith(filters.date);
      return matchSearch && matchTurma && matchEleicao && matchType && matchDate;
    });
  }, [allVotes, filters, isFilterEleicaoGlobal]);

  const totalPages = Math.ceil(filteredReport.length / itemsPerPage);
  const paginatedReport = filteredReport.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    if (filteredReport.length === 0) { toast({ title: "Atenção", description: "Não há dados para exportar.", variant: "destructive" }); return; }
    let csvContent = "Data/Hora,Eleicao,Turma,Eleitor,Cargo,Voto_Computado\n";
    filteredReport.forEach(v => {
      const data = v.created_at ? new Date(v.created_at).toLocaleString('pt-BR') : '-';
      const eleicao = getEleicaoNome(v.eleicao_id).replace(/,/g, ''); 
      const turma = getTurmaName(v.turma_id).replace(/,/g, '');
      const eleitor = (v.voter_name || 'Desconhecido').replace(/,/g, '');
      const cargo = (v.candidate_role || 'Líder Geral').replace(/,/g, '');
      let voto = !showVotes ? "SIGILO ATIVO" : (v.vote_type === 'candidate' ? `Chapa ${v.candidate_number}` : (v.vote_type || '').toUpperCase());
      csvContent += `${data},${eleicao},${turma},${eleitor},${cargo},${voto}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Auditoria_Votos_${new Date().getTime()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast({ title: "Sucesso", description: "Download concluído!" });
  };

  const downloadSnapshot = async () => {
    try {
      toast({ title: "Iniciando Backup...", description: "Reunindo dados da base." });
      const fetchEverything = async (tableName: string) => {
        let allData: any[] = []; let from = 0; const step = 1000; let fetchMore = true;
        while (fetchMore) {
          const { data, error } = await supabase.from(tableName).select('*').range(from, from + step - 1);
          if (error) throw error;
          if (data && data.length > 0) { allData = [...allData, ...data]; if (data.length < step) fetchMore = false; else from += step; } else fetchMore = false;
        }
        return allData;
      };
      const [vData, tData, sData, eData, lData] = await Promise.all([ fetchEverything('votes'), fetchEverything('turmas'), fetchEverything('students'), fetchEverything('eleicoes'), fetchEverything('admin_logs') ]);
      const snapshot = { app: "Classroom Vote Enterprise", version: "1.0", timestamp: new Date().toISOString(), escola: escolaNome, data: { eleicoes: eData, turmas: tData, students: sData, votes: vData, logs: lData } };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `snapshot_${new Date().getTime()}.json`; link.click();
      toast({ title: "Snapshot Gerado", description: "Backup completo descarregado." });
    } catch(e) { toast({ title: "Erro", description: "Falha ao gerar snapshot.", variant: "destructive" }); }
  };

  const handleDeleteVote = async (id: string, voterName: string) => {
    if (!window.confirm("Atenção! Excluir este voto permanentemente?")) return;
    const { error } = await supabase.from('votes').delete().eq('id', id);
    if (!error) {
      setAllVotes(prev => prev.filter(v => v.id !== id));
      toast({ title: "Sucesso", description: "Voto excluído com sucesso." });
    }
  };

  const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';

  const printDashboardReport = () => {
    setIsPrinting(true);
    const tituloRelatorio = isEleicaoGlobal ? "Apuração Universal da Escola" : `Apuração - Turma: ${escapeHtml(getTurmaName(apuracaoTurmaId))}`;
    const nomeEleicao = escapeHtml(getEleicaoNome(apuracaoEleicaoId));
    let rolesHtml = '';
    if (apuracaoResults && apuracaoResults.length > 0) {
      rolesHtml = apuracaoResults.map(result => {
        let candidatesHtml = result.candidateResults.map((c: any, idx: number) => `<tr><td style="text-align: center; font-weight: bold;">${idx + 1}º</td><td><strong>${escapeHtml(c.name)}</strong> ${c.vice_name ? `<br/><small style="color: #666;">Vice: ${escapeHtml(c.vice_name)}</small>` : ''}</td><td style="text-align: center; font-weight: bold;">Nº ${c.candidate_number}</td><td style="text-align: right;"><strong>${c.votes}</strong> (${c.percentage.toFixed(1)}%)</td></tr>`).join('');
        if (result.candidateResults.length === 0) candidatesHtml = `<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Nenhum candidato registrado para este cargo.</td></tr>`;
        return `<div class="role-section"><h2>Cargo: ${escapeHtml(result.role)}</h2><table><thead><tr><th width="60" style="text-align: center;">Posição</th><th>Candidato / Chapa</th><th width="80" style="text-align: center;">Número</th><th width="120" style="text-align: right;">Votos Computados</th></tr></thead><tbody>${candidatesHtml}</tbody></table><div class="role-summary"><span><strong>Brancos:</strong> ${result.brancos.votes} (${result.brancos.percentage.toFixed(1)}%)</span><span><strong>Nulos:</strong> ${result.nulos.votes} (${result.nulos.percentage.toFixed(1)}%)</span><span><strong>Total do Cargo:</strong> ${result.totalVotes}</span></div></div>`;
      }).join('');
    } else { rolesHtml = `<p style="text-align: center; color: #666; margin-top: 40px;">Nenhum dado de votação encontrado.</p>`; }

    const reportHtml = `<html><head><title>Boletim de Urna - ${nomeEleicao}</title><style>body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; } .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; } h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #202683; } .sub { color: #666; font-size: 14px; margin-top: 5px; font-weight: bold; text-transform: uppercase; } .overview { display: flex; justify-content: space-between; background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e4e4e7; } .overview div { text-align: center; width: 25%; border-right: 1px solid #ddd; } .overview div:last-child { border-right: none; } .overview strong { display: block; font-size: 24px; color: #111; margin-top: 8px; } .overview span { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; letter-spacing: 1px; } .role-section { margin-bottom: 40px; page-break-inside: avoid; } .role-section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; background: #202683; color: #fff; padding: 12px 15px; margin: 0; border-top-left-radius: 6px; border-top-right-radius: 6px; } table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 13px; } th, td { border: 1px solid #ccc; padding: 12px; text-align: left; } th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #555; } .role-summary { display: flex; justify-content: flex-end; gap: 20px; font-size: 12px; padding: 12px 15px; background: #f8f9fa; border: 1px solid #ccc; border-top: none; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; } .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; line-height: 1.6; } .creditos { margin-top: 15px; font-weight: bold; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; } @media print { @page { margin: 1.5cm; size: A4 portrait; } button { display: none; } }</style></head><body><div class="cabecalho"><h1>${escapeHtml(escolaNome)}</h1><div class="sub">Boletim Oficial de Apuração</div><h3 style="margin-top: 15px; font-size: 18px; color: #333;">${tituloRelatorio}</h3><p style="margin:5px 0 0 0; color:#666;">Eleição: ${nomeEleicao}</p></div><div class="overview"><div><span>Votos Computados</span><strong>${apuracaoOverview.total}</strong></div><div><span>Votos Válidos</span><strong style="color: #16a34a;">${apuracaoOverview.validos}</strong></div><div><span>Brancos</span><strong>${apuracaoOverview.brancos}</strong></div><div><span>Nulos</span><strong style="color: #ea580c;">${apuracaoOverview.nulos}</strong></div></div>${rolesHtml}<div class="rodape">Gerado eletronicamente em ${new Date().toLocaleString('pt-BR')}<div class="creditos">Classroom Vote Enterprise</div></div><script>window.onload = function() { window.print(); }</script></body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(reportHtml); printWindow.document.close(); setTimeout(() => { setIsPrinting(false); }, 1000); }
  };

  const printFilteredReport = () => {
    setIsPrinting(true);
    const rows = filteredReport.map(v => `<tr><td>${v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '-'}</td><td>${escapeHtml(getEleicaoNome(v.eleicao_id))}</td><td>${escapeHtml(getTurmaName(v.turma_id))}</td><td><strong>${escapeHtml(v.voter_name)}</strong></td><td style="text-align: center; font-weight: bold;">${v.candidate_role ? `[${v.candidate_role}]<br/>` : ''}${v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : (v.vote_type || '').toUpperCase()}</td></tr>`).join("");
    const reportHtml = `<html><head><title>Auditoria de Votação - ${escapeHtml(escolaNome)}</title><style>body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; } .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; } h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #202683; } .sub { color: #666; font-size: 14px; margin-top: 5px; } .filters { background: #f4f4f5; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; border: 1px solid #e4e4e7; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; } th, td { border: 1px solid #ccc; padding: 10px; text-align: left; } th { background-color: #e4e4e7; font-weight: bold; text-transform: uppercase; font-size: 11px; } .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; line-height: 1.6; } .creditos { margin-top: 15px; font-weight: bold; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; } @media print { @page { margin: 1cm; size: A4 portrait; } button { display: none; } }</style></head><body><div class="cabecalho"><h1>${escapeHtml(escolaNome)}</h1><div class="sub">Relatório Oficial de Auditoria Cadastral</div></div><div class="filters"><strong>Filtros aplicados na pesquisa:</strong><br/>Eleição: ${filters.eleicaoId ? getEleicaoNome(filters.eleicaoId) : 'Todas'} | Turma: ${filters.turmaId ? getTurmaName(filters.turmaId) : 'Todas'} | Tipo: ${filters.voteType ? (filters.voteType || '').toUpperCase() : 'Todos'} | Data: ${filters.date ? new Date(filters.date).toLocaleDateString('pt-BR') : 'Todas'} <br/> Busca por nome: ${filters.search || 'Nenhuma'}</div><p><strong>Total de votos encontrados: ${filteredReport.length}</strong></p><table><thead><tr><th>Data/Hora</th><th>Eleição</th><th>Turma</th><th>Eleitor</th><th>Voto Registrado</th></tr></thead><tbody>${rows}</tbody></table><div class="rodape">Gerado eletronicamente em ${new Date().toLocaleString('pt-BR')}<div class="creditos">Classroom Vote Enterprise</div></div><script>window.onload = function() { window.print(); }</script></body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(reportHtml); printWindow.document.close(); setTimeout(() => { setIsPrinting(false); }, 1000); }
  };

  const generateCardHTML = (candidate: any, isBadge: boolean) => {
    const primaryRole = candidate.candidate_role ? escapeHtml(candidate.candidate_role.split(',')[0].trim()) : "Candidato";
    return `<div class="card ${isBadge ? 'badge-card' : 'santinho-card'}">${isBadge ? '<div class="hole-punch"></div>' : ''}<div class="header">${escolaLogo ? `<img src="${escolaLogo}" />` : `<span style="color:#fff; font-size: ${isBadge?'16px':'12px'};">🏛️</span>`}<span class="school-name">${escapeHtml(escolaNome)}</span></div>${isBadge ? '<div class="photo-area">3x4 FOTO</div>' : ''}<div class="info-area"><h1 class="name">${escapeHtml(candidate.name || "Sem Nome")}</h1><h2 class="role">${primaryRole}</h2><div class="details"><span>Turma: ${escapeHtml(getTurmaName(candidate.turma_id))}</span>${!isBadge && candidate.vice_name ? `<span>Vice: ${escapeHtml(candidate.vice_name)}</span>` : ''}${isBadge ? `<span>Ano Letivo: ${new Date().getFullYear()}</span>` : ''}</div><div class="number-badge">${!isBadge ? '<span class="vote-label">VOTE</span>' : ''}${candidate.candidate_number || ""}</div></div></div>`;
  };

  const printDocs = (candidates: any[], isBadge: boolean) => {
    setIsPrinting(true);
    const qtyPerPage = isBadge ? 4 : 8; 
    const itemsToPrint = candidates.length === 1 ? Array(qtyPerPage).fill(candidates[0]) : candidates;
    const pages = [];
    for (let i = 0; i < itemsToPrint.length; i += qtyPerPage) {
      const chunk = itemsToPrint.slice(i, i + qtyPerPage);
      const cardsHtml = chunk.map(c => generateCardHTML(c, isBadge)).join('');
      pages.push(`<div class="page">${cardsHtml}</div>`);
    }
    const html = `<html><head><title>Impressão Ecológica</title><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap'); @page { size: A4 ${isBadge ? 'portrait' : 'landscape'}; margin: ${isBadge ? '5mm' : '6mm'}; } body { margin:0; padding:0; font-family:'Inter',sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .page { display: grid; justify-content: center; align-content: center; width: 100%; height: 100vh; page-break-after: always; ${isBadge ? 'grid-template-columns: repeat(2, 100mm); grid-template-rows: repeat(2, 140mm); gap: 4mm;' : 'grid-template-columns: repeat(4, 70mm); grid-template-rows: repeat(2, 100mm); gap: 2mm;'} } .card { border-radius: 8px; border: 1px dashed #cbd5e1; position: relative; display: flex; flex-direction: column; overflow: hidden; align-items: center; } .badge-card { background: white; width: 100mm; height: 140mm; } .santinho-card { background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); width: 70mm; height: 100mm; } .santinho-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #fbbf24, #f59e0b); } .hole-punch { width: 15mm; height: 4mm; border-radius: 6px; border: 1px solid #cbd5e1; position: absolute; top: 5mm; background: #f8fafc; z-index: 10; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); } .header { width: 100%; position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; } .badge-card .header { height: 35mm; background: linear-gradient(135deg, #1e3a8a, #0f172a); justify-content: flex-end; padding-bottom: 4mm; } .santinho-card .header { padding: 6px; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.05); } .badge-card .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2mm; background: #fbbf24; } .header img { max-width: 100%; max-height: 100%; object-fit: contain; } .badge-card img { height: 10mm; margin-bottom: 1mm; } .santinho-card img { height: 25px; margin-bottom: 2px; } .school-name { font-weight: 900; text-transform: uppercase; } .badge-card .school-name { color: #f8fafc; font-size: 10px; letter-spacing: 1.5px; margin-top: 2mm; padding: 0 5mm; } .santinho-card .school-name { color: #94a3b8; font-size: 6px; letter-spacing: 1px; margin-bottom: 1px; } .photo-area { border: 2px dashed #cbd5e1; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: bold; text-transform: uppercase; width: 35mm; height: 45mm; margin-top: 8mm; border-radius: 8px; font-size: 10px; } .info-area { text-align: center; flex: 1; display:flex; flex-direction:column; } .badge-card .info-area { margin-top: 4mm; padding: 0 6mm; width: 100%; box-sizing: border-box; } .santinho-card .info-area { padding: 8px; justify-content:center; } .name { font-weight: 900; text-transform: uppercase; margin: 0; line-height: 1.1; letter-spacing: -0.5px; } .badge-card .name { color: #0f172a; font-size: 20px; } .santinho-card .name { color: #f8fafc; font-size: 14px; } .role { font-weight: 900; text-transform: uppercase; line-height: 1; } .badge-card .role { color: #1e3a8a; font-size: 14px; margin: 2mm 0 4mm 0; } .santinho-card .role { color: #f8fafc; font-size: 11px; margin: 0; } .details { font-weight: bold; display: flex; flex-direction: column; } .badge-card .details { color: #64748b; font-size: 10px; gap: 2px; margin-bottom: 2mm; } .santinho-card .details { color: #fbbf24; font-size: 7px; background: rgba(251,191,36,0.1); padding: 2px 6px; border-radius: 10px; margin-top: 6px; } .number-badge { font-weight: 900; line-height: 1; text-align:center; } .badge-card .number-badge { background: #0f172a; color: #fbbf24; display: inline-block; padding: 2mm 8mm; border-radius: 8px; font-size: 28px; margin-top: auto; margin-bottom: 8mm; } .santinho-card .number-badge { background: rgba(0,0,0,0.3); color: #ffffff; border: 1.5px solid #fbbf24; border-radius: 8px; display: inline-block; padding: 4px 15px; margin: 0 auto 6px auto; font-size: 28px; } .vote-label { font-size: 6px; color: #fbbf24; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 1px; } </style></head><body>${pages.join('')}<script>window.onload=()=>window.print()</script></body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); setTimeout(() => setIsPrinting(false), 1000); }
  };

  const handleRevokeCandidate = async (id: string, name: string) => {
    if (!confirm(`O candidato ${name} desistiu da eleição ou seus cargos estão incorretos?\nIsto removerá a candidatura permanentemente.`)) return;
    const { error } = await supabase.from('students').update({ is_candidate: false, candidate_role: null, candidate_number: null }).eq('id', id);
    if (!error) {
      setAllCandidates(prev => prev.filter(c => c.id !== id));
      toast({ title: "Candidatura Removida", description: "O aluno já não aparecerá nas urnas." });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "apuracao":
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 md:p-8 rounded-3xl shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-8 border border-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="flex-1 w-full z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${estatisticasEscola.isHot ? 'bg-orange-500 text-white animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-blue-500 text-white'}`}><Flame className="w-5 h-5" /></div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-slate-100">Termômetro da Democracia</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Eleitorado</p><p className="text-3xl font-black text-white">{estatisticasEscola.total}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Votaram</p><p className="text-3xl font-black text-green-400">{estatisticasEscola.votaram}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Comparecimento</p><p className="text-3xl font-black text-blue-400">{estatisticasEscola.comparecimento}%</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Abstenção Atual</p><p className="text-3xl font-black text-red-400">{estatisticasEscola.abstencao}%</p></div>
                </div>
              </div>
              <div className="w-full md:w-80 bg-white/10 backdrop-blur-sm p-5 rounded-2xl z-10 flex flex-col border border-white/10">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2"><Trophy className="w-5 h-5 text-yellow-500" /><h3 className="text-sm font-black uppercase tracking-widest text-slate-100">Top 5 Turmas</h3></div>
                <div className="space-y-3">
                  {rankingTurmas.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Aguardando votos...</p> : rankingTurmas.map((turma, index) => (
                      <div key={turma.id} className="flex justify-between group"><p className="text-sm font-bold text-slate-200">{index + 1}º {turma.nome}</p><p className="text-sm font-black text-white">{turma.engajamento}%</p></div>
                    ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-end gap-4 mt-8">
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
              <div className="py-12 text-center text-slate-400 border-2 border-dashed rounded-3xl mt-8">Sem resultados para estes filtros.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {apuracaoResults?.map((result, idx) => (
                  <div key={idx} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="bg-slate-800 text-white p-5 flex justify-between items-center"><h3 className="text-lg font-black uppercase tracking-widest">{result.role}</h3><span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{result.totalVotes} votos</span></div>
                    <div className="p-6 flex-1 space-y-6">
                      {result.candidateResults.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Nenhum candidato.</p> : result.candidateResults.map((cand, cIdx) => (
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
        );

      case "midias":
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><ImageIcon className="w-6 h-6 text-blue-600" /> Estúdio de Campanhas</h2>
                <p className="text-sm text-slate-500 font-medium">Imprima crachás e santinhos em lotes de folha A4.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <button onClick={() => printDocs(allCandidates.filter(c => c.name.toLowerCase().includes(midiaSearch.toLowerCase())), false)} disabled={isPrinting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                  <FileText className="w-4 h-4"/> Imprimir Todos os Santinhos
                </button>
                <button onClick={() => printDocs(allCandidates.filter(c => c.name.toLowerCase().includes(midiaSearch.toLowerCase())), true)} disabled={isPrinting} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                  <Contact className="w-4 h-4"/> Imprimir Todos os Crachás
                </button>
              </div>
            </div>
            
            <div className="relative mb-6">
              <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
              <input type="text" placeholder="Filtrar candidatos para impressão..." className="w-full pl-11 p-3 border rounded-xl text-sm bg-white outline-none focus:border-blue-500 shadow-sm" value={midiaSearch} onChange={e => setMidiaSearch(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allCandidates.filter(c => c.name.toLowerCase().includes(midiaSearch.toLowerCase())).map(cand => (
                <div key={cand.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-black text-slate-800 leading-tight">{cand.name}</h3>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">Nº {cand.candidate_number} • Turma: {getTurmaName(cand.turma_id)}</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-4 mt-2">
                    <button onClick={() => handleRevokeCandidate(cand.id, cand.name)} className="w-full bg-white border border-red-200 text-red-600 hover:bg-red-50 py-1.5 rounded-md text-[10px] font-bold transition-colors">
                      Revogar Candidatura
                    </button>
                  </div>
                  <div className="mt-auto flex gap-2 pt-3 border-t border-slate-100">
                    <button onClick={() => printDocs([cand], false)} disabled={isPrinting} className="flex-1 bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"><FileText className="w-3 h-3" /> Santinho</button>
                    <button onClick={() => printDocs([cand], true)} disabled={isPrinting} className="flex-1 bg-slate-900 text-white hover:bg-slate-800 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"><Contact className="w-3 h-3" /> Crachá</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "reports":
        return (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-3"><Filter className="w-5 h-5 text-blue-600" /> Relatório Geral e Auditoria</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">Eleição</label>
                  <select className="w-full p-2.5 border rounded-lg text-sm bg-white font-bold" value={filters.eleicaoId} onChange={e => setFilters({...filters, eleicaoId: e.target.value, turmaId: ""})}>
                    <option value="">Todas as Eleições</option>
                    {allEleicoes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                  </select>
                </div>
                {(!filters.eleicaoId || !isFilterEleicaoGlobal) && (
                  <div className="space-y-1 animate-in fade-in">
                    <label className="text-xs font-bold text-slate-500">Turma</label>
                    <select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.turmaId} onChange={e => setFilters({...filters, turmaId: e.target.value})}>
                      <option value="">Todas as Turmas</option>
                      {allTurmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Buscar</label><div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input type="text" placeholder="Nome do Aluno" className="w-full pl-9 p-2.5 border rounded-lg text-sm" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} /></div></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Tipo de Voto</label><select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.voteType} onChange={e => setFilters({...filters, voteType: e.target.value})}><option value="">Todos</option><option value="candidate">Válidos</option><option value="branco">Em Branco</option><option value="nulo">Nulos</option></select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Data</label><div className="relative"><Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input type="date" className="w-full pl-9 p-2.5 border rounded-lg text-sm text-slate-600" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} /></div></div>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t mt-4 gap-4">
                <p className="text-sm text-slate-500 font-medium">Encontrados <strong className="text-blue-600 text-lg">{filteredReport.length}</strong> votos totais.</p>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={exportToCSV} disabled={filteredReport.length === 0} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Download className="w-4 h-4" /> CSV</button>
                  <button onClick={printFilteredReport} disabled={isPrinting || filteredReport.length === 0} className="flex-1 md:flex-none bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> PDF</button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b bg-slate-50 flex justify-between items-center"><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Listagem Paginada</span><button onClick={() => setShowVotes(!showVotes)} className="text-[10px] font-bold bg-white border px-3 py-1.5 rounded-md hover:bg-slate-100 flex items-center gap-1 shadow-sm transition-colors">{showVotes ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showVotes ? "OCULTAR" : "REVELAR"}</button></div>
              <div className="overflow-x-auto min-h-[400px]">
                {reportLoading ? <div className="p-12 text-center text-slate-400 font-bold animate-pulse">A carregar...</div> : paginatedReport.length === 0 ? <div className="p-12 text-center text-slate-400">Nenhum voto encontrado.</div> : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0 shadow-sm z-10"><tr className="text-[10px] text-slate-500 uppercase"><th className="p-4 font-black">Data/Hora</th><th className="p-4 font-black">Eleição</th><th className="p-4 font-black">Turma</th><th className="p-4 font-black">Eleitor</th><th className="p-4 font-black text-center">Voto</th><th className="p-4 font-black text-center">Ação</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedReport.map((v, i) => (
                        <tr key={v.id || i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-xs text-slate-500">{v.created_at ? new Date(v.created_at).toLocaleString('pt-BR') : '-'}</td>
                          <td className="p-4 font-semibold text-slate-700 text-xs">{getEleicaoNome(v.eleicao_id)}</td>
                          <td className="p-4 font-semibold text-slate-700">{getTurmaName(v.turma_id)}</td>
                          <td className="p-4"><p className="font-bold text-slate-900">{v.voter_name || "Desconhecido"}</p></td>
                          <td className="p-4 text-center">
                            {showVotes ? <><span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">{v.candidate_role || 'Geral'}</span><span className={`font-black ${v.vote_type === 'candidate' ? 'text-blue-600' : 'text-slate-400'}`}>{v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type?.toUpperCase() || ''}</span></> : <span className="text-slate-300 italic text-xs flex justify-center items-center gap-1"><Lock className="w-3 h-3" /> Sigilo</span>}
                          </td>
                          <td className="p-4 text-center"><button onClick={() => handleDeleteVote(v.id!, v.voter_name || "Desconhecido")} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalPages > 1 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center"><p className="text-xs text-slate-500 font-bold">Página {currentPage} de {totalPages}</p><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50"><ChevronRight className="w-4 h-4" /></button></div></div>
              )}
            </div>
          </div>
        );

      case "logs":
        return (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl"><ActivitySquare className="w-6 h-6" /></div>
                <div><h2 className="text-xl font-black text-slate-800">Logs de Segurança do Sistema</h2><p className="text-sm text-slate-500 font-medium">Auditoria rigorosa. Registo imutável de quem fez o quê.</p></div>
              </div>
              <button onClick={downloadSnapshot} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">
                <Database className="w-4 h-4" /> Descarregar JSON
              </button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {systemLogs.length === 0 && <p className="text-center text-sm text-slate-400 py-10">Nenhuma ação sensível registada.</p>}
              {systemLogs.map(log => (
                <div key={log.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="md:w-48 text-xs text-slate-400 font-mono font-bold flex-shrink-0">{new Date(log.created_at).toLocaleString('pt-BR')}</div>
                  <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{log.acao}</span><span className="text-xs font-bold text-slate-600">{log.admin_email}</span></div><p className="text-sm font-medium text-slate-800">{log.detalhes}</p></div>
                </div>
              ))}
            </div>
          </div>
        );

      case "candidatos": return <div className="animate-in fade-in duration-300"><ManageCandidatos /></div>;
      case "eleicoes": return <div className="animate-in fade-in duration-300"><ManageEleicoes /></div>;
      case "turmas": return <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300"><ManageTurmas onTurmasChanged={onTurmasChanged} /></div>;
      case "admins": return <div className="animate-in fade-in duration-300"><ManageAdmins /></div>;
      case "perfil": return <div className="animate-in fade-in duration-300"><MeuPerfil escolaNome={escolaNome} /></div>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* HEADER MOBILE */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          {escolaLogo ? <img src={escolaLogo} alt="Logo" className="w-8 h-8 object-contain" /> : <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-white"/></div>}
          <h1 className="font-black text-sm uppercase tracking-widest">{escolaNome}</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 bg-slate-100 rounded-md">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* DOCK FLUTUANTE (Nav Pill) - DESKTOP */}
      <div className="hidden md:flex flex-col h-screen py-6 pl-6 z-50">
        <nav className="bg-white border border-slate-200 shadow-xl rounded-[30px] flex flex-col items-center gap-4 w-[76px] h-full overflow-y-auto custom-scrollbar relative py-6">
          <div className="mb-4">
             {escolaLogo ? (
               <img src={escolaLogo} alt="Logo" className="w-12 h-12 object-contain" />
             ) : (
               <div className="w-12 h-12 bg-blue-600 rounded-[20px] flex items-center justify-center shadow-lg shadow-blue-600/20">
                 <ShieldCheck className="w-6 h-6 text-white"/>
               </div>
             )}
          </div>
          <div className="flex flex-col gap-2 w-full px-3 flex-1 overflow-y-auto scrollbar-hide mt-2">
            {menuItems.map(item => (
              <DockItem key={item.id} icon={item.icon} label={item.label} isActive={activeTab === item.id} onClick={() => setActiveTab(item.id)} />
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-3 items-center pt-6 border-t border-slate-100 w-full">
             <button onClick={() => window.open('/telao', '_blank')} title="Abrir Telão ao Vivo" className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all hover:scale-105 shadow-md">
               <Maximize className="w-5 h-5" />
             </button>
             <button onClick={onBack} title="Sair do Painel" className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
               <LogOut className="w-5 h-5" />
             </button>
          </div>
        </nav>
      </div>

      {/* MENU MOBILE (Drawer) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white flex flex-col overflow-y-auto animate-in slide-in-from-top">
          <div className="p-6 grid grid-cols-2 gap-4">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }} className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${activeTab === item.id ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-slate-50 border-transparent text-slate-600"}`}>
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center">{item.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-auto p-6 flex flex-col gap-3">
             <button onClick={() => window.open('/telao', '_blank')} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-xl font-bold"><Maximize className="w-5 h-5" /> Telão ao Vivo</button>
             <button onClick={onBack} className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 p-4 rounded-xl font-bold"><LogOut className="w-5 h-5" /> Sair</button>
          </div>
        </div>
      )}

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 h-screen overflow-y-auto px-4 py-6 md:p-8">
        <div className="max-w-6xl mx-auto pb-20">
          <div className="mb-6 flex items-center justify-between animate-in fade-in slide-in-from-left-4">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
            <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold uppercase px-3 py-1 rounded-full hidden md:inline-block">
              {menuItems.find(m => m.id === activeTab)?.group}
            </span>
          </div>
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderContent()}
          </div>
        </div>
      </main>

    </div>
  );
};

export default AdminPanel;
