import { useState, useEffect, useMemo } from "react";
import { Turma } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ShieldCheck, FileText, 
  Filter, Search, Calendar, Eye, EyeOff, Lock, Trash2, GraduationCap, Printer, BarChart3, CheckCircle2, AlertTriangle, User, CheckSquare, Maximize, ActivitySquare, ChevronLeft, ChevronRight, Download, Loader2, Trophy, Flame, TrendingUp, Users, Target, Image as ImageIcon, Contact, Database
} from "lucide-react";
import ManageTurmas from "./ManageTurmas";
import ManageAdmins from "./ManageAdmins";
import MeuPerfil from "./MeuPerfil";
import ManageEleicoes from "./ManageEleicoes"; 
import { toast } from "@/hooks/use-toast";

import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';
initMercadoPago('TEST-COLOQUE-SUA-PUBLIC-KEY-AQUI');

interface ExtendedVoteRecord {
  id?: string; turma_id?: string; eleicao_id?: string; voter_name: string;
  candidate_role: string; candidate_number: number | null; vote_type: "candidate" | "branco" | "nulo"; created_at?: string;
}

interface AdminLog { id: string; admin_email: string; acao: string; detalhes: string; created_at: string; }

type Tab = "apuracao" | "reports" | "midias" | "eleicoes" | "turmas" | "admins" | "perfil" | "logs";

interface AdminPanelProps { turma: Turma | null; onBack: () => void; onTurmasChanged: () => void; }

const AdminPanel = ({ turma, onBack, onTurmasChanged }: AdminPanelProps) => {
  const [escolaNome, setEscolaNome] = useState("Carregando Escola...");
  const [escolaLogo, setEscolaLogo] = useState<string | null>(null); 
  const [isExpired, setIsExpired] = useState(false); 
  const [validadeStr, setValidadeStr] = useState("");
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  
  const [showVotes, setShowVotes] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("apuracao");
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [allVotes, setAllVotes] = useState<ExtendedVoteRecord[]>([]);
  const [allTurmas, setAllTurmas] = useState<{id: string, name: string}[]>([]);
  const [allCandidates, setAllCandidates] = useState<any[]>([]); 
  const [allEleicoes, setAllEleicoes] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); 
  const [systemLogs, setSystemLogs] = useState<AdminLog[]>([]); 
  const [reportLoading, setReportLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  const [filters, setFilters] = useState({ search: "", turmaId: turma ? turma.id : "", eleicaoId: "", voteType: "", date: "" });
  
  // FILTROS DE APURAÇÃO INTELIGENTE
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
        if (error) { toast({ title: `Erro a buscar dados`, description: error.message, variant: "destructive" }); break; }
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) fetchMore = false; else from += step;
        } else { fetchMore = false; }
      }
      return allData;
    };

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: adminData } = await supabase.from('admins').select(`escolas (nome, valid_until, status, logo_url)`).eq('auth_id', userData.user.id).single();
        let escolaData = null;
        if (adminData?.escolas && !Array.isArray(adminData.escolas)) escolaData = adminData.escolas as any;
        else if (adminData?.escolas && Array.isArray(adminData.escolas)) escolaData = adminData.escolas[0] as any;

        if (escolaData) {
           setEscolaNome(escolaData.nome);
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

      const sortedVotes = votesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) as ExtendedVoteRecord[];
      setAllVotes(sortedVotes);
      if (studentsData) setAllStudents(studentsData);
      
      if (turmasData) {
        const sortedTurmas = turmasData.sort((a, b) => a.name.localeCompare(b.name));
        setAllTurmas(sortedTurmas);
        if (!apuracaoTurmaId && sortedTurmas.length > 0) setApuracaoTurmaId(sortedTurmas[0].id);
      }
      
      if (candidatesRes.data) setAllCandidates(candidatesRes.data);
      if (logsData.data) setSystemLogs(logsData.data);
      
      if (eleicoesData) {
        let eleicoesUnicas = eleicoesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        // Deteta votos antigos que não têm eleicao_id e adiciona uma categoria "Legacy" para não os perder
        if (sortedVotes.some(v => !v.eleicao_id)) {
            eleicoesUnicas.push({ id: 'legacy', nome: 'Eleições Legadas (Líderes de Sala)', tipo: 'turma' });
        }
        setAllEleicoes(eleicoesUnicas);
        if (eleicoesUnicas.length > 0 && !apuracaoEleicaoId) setApuracaoEleicaoId(eleicoesUnicas[0].id);
      }
    } catch (err) { console.error(err); }
    setReportLoading(false);
  };

  useEffect(() => { if (["reports", "apuracao", "logs", "midias"].includes(activeTab)) fetchAllData(); }, [activeTab]);

  const getTurmaName = (id?: string) => allTurmas.find(t => t.id === id)?.name || "Desconhecida";
  const getEleicaoNome = (id?: string) => {
      if (!id || id === 'legacy') return "Eleições Legadas (Líderes de Sala)";
      return allEleicoes.find(e => e.id === id)?.nome || "Desconhecida";
  }

  // ============================================================================
  // MOTOR DE APURAÇÃO UNIVERSAL E POR TURMA
  // ============================================================================
  const eleicaoSelecionada = allEleicoes.find(e => e.id === apuracaoEleicaoId);
  const isEleicaoGlobal = eleicaoSelecionada?.tipo === 'universal' || eleicaoSelecionada?.tipo === 'geral';

  // Gamificação Global
  const estatisticasEscola = useMemo(() => {
    const totalEleitores = allStudents.length;
    const eleitoresQueVotaram = new Set(allVotes.map(v => v.voter_name)).size; 
    const comparecimento = totalEleitores > 0 ? (eleitoresQueVotaram / totalEleitores) * 100 : 0;
    return { total: totalEleitores, votaram: eleitoresQueVotaram, comparecimento: comparecimento.toFixed(1), abstencao: (totalEleitores > 0 ? 100 - comparecimento : 0).toFixed(1), isHot: comparecimento >= 75 };
  }, [allStudents, allVotes]);

  const rankingTurmas = useMemo(() => {
    const ranking = allTurmas.map(turma => {
      const alunosDaTurma = allStudents.filter(s => s.turma_id === turma.id).length;
      const votosDaTurma = new Set(allVotes.filter(v => v.turma_id === turma.id).map(v => v.voter_name)).size;
      const engajamento = alunosDaTurma > 0 ? (votosDaTurma / alunosDaTurma) * 100 : 0;
      return { id: turma.id, nome: turma.name, alunos: alunosDaTurma, votos: votosDaTurma, engajamento: parseFloat(engajamento.toFixed(1)) };
    });
    return ranking.sort((a, b) => b.engajamento - a.engajamento).filter(t => t.alunos > 0).slice(0, 5);
  }, [allTurmas, allStudents, allVotes]);

  const apuracaoOverview = useMemo(() => {
    if (!apuracaoEleicaoId) return { total: 0, validos: 0, brancos: 0, nulos: 0 };
    
    const votosFiltrados = allVotes.filter(v => {
      const matchEleicao = (apuracaoEleicaoId === 'legacy' && !v.eleicao_id) || v.eleicao_id === apuracaoEleicaoId;
      if (!matchEleicao) return false;
      // Se a eleição não for global e houver turma selecionada, aplica filtro de turma. Senão ignora turma.
      if (!isEleicaoGlobal && apuracaoTurmaId && v.turma_id !== apuracaoTurmaId) return false;
      return true;
    });

    return {
      total: votosFiltrados.length, 
      validos: votosFiltrados.filter(v => v.vote_type === 'candidate').length,
      brancos: votosFiltrados.filter(v => v.vote_type === 'branco').length, 
      nulos: votosFiltrados.filter(v => v.vote_type === 'nulo').length
    };
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
            const cargosDaEleicao = eleicaoSelecionada?.cargos ? eleicaoSelecionada.cargos.toLowerCase() : eleicaoSelecionada?.nome.toLowerCase();
            const cargosDoCandidato = c.candidate_role ? c.candidate_role.toLowerCase() : "";
            return cargosDaEleicao?.includes(cargosDoCandidato) || cargosDoCandidato.includes(cargosDaEleicao);
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
      
      const brancos = votesForRole.filter(v => v.vote_type === 'branco').length;
      const nulos = votesForRole.filter(v => v.vote_type === 'nulo').length;
      
      return {
        role, totalVotes, candidateResults,
        brancos: { votes: brancos, percentage: totalVotes > 0 ? (brancos/totalVotes)*100 : 0 },
        nulos: { votes: nulos, percentage: totalVotes > 0 ? (nulos/totalVotes)*100 : 0 }
      };
    });
  }, [apuracaoEleicaoId, apuracaoTurmaId, allVotes, allCandidates, isEleicaoGlobal, eleicaoSelecionada]);

  // ========================================================================
  // FILTROS E EXPORTAÇÕES (AUDITORIA E SNAPSHOT)
  // ========================================================================
  const filteredReport = useMemo(() => {
    return allVotes.filter(v => {
      const s = filters.search.toLowerCase();
      const matchSearch = !s || v.voter_name.toLowerCase().includes(s) || (v.voter_document && v.voter_document.includes(s));
      const matchTurma = !filters.turmaId || v.turma_id === filters.turmaId;
      const idParaFiltro = !v.eleicao_id ? 'legacy' : v.eleicao_id;
      const matchEleicao = !filters.eleicaoId || idParaFiltro === filters.eleicaoId; 
      const matchType = !filters.voteType || v.vote_type === filters.voteType;
      const matchDate = !filters.date || (v.created_at && v.created_at.startsWith(filters.date));
      return matchSearch && matchTurma && matchEleicao && matchType && matchDate;
    });
  }, [allVotes, filters]);

  const totalPages = Math.ceil(filteredReport.length / itemsPerPage);
  const paginatedReport = filteredReport.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const exportToCSV = () => {
    if (filteredReport.length === 0) { toast({ title: "Atenção", description: "Não há dados para exportar.", variant: "destructive" }); return; }
    let csvContent = "Data/Hora,Eleicao,Turma,Eleitor,Cargo,Voto_Computado\n";
    filteredReport.forEach(v => {
      const data = v.created_at ? new Date(v.created_at).toLocaleString('pt-BR') : '-';
      const eleicao = getEleicaoNome(v.eleicao_id).replace(/,/g, ''); 
      const turma = getTurmaName(v.turma_id).replace(/,/g, '');
      const eleitor = v.voter_name.replace(/,/g, '');
      const cargo = v.candidate_role || 'Líder Geral';
      let voto = "";
      if (!showVotes) voto = "SIGILO ATIVO";
      else voto = v.vote_type === 'candidate' ? `Chapa ${v.candidate_number}` : v.vote_type.toUpperCase();
      csvContent += `${data},${eleicao},${turma},${eleitor},${cargo},${voto}\n`;
    });
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.setAttribute("href", url); link.setAttribute("download", `Auditoria_Votos_${new Date().getTime()}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    toast({ title: "Sucesso", description: "Download do arquivo Excel concluído!" });
  };

  const downloadSnapshot = async () => {
    try {
      const fetchEverything = async (tableName: string) => {
        let allData: any[] = []; let from = 0; const step = 1000; let fetchMore = true;
        while (fetchMore) {
          const { data, error } = await supabase.from(tableName).select('*').range(from, from + step - 1);
          if (error) throw error;
          if (data && data.length > 0) { allData = [...allData, ...data]; if (data.length < step) fetchMore = false; else from += step; } else fetchMore = false;
        }
        return allData;
      };
      toast({ title: "Iniciando Backup...", description: "Reunindo dados da base." });
      const [vData, tData, sData, eData, lData] = await Promise.all([ fetchEverything('votes'), fetchEverything('turmas'), fetchEverything('students'), fetchEverything('eleicoes'), fetchEverything('admin_logs') ]);
      const snapshot = {
        app: "Classroom Vote Enterprise", version: "1.0", timestamp: new Date().toISOString(), escola: escolaNome,
        data: { eleicoes: eData, turmas: tData, students: sData, votes: vData, logs: lData }
      };
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `snapshot_seguranca_${escolaNome.replace(/\s+/g, '_')}_${new Date().getTime()}.json`;
      link.click();
      toast({ title: "Snapshot Gerado", description: "Backup completo descarregado para a sua máquina." });
      
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email) await supabase.from('admin_logs').insert({ admin_email: userData.user.email, acao: "BACKUP", detalhes: "Foi gerado um Snapshot JSON da Base de Dados inteira." });
    } catch(e) {
      toast({ title: "Erro no Snapshot", description: "Falha na comunicação com o servidor.", variant: "destructive" });
    }
  };

  const handleDeleteVote = async (id: string, voterName: string) => {
    if (!confirm("Atenção! Excluir este voto permanentemente?")) return;
    const { error } = await supabase.from('votes').delete().eq('id', id);
    if (!error) {
      setAllVotes(allVotes.filter(v => v.id !== id));
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email) await supabase.from('admin_logs').insert({ admin_email: userData.user.email, acao: "EXCLUSÃO DE VOTO", detalhes: `Voto de ${voterName} deletado da auditoria.` });
      toast({ title: "Sucesso", description: "Voto excluído com sucesso." });
    }
  };

  // ========================================================================
  // IMPRESSÕES DE PDF (DASHBOARD, REPORTS E MÍDIAS)
  // ========================================================================
  const printDashboardReport = () => {
    setIsPrinting(true);
    const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';
    const tituloRelatorio = isEleicaoGlobal ? "Apuração Universal da Escola" : `Apuração - Turma: ${escapeHtml(getTurmaName(apuracaoTurmaId))}`;
    const nomeEleicao = escapeHtml(getEleicaoNome(apuracaoEleicaoId));
    const nomeDaEscolaSeguro = escapeHtml(escolaNome);

    let rolesHtml = '';
    if (apuracaoResults && apuracaoResults.length > 0) {
      rolesHtml = apuracaoResults.map(result => {
        let candidatesHtml = result.candidateResults.map((c: any, idx: number) => `
          <tr><td style="text-align: center; font-weight: bold;">${idx + 1}º</td><td><strong>${escapeHtml(c.name)}</strong> ${c.vice_name ? `<br/><small style="color: #666;">Vice: ${escapeHtml(c.vice_name)}</small>` : ''}</td><td style="text-align: center; font-weight: bold;">Nº ${c.candidate_number}</td><td style="text-align: right;"><strong>${c.votes}</strong> (${c.percentage.toFixed(1)}%)</td></tr>
        `).join('');
        if (result.candidateResults.length === 0) candidatesHtml = `<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Nenhum candidato registrado para este cargo.</td></tr>`;
        return `
          <div class="role-section"><h2>Cargo: ${escapeHtml(result.role)}</h2><table><thead><tr><th width="60" style="text-align: center;">Posição</th><th>Candidato / Chapa</th><th width="80" style="text-align: center;">Número</th><th width="120" style="text-align: right;">Votos Computados</th></tr></thead><tbody>${candidatesHtml}</tbody></table>
            <div class="role-summary"><span><strong>Brancos:</strong> ${result.brancos.votes} (${result.brancos.percentage.toFixed(1)}%)</span><span><strong>Nulos:</strong> ${result.nulos.votes} (${result.nulos.percentage.toFixed(1)}%)</span><span><strong>Total do Cargo:</strong> ${result.totalVotes}</span></div>
          </div>
        `;
      }).join('');
    } else rolesHtml = `<p style="text-align: center; color: #666; margin-top: 40px;">Nenhum dado de votação encontrado.</p>`;

    const reportHtml = `
      <html><head><title>Boletim de Urna - ${nomeEleicao}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; } .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; } h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #202683; } .sub { color: #666; font-size: 14px; margin-top: 5px; font-weight: bold; text-transform: uppercase; } .overview { display: flex; justify-content: space-between; background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e4e4e7; } .overview div { text-align: center; width: 25%; border-right: 1px solid #ddd; } .overview div:last-child { border-right: none; } .overview strong { display: block; font-size: 24px; color: #111; margin-top: 8px; } .overview span { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; letter-spacing: 1px; } .role-section { margin-bottom: 40px; page-break-inside: avoid; } .role-section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; background: #202683; color: #fff; padding: 12px 15px; margin: 0; border-top-left-radius: 6px; border-top-right-radius: 6px; } table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 13px; } th, td { border: 1px solid #ccc; padding: 12px; text-align: left; } th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #555; } .role-summary { display: flex; justify-content: flex-end; gap: 20px; font-size: 12px; padding: 12px 15px; background: #f8f9fa; border: 1px solid #ccc; border-top: none; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; } .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; line-height: 1.6; } .creditos { margin-top: 15px; font-weight: bold; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; } @media print { @page { margin: 1.5cm; size: A4 portrait; } button { display: none; } }
          </style>
        </head><body>
          <div class="cabecalho"><h1>${nomeDaEscolaSeguro}</h1><div class="sub">Boletim Oficial de Apuração</div><h3 style="margin-top: 15px; font-size: 18px; color: #333;">${tituloRelatorio}</h3><p style="margin:5px 0 0 0; color:#666;">Eleição: ${nomeEleicao}</p></div>
          <div class="overview"><div><span>Votos Computados</span><strong>${apuracaoOverview.total}</strong></div><div><span>Votos Válidos</span><strong style="color: #16a34a;">${apuracaoOverview.validos}</strong></div><div><span>Brancos</span><strong>${apuracaoOverview.brancos}</strong></div><div><span>Nulos</span><strong style="color: #ea580c;">${apuracaoOverview.nulos}</strong></div></div>
          ${rolesHtml}
          <div class="rodape">Documento gerado eletronicamente em ${new Date().toLocaleString('pt-BR')}<div class="creditos">Sistema Desenvolvido por Ian Santos</div></div>
          <script>window.onload = function() { window.print(); }</script>
        </body></html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(reportHtml); printWindow.document.close(); setTimeout(() => { setIsPrinting(false); }, 1000); }
  };

  const printFilteredReport = () => {
    setIsPrinting(true);
    const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';
    const nomeDaEscolaSeguro = escapeHtml(escolaNome);

    const rows = filteredReport.map(v => `
      <tr><td>${v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '-'}</td><td>${escapeHtml(getEleicaoNome(v.eleicao_id))}</td><td>${escapeHtml(getTurmaName(v.turma_id))}</td><td><strong>${escapeHtml(v.voter_name)}</strong></td><td style="text-align: center; font-weight: bold;">${v.candidate_role ? `[${v.candidate_role}]<br/>` : ''}${v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type.toUpperCase()}</td></tr>
    `).join("");

    const reportHtml = `
      <html><head><title>Auditoria de Votação - ${nomeDaEscolaSeguro}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; } .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; } h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #202683; } .sub { color: #666; font-size: 14px; margin-top: 5px; } .filters { background: #f4f4f5; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; border: 1px solid #e4e4e7; } table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; } th, td { border: 1px solid #ccc; padding: 10px; text-align: left; } th { background-color: #e4e4e7; font-weight: bold; text-transform: uppercase; font-size: 11px; } .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; line-height: 1.6; } .creditos { margin-top: 15px; font-weight: bold; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; } @media print { @page { margin: 1cm; size: A4 portrait; } button { display: none; } }
          </style>
        </head><body>
          <div class="cabecalho"><h1>${nomeDaEscolaSeguro}</h1><div class="sub">Relatório Oficial de Auditoria Cadastral</div></div>
          <div class="filters"><strong>Filtros aplicados na pesquisa:</strong><br/>Eleição: ${filters.eleicaoId ? getEleicaoNome(filters.eleicaoId) : 'Todas'} | Turma: ${filters.turmaId ? getTurmaName(filters.turmaId) : 'Todas'} | Tipo: ${filters.voteType ? filters.voteType.toUpperCase() : 'Todos'} | Data: ${filters.date ? new Date(filters.date).toLocaleDateString('pt-BR') : 'Todas'} <br/> Busca por nome: ${filters.search || 'Nenhuma'}</div>
          <p><strong>Total de votos encontrados: ${filteredReport.length}</strong></p>
          <table><thead><tr><th>Data/Hora</th><th>Eleição</th><th>Turma</th><th>Eleitor</th><th>Voto Registrado</th></tr></thead><tbody>${rows}</tbody></table>
          <div class="rodape">Documento gerado eletronicamente em ${new Date().toLocaleString('pt-BR')}<div class="creditos">Sistema Desenvolvido por Ian Santos</div></div>
          <script>window.onload = function() { window.print(); }</script>
        </body></html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(reportHtml); printWindow.document.close(); setTimeout(() => { setIsPrinting(false); }, 1000); }
  };

  const printCandidateCard = (candidate: any) => {
    setIsPrinting(true);
    const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';
    const primaryRole = candidate.candidate_role ? escapeHtml(candidate.candidate_role.split(',')[0].trim()) : "Candidato";
    
    const cardHtml = `
      <html>
        <head>
          <title>Santinho - ${escapeHtml(candidate.name)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #0f172a; }
            .card { width: 380px; background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #334155; position: relative; }
            .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #fbbf24, #f59e0b); }
            .header { padding: 30px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
            .logo-placeholder { width: 60px; height: 60px; border-radius: 12px; background: rgba(255,255,255,0.1); margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .logo-placeholder img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .school { font-size: 11px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #94a3b8; margin-bottom: 5px; }
            .role { font-size: 24px; font-weight: 900; text-transform: uppercase; color: #f8fafc; margin: 0; line-height: 1.1; }
            .turma { font-size: 11px; font-weight: bold; color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); background: rgba(251,191,36,0.1); display: inline-block; padding: 6px 16px; border-radius: 20px; margin-top: 15px; letter-spacing: 1px;}
            .body { padding: 40px 30px; text-align: center; }
            .number-box { background: rgba(0,0,0,0.3); border: 2px solid #fbbf24; border-radius: 16px; display: inline-block; padding: 15px 40px; margin-bottom: 25px; box-shadow: 0 0 20px rgba(251,191,36,0.1); }
            .number-label { font-size: 10px; color: #fbbf24; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; display: block; margin-bottom: 5px; }
            .number { font-size: 64px; font-weight: 900; color: #ffffff; margin: 0; line-height: 1; text-shadow: 0 4px 10px rgba(0,0,0,0.5); }
            .name { font-size: 28px; font-weight: 900; color: #f8fafc; text-transform: uppercase; margin: 0 0 5px 0; line-height: 1.2; letter-spacing: -0.5px; }
            .vice { font-size: 13px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
            .footer { background: #020617; color: #475569; text-align: center; padding: 20px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <div class="logo-placeholder">
                 ${escolaLogo ? `<img src="${escolaLogo}" />` : `<span style="color:#fff; font-size: 24px;">🏛️</span>`}
              </div>
              <div class="school">${escapeHtml(escolaNome)}</div>
              <h1 class="role">${primaryRole}</h1>
              <div class="turma">Turma: ${escapeHtml(getTurmaName(candidate.turma_id))}</div>
            </div>
            <div class="body">
              <div class="number-box"><span class="number-label">Vote Certo</span><p class="number">${candidate.candidate_number}</p></div>
              <h2 class="name">${escapeHtml(candidate.name)}</h2>
              ${candidate.vice_name ? `<p class="vice">Vice: ${escapeHtml(candidate.vice_name)}</p>` : ''}
            </div>
            <div class="footer">Sistema Oficial de Votação</div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=500,height=700");
    if (printWindow) { printWindow.document.write(cardHtml); printWindow.document.close(); setTimeout(() => { setIsPrinting(false); }, 1000); }
  };

  const printBadge = (candidate: any) => {
    setIsPrinting(true);
    const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';
    const primaryRole = candidate.candidate_role ? escapeHtml(candidate.candidate_role.split(',')[0].trim()) : "Candidato";
    
    const badgeHtml = `
      <html>
        <head>
          <title>Crachá Oficial - ${escapeHtml(candidate.name)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #e2e8f0; }
            .badge { width: 54mm; height: 86mm; background: white; border-radius: 12px; box-sizing: border-box; border: 1px solid #cbd5e1; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
            .hole-punch { width: 14mm; height: 3mm; border-radius: 5px; border: 1px solid #cbd5e1; position: absolute; top: 4mm; background: #f8fafc; z-index: 10; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
            .header { width: 100%; height: 28mm; background: linear-gradient(135deg, #1e3a8a, #0f172a); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 3mm; }
            .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1.5mm; background: #fbbf24; }
            .school-name { color: #f8fafc; font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-top: 5mm; padding: 0 5mm; }
            .photo-area { width: 28mm; height: 35mm; border: 2px solid #cbd5e1; background: #f1f5f9; margin-top: 4mm; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 8px; font-weight: bold; text-transform: uppercase; }
            .info-area { text-align: center; margin-top: 2mm; padding: 0 4mm; width: 100%; box-sizing: border-box; flex-1; }
            .name { font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1; margin: 0; letter-spacing: -0.5px;}
            .role { font-size: 9px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin: 1mm 0 2mm 0; }
            .details { font-size: 7px; color: #64748b; font-weight: bold; margin-bottom: 2mm; display: flex; flex-direction: column; gap: 1px;}
            .number-badge { margin-top: auto; background: #0f172a; color: #fbbf24; display: inline-block; padding: 1.5mm 5mm; border-radius: 6px; font-size: 18px; font-weight: 900; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 4mm;}
            @media print { body { background: white; } .badge { box-shadow: none; border: 1px dashed #ccc; } .hole-punch { border: 1px dashed #999; } }
          </style>
        </head>
        <body>
          <div class="badge">
            <div class="hole-punch"></div>
            <div class="header">
              ${escolaLogo ? `<img src="${escolaLogo}" style="height:8mm; margin-bottom:1mm; object-fit:contain;" />` : ''}
              <span class="school-name">${escapeHtml(escolaNome)}</span>
            </div>
            <div class="photo-area">3x4 FOTO</div>
            <div class="info-area">
              <h1 class="name">${escapeHtml(candidate.name)}</h1>
              <h2 class="role">${primaryRole}</h2>
              <div class="details">
                <span>Turma: ${escapeHtml(getTurmaName(candidate.turma_id))}</span>
                <span>Ano Letivo: ${new Date().getFullYear()}</span>
              </div>
              <div class="number-badge">${candidate.candidate_number}</div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (printWindow) { printWindow.document.write(badgeHtml); printWindow.document.close(); setTimeout(() => { setIsPrinting(false); }, 1000); }
  };

  const gerarCobrancaMercadoPago = async () => { /* Mantido */ };

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
        {(["apuracao", "midias", "reports", "eleicoes", "turmas", "admins", "logs", "perfil"] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}>
            {tab === "apuracao" && <BarChart3 className="w-4 h-4" />}
            {tab === "midias" && <ImageIcon className="w-4 h-4" />}
            {tab === "reports" && <FileText className="w-4 h-4" />}
            {tab === "eleicoes" && <CheckSquare className="w-4 h-4" />}
            {tab === "turmas" && <GraduationCap className="w-4 h-4" />}
            {tab === "admins" && <ShieldCheck className="w-4 h-4" />}
            {tab === "logs" && <ActivitySquare className="w-4 h-4" />}
            {tab === "perfil" && <User className="w-4 h-4" />}
            <span className="hidden md:inline">{tab === "reports" ? "AUDITORIA" : tab === "apuracao" ? "DASHBOARD" : tab.toUpperCase()}</span>
          </button>
        ))}
      </div>

      <div className="w-full max-w-[1200px]">
        {/* ABA: APURAÇÃO (DASHBOARD) */}
        {activeTab === "apuracao" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-6 md:p-8 rounded-2xl shadow-xl text-white flex flex-col md:flex-row justify-between items-center gap-8 border border-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
              <div className="flex-1 w-full z-10">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-full ${estatisticasEscola.isHot ? 'bg-orange-500 text-white animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.5)]' : 'bg-blue-500 text-white'}`}>
                    {estatisticasEscola.isHot ? <Flame className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-widest text-slate-100">Termômetro da Democracia</h2>
                </div>
                <p className="text-sm text-slate-400 font-medium mb-6">Acompanhe o engajamento geral da escola em tempo real.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Eleitorado Total</p><p className="text-3xl font-black text-white flex items-center gap-2"><Users className="w-5 h-5 text-slate-500"/> {estatisticasEscola.total}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Já Votaram</p><p className="text-3xl font-black text-white flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500"/> {estatisticasEscola.votaram}</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Comparecimento</p><p className="text-3xl font-black text-blue-400">{estatisticasEscola.comparecimento}%</p></div>
                  <div><p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Abstenção Atual</p><p className="text-3xl font-black text-red-400">{estatisticasEscola.abstencao}%</p></div>
                </div>
                <div className="mt-6"><div className="w-full bg-slate-800 rounded-full h-3 mb-1 border border-slate-700 overflow-hidden"><div className={`h-3 rounded-full transition-all duration-1000 ${estatisticasEscola.isHot ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-blue-500'}`} style={{ width: `${estatisticasEscola.comparecimento}%` }}></div></div></div>
              </div>
              <div className="w-full md:w-80 bg-white/10 backdrop-blur-sm border border-white/20 p-5 rounded-2xl z-10 flex flex-col">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2"><Trophy className="w-5 h-5 text-yellow-500" /><h3 className="text-sm font-black uppercase tracking-widest text-slate-100">Ranking de Cidadania</h3></div>
                <div className="space-y-3">
                  {rankingTurmas.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">Aguardando votos...</p> : rankingTurmas.map((turma, index) => (
                      <div key={turma.id} className="flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-black ${index === 0 ? 'bg-yellow-500 text-slate-900 shadow-[0_0_10px_rgba(234,179,8,0.4)]' : index === 1 ? 'bg-slate-300 text-slate-800' : index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'}`}>{index + 1}</span>
                          <p className="text-sm font-bold text-slate-200">{turma.nome}</p>
                        </div>
                        <div className="text-right"><p className="text-sm font-black text-white">{turma.engajamento}%</p></div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mt-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center"><Target className="w-6 h-6 text-blue-600" /></div>
                <div><h2 className="text-xl font-black text-slate-800 tracking-tight">Apuração Detalhada</h2><p className="text-sm text-slate-500 font-medium">Selecione os filtros abaixo para ver a contagem de votos.</p></div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <select className="w-full md:w-64 p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" value={apuracaoEleicaoId} onChange={e => setApuracaoEleicaoId(e.target.value)}>
                  {allEleicoes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>

                {!isEleicaoGlobal && (
                  <select className="w-full md:w-64 p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-blue-500" value={apuracaoTurmaId} onChange={e => setApuracaoTurmaId(e.target.value)}>
                    <option value="">Selecione a Turma...</option>
                    {allTurmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}

                <button onClick={printDashboardReport} disabled={isPrinting || (!isEleicaoGlobal && !apuracaoTurmaId)} className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> PDF</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-500 uppercase">Votos Computados</p><p className="text-3xl font-black text-blue-600 mt-1">{apuracaoOverview.total}</p></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-500 uppercase">Votos Válidos</p><p className="text-3xl font-black text-green-600 mt-1">{apuracaoOverview.validos}</p></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-500 uppercase">Votos em Branco</p><p className="text-3xl font-black text-slate-600 mt-1">{apuracaoOverview.brancos}</p></div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm"><p className="text-xs font-bold text-slate-500 uppercase">Votos Nulos</p><p className="text-3xl font-black text-orange-500 mt-1">{apuracaoOverview.nulos}</p></div>
            </div>

            {reportLoading ? <div className="py-12 text-center text-slate-400 font-bold animate-pulse">Calculando...</div> : apuracaoResults?.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Sem resultados para estes filtros.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {apuracaoResults?.map((result, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center"><h3 className="text-lg font-black uppercase tracking-widest">{result.role}</h3><span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{result.totalVotes} votos no cargo</span></div>
                    <div className="p-6 flex-1 space-y-6">
                      {result.candidateResults.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Nenhum candidato.</p> : result.candidateResults.map((cand, cIdx) => (
                          <div key={cand.id} className="relative">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-end mb-1">
                                  <p className="font-bold text-slate-800 truncate pr-2">{cIdx === 0 && result.totalVotes > 0 && <CheckCircle2 className="w-4 h-4 text-green-500 inline" />} {cand.name} <span className="text-slate-400 font-normal text-xs">(Nº {cand.candidate_number})</span></p>
                                  <p className="font-black text-blue-600 text-lg leading-none">{cand.votes}</p>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex"><div className={`h-full transition-all duration-1000 ${cIdx === 0 && cand.votes > 0 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${cand.percentage}%` }}></div></div>
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: MÍDIAS E MARKETING (SANTINHOS E CRACHÁS) */}
        {activeTab === "midias" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><ImageIcon className="w-6 h-6 text-blue-600" /> Estúdio de Campanhas</h2>
                <p className="text-sm text-slate-500 font-medium">Gere santinhos virtuais e crachás premium para os candidatos oficiais.</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input type="text" placeholder="Buscar candidato..." className="w-full pl-9 p-2.5 border rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500" value={midiaSearch} onChange={e => setMidiaSearch(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportLoading ? (
                <div className="col-span-full py-12 text-center text-slate-400"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
              ) : allCandidates.filter(c => c.name.toLowerCase().includes(midiaSearch.toLowerCase())).length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400">Nenhum candidato encontrado.</div>
              ) : (
                allCandidates.filter(c => c.name.toLowerCase().includes(midiaSearch.toLowerCase())).map(cand => (
                  <div key={cand.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-black text-slate-800 text-lg leading-tight">{cand.name}</h3>
                        <p className="text-xs text-slate-400 font-bold mt-1">Nº {cand.candidate_number} • Turma: {getTurmaName(cand.turma_id)}</p>
                      </div>
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-xs border border-slate-200">Foto</div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-6">
                      {cand.candidate_role?.split(',').map((role: string, i: number) => (
                        <span key={i} className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100 uppercase font-bold">{role.trim()}</span>
                      ))}
                    </div>

                    <div className="mt-auto grid grid-cols-1 md:grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                      <button onClick={() => printCandidateCard(cand)} disabled={isPrinting} className="bg-blue-50 text-blue-700 hover:bg-blue-100 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                        <FileText className="w-3.5 h-3.5" /> PDF
                      </button>
                      <button onClick={() => printBadge(cand)} disabled={isPrinting} className="bg-slate-900 text-white hover:bg-slate-800 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                        <Contact className="w-3.5 h-3.5" /> Crachá
                      </button>
                      <button 
                        onClick={() => {
                          const cargo = cand.candidate_role ? cand.candidate_role.split(',')[0].trim() : "Candidato";
                          const msg = encodeURIComponent(`🗳️ *Eleições ${escolaNome}*\n\nApoie *${cand.name}* para *${cargo}*!\n\n✅ Vote *${cand.candidate_number}*\n\n_A democracia na nossa escola levada a sério._`);
                          window.open(`https://wa.me/?text=${msg}`, '_blank');
                        }} 
                        className="bg-green-500 text-white hover:bg-green-600 py-2 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        Zap
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ABA: AUDITORIA (REPORTS E CSV COMPLETOS) */}
        {activeTab === "reports" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-3"><Filter className="w-5 h-5 text-blue-600" /> Relatório Geral e Auditoria</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Buscar Aluno</label><div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input type="text" placeholder="Nome" className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} /></div></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Eleição</label><select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.eleicaoId} onChange={e => setFilters({...filters, eleicaoId: e.target.value})}><option value="">Todas as Eleições</option>{allEleicoes.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}</select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Turma</label><select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.turmaId} onChange={e => setFilters({...filters, turmaId: e.target.value})}><option value="">Todas as Turmas</option>{allTurmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Tipo de Voto</label><select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.voteType} onChange={e => setFilters({...filters, voteType: e.target.value})}><option value="">Todos</option><option value="candidate">Válidos (Candidatos)</option><option value="branco">Em Branco</option><option value="nulo">Nulos</option></select></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase">Data da Votação</label><div className="relative"><Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input type="date" className="w-full pl-9 p-2.5 border rounded-lg text-sm text-slate-600" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} /></div></div>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t mt-4 gap-4">
                <p className="text-sm text-slate-500 font-medium">Encontrados <strong className="text-blue-600 text-lg">{filteredReport.length}</strong> votos totais.</p>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={exportToCSV} disabled={filteredReport.length === 0} className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-50"><Download className="w-4 h-4" /> Exportar Planilha</button>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><span className="text-xs font-black text-slate-500 uppercase tracking-wider">Listagem Paginada de Votos</span></div>
              <div className="overflow-x-auto min-h-[400px]">
                {reportLoading ? (
                  <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Carregando registros...</div>
                ) : paginatedReport.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">Nenhum voto encontrado.</div>
                ) : (
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
                            <span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">{v.candidate_role || 'Geral'}</span><span className={`font-black ${v.vote_type === 'candidate' ? 'text-blue-600' : 'text-slate-400'}`}>{v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type.toUpperCase()}</span>
                          </td>
                          <td className="p-4 text-center"><button onClick={() => {}} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir voto"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {totalPages > 1 && (
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center"><p className="text-xs text-slate-500 font-bold">Página {currentPage} de {totalPages}</p><div className="flex gap-2"><button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button><button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors"><ChevronRight className="w-4 h-4" /></button></div></div>
              )}
            </div>
          </div>
        )}

        {/* ABA: LOGS DE SEGURANÇA E SNAPSHOT */}
        {activeTab === "logs" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl"><ActivitySquare className="w-6 h-6" /></div>
                <div><h2 className="text-xl font-black text-slate-800">Logs de Segurança do Sistema</h2><p className="text-sm text-slate-500 font-medium">Auditoria rigorosa. Registo imutável de quem fez o quê.</p></div>
              </div>
              <button onClick={downloadSnapshot} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg">
                <Database className="w-4 h-4" /> Descarregar Snapshot JSON
              </button>
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {systemLogs.length === 0 && <p className="text-center text-sm text-slate-400 py-10">Nenhuma ação sensível registada recentemente.</p>}
              {systemLogs.map(log => (
                <div key={log.id} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div className="md:w-48 text-xs text-slate-400 font-mono font-bold flex-shrink-0">{new Date(log.created_at).toLocaleString('pt-BR')}</div>
                  <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">{log.acao}</span><span className="text-xs font-bold text-slate-600">{log.admin_email}</span></div><p className="text-sm font-medium text-slate-800">{log.detalhes}</p></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DEMAIS ABAS */}
        {activeTab === "eleicoes" && <div className="animate-in fade-in duration-300"><ManageEleicoes /></div>}
        {activeTab === "turmas" && <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300"><ManageTurmas onTurmasChanged={onTurmasChanged} /></div>}
        {activeTab === "admins" && <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300"><ManageAdmins /></div>}
        {activeTab === "perfil" && <div className="animate-in fade-in duration-300"><MeuPerfil escolaNome={escolaNome} /></div>}
      </div>
    </div>
  );
};

export default AdminPanel;
