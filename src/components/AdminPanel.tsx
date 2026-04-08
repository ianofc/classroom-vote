import { useState, useEffect, useMemo } from "react";
import { Turma } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ShieldCheck, FileText, 
  Filter, Search, Calendar, Eye, EyeOff, Lock, Trash2, GraduationCap, Printer, BarChart3, CheckCircle2, PieChart, AlertTriangle, CreditCard, User, CheckSquare, Maximize
} from "lucide-react";
import ManageTurmas from "./ManageTurmas";
import ManageAdmins from "./ManageAdmins";
import MeuPerfil from "./MeuPerfil";
import ManageEleicoes from "./ManageEleicoes"; 
import { toast } from "@/hooks/use-toast";

// Módulo do Mercado Pago
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// INICIALIZANDO COM A SUA CHAVE DE TESTE (Pública)
initMercadoPago('0000000');

interface ExtendedVoteRecord {
  id?: string;
  turma_id?: string;
  voter_name: string;
  voter_document: string;
  voter_contact: string;
  candidate_role: string;
  candidate_number: number | null;
  vote_type: "candidate" | "branco" | "nulo";
  created_at?: string;
}

type Tab = "apuracao" | "reports" | "eleicoes" | "turmas" | "admins" | "perfil";

interface AdminPanelProps {
  turma: Turma | null;
  onBack: () => void;
  onTurmasChanged: () => void;
}

const AdminPanel = ({ turma, onBack, onTurmasChanged }: AdminPanelProps) => {
  const [escolaNome, setEscolaNome] = useState("Carregando Escola...");
  const [escolaLogo, setEscolaLogo] = useState<string | null>(null); // ESTADO DO LOGO DA ESCOLA
  const [isExpired, setIsExpired] = useState(false); 
  const [validadeStr, setValidadeStr] = useState("");
  
  const [showVotes, setShowVotes] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("apuracao");
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [allVotes, setAllVotes] = useState<ExtendedVoteRecord[]>([]);
  const [allTurmas, setAllTurmas] = useState<{id: string, name: string}[]>([]);
  const [allCandidates, setAllCandidates] = useState<any[]>([]); 
  
  const [reportLoading, setReportLoading] = useState(false);
  
  const [filters, setFilters] = useState({
    search: "",
    turmaId: turma ? turma.id : "", 
    voteType: "",
    date: ""
  });

  const [apuracaoTurmaId, setApuracaoTurmaId] = useState(turma ? turma.id : "");

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const fetchAllData = async () => {
    setReportLoading(true);
    
    const fetchEverything = async (tableName: string) => {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let fetchMore = true;

      while (fetchMore) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .range(from, from + step - 1);

        if (error) {
          toast({ title: `Erro a buscar ${tableName}`, description: error.message, variant: "destructive" });
          break;
        }
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          if (data.length < step) fetchMore = false;
          else from += step;
        } else {
          fetchMore = false;
        }
      }
      return allData;
    };

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: adminData } = await supabase
          .from('admins')
          .select(`
            escolas (
              nome,
              valid_until,
              status,
              logo_url
            )
          `)
          .eq('auth_id', userData.user.id)
          .single();
          
        let escolaData = null;
        if (adminData?.escolas && !Array.isArray(adminData.escolas)) escolaData = adminData.escolas as any;
        else if (adminData?.escolas && Array.isArray(adminData.escolas)) escolaData = adminData.escolas[0] as any;

        if (escolaData) {
           setEscolaNome(escolaData.nome);
           if (escolaData.logo_url) setEscolaLogo(escolaData.logo_url);
           
           if (escolaData.valid_until) {
             const dataValidade = new Date(escolaData.valid_until);
             const dataHoje = new Date();
             setValidadeStr(dataValidade.toLocaleDateString('pt-BR'));
             
             if (dataHoje > dataValidade || escolaData.status === 'suspended') {
               setIsExpired(true);
               setReportLoading(false);
               return; 
             }
           }
        }
      }

      const [votesData, turmasData, candidatesRes] = await Promise.all([
        fetchEverything('votes'),
        fetchEverything('turmas'),
        supabase.from("students").select("*").eq("is_candidate", true).limit(5000)
      ]);

      const sortedVotes = votesData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setAllVotes(sortedVotes as ExtendedVoteRecord[]);
      
      if (turmasData) {
        const sortedTurmas = turmasData.sort((a, b) => a.name.localeCompare(b.name));
        setAllTurmas(sortedTurmas);
        if (!apuracaoTurmaId && sortedTurmas.length > 0) {
          setApuracaoTurmaId(sortedTurmas[0].id);
        }
      }
      if (candidatesRes.data) setAllCandidates(candidatesRes.data);

    } catch (err) {
      console.error(err);
    }
    
    setReportLoading(false);
  };

  const handleDeleteVote = async (id: string) => {
    if (!confirm("Atenção! Excluir este voto permanentemente?")) return;
    const { error } = await supabase.from('votes').delete().eq('id', id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Voto excluído com sucesso." });
      setAllVotes(allVotes.filter(v => v.id !== id));
    }
  };

  useEffect(() => {
    if (activeTab === "reports" || activeTab === "apuracao") fetchAllData();
  }, [activeTab]);

  const getTurmaName = (id?: string) => allTurmas.find(t => t.id === id)?.name || "Desconhecida";

  const apuracaoOverview = useMemo(() => {
    if (!apuracaoTurmaId) return { total: 0, validos: 0, brancos: 0, nulos: 0 };
    const tVotes = allVotes.filter(v => v.turma_id === apuracaoTurmaId);
    return {
      total: tVotes.length,
      validos: tVotes.filter(v => v.vote_type === 'candidate').length,
      brancos: tVotes.filter(v => v.vote_type === 'branco').length,
      nulos: tVotes.filter(v => v.vote_type === 'nulo').length
    };
  }, [apuracaoTurmaId, allVotes]);

  const apuracaoResults = useMemo(() => {
    if (!apuracaoTurmaId) return null;
    
    const turmaVotes = allVotes.filter(v => v.turma_id === apuracaoTurmaId);
    const turmaCandidates = allCandidates.filter(c => c.turma_id === apuracaoTurmaId);
    const roles = Array.from(new Set(turmaCandidates.map(c => c.candidate_role)));
    
    const resultsByRole = roles.map(role => {
      const votesForRole = turmaVotes.filter(v => v.candidate_role === role || (!v.candidate_role && role === "Líder Geral"));
      const totalVotes = votesForRole.length;
      const candidatesForRole = turmaCandidates.filter(c => c.candidate_role === role);
      
      const candidateResults = candidatesForRole.map(c => {
        const vCount = votesForRole.filter(v => v.vote_type === 'candidate' && v.candidate_number === c.candidate_number).length;
        return { 
          ...c, 
          votes: vCount, 
          percentage: totalVotes > 0 ? (vCount / totalVotes) * 100 : 0 
        };
      }).sort((a, b) => b.votes - a.votes);
      
      const brancos = votesForRole.filter(v => v.vote_type === 'branco').length;
      const nulos = votesForRole.filter(v => v.vote_type === 'nulo').length;
      
      return {
        role,
        totalVotes,
        candidateResults,
        brancos: { votes: brancos, percentage: totalVotes > 0 ? (brancos/totalVotes)*100 : 0 },
        nulos: { votes: nulos, percentage: totalVotes > 0 ? (nulos/totalVotes)*100 : 0 }
      };
    });
    
    return resultsByRole;
  }, [apuracaoTurmaId, allVotes, allCandidates]);

  // =====================================================================================
  // BOLETIM DE URNA (PDF)
  // =====================================================================================
  const printDashboardReport = () => {
    setIsPrinting(true);
    const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';
    const turmaName = escapeHtml(getTurmaName(apuracaoTurmaId));
    const nomeDaEscolaSeguro = escapeHtml(escolaNome);

    let rolesHtml = '';
    if (apuracaoResults && apuracaoResults.length > 0) {
      rolesHtml = apuracaoResults.map(result => {
        let candidatesHtml = result.candidateResults.map((c: any, idx: number) => `
          <tr>
            <td style="text-align: center; font-weight: bold;">${idx + 1}º</td>
            <td><strong>${escapeHtml(c.name)}</strong> ${c.vice_name ? `<br/><small style="color: #666;">Vice: ${escapeHtml(c.vice_name)}</small>` : ''}</td>
            <td style="text-align: center; font-weight: bold;">Nº ${c.candidate_number}</td>
            <td style="text-align: right;"><strong>${c.votes}</strong> (${c.percentage.toFixed(1)}%)</td>
          </tr>
        `).join('');

        if (result.candidateResults.length === 0) {
          candidatesHtml = `<tr><td colspan="4" style="text-align: center; color: #666; padding: 20px;">Nenhum candidato registrado para este cargo.</td></tr>`;
        }

        return `
          <div class="role-section">
            <h2>Cargo: ${escapeHtml(result.role)}</h2>
            <table>
              <thead>
                <tr>
                  <th width="60" style="text-align: center;">Posição</th>
                  <th>Candidato / Chapa</th>
                  <th width="80" style="text-align: center;">Número</th>
                  <th width="120" style="text-align: right;">Votos Computados</th>
                </tr>
              </thead>
              <tbody>
                ${candidatesHtml}
              </tbody>
            </table>
            <div class="role-summary">
              <span><strong>Brancos:</strong> ${result.brancos.votes} (${result.brancos.percentage.toFixed(1)}%)</span>
              <span><strong>Nulos:</strong> ${result.nulos.votes} (${result.nulos.percentage.toFixed(1)}%)</span>
              <span><strong>Total do Cargo:</strong> ${result.totalVotes}</span>
            </div>
          </div>
        `;
      }).join('');
    } else {
      rolesHtml = `<p style="text-align: center; color: #666; margin-top: 40px;">Nenhum dado de votação encontrado para esta turma.</p>`;
    }

    const reportHtml = `
      <html>
        <head>
          <title>Boletim de Urna - ${turmaName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; }
            .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #202683; }
            .sub { color: #666; font-size: 14px; margin-top: 5px; font-weight: bold; text-transform: uppercase; }
            .overview { display: flex; justify-content: space-between; background: #f4f4f5; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid #e4e4e7; }
            .overview div { text-align: center; width: 25%; border-right: 1px solid #ddd; }
            .overview div:last-child { border-right: none; }
            .overview strong { display: block; font-size: 24px; color: #111; margin-top: 8px; }
            .overview span { font-size: 11px; text-transform: uppercase; color: #666; font-weight: bold; letter-spacing: 1px; }
            .role-section { margin-bottom: 40px; page-break-inside: avoid; }
            .role-section h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 1px; background: #202683; color: #fff; padding: 12px 15px; margin: 0; border-top-left-radius: 6px; border-top-right-radius: 6px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 0; font-size: 13px; }
            th, td { border: 1px solid #ccc; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #555; }
            .role-summary { display: flex; justify-content: flex-end; gap: 20px; font-size: 12px; padding: 12px 15px; background: #f8f9fa; border: 1px solid #ccc; border-top: none; border-bottom-left-radius: 6px; border-bottom-right-radius: 6px; }
            .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; line-height: 1.6; }
            .creditos { margin-top: 15px; font-weight: bold; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            @media print {
              @page { margin: 1.5cm; size: A4 portrait; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            ${escolaLogo ? `<img src="${escolaLogo}" style="height: 70px; object-fit: contain; margin-bottom: 15px;" />` : ''}
            <h1>${nomeDaEscolaSeguro}</h1>
            <div class="sub">Boletim de Urna - Resultado Oficial da Apuração</div>
            <h3 style="margin-top: 15px; font-size: 18px; color: #333;">Turma Analisada: ${turmaName}</h3>
          </div>
          
          <div class="overview">
            <div><span>Votos Computados</span><strong>${apuracaoOverview.total}</strong></div>
            <div><span>Votos Válidos</span><strong style="color: #16a34a;">${apuracaoOverview.validos}</strong></div>
            <div><span>Brancos</span><strong>${apuracaoOverview.brancos}</strong></div>
            <div><span>Nulos</span><strong style="color: #ea580c;">${apuracaoOverview.nulos}</strong></div>
          </div>

          ${rolesHtml}
          
          <div class="rodape">
            Documento gerado eletronicamente em ${new Date().toLocaleString('pt-BR')} pelo Sistema Oficial de Votação - ${nomeDaEscolaSeguro}.<br/>
            Este boletim reflete a exata contagem dos votos criptografados e registrados no banco de dados em nuvem.
            <div class="creditos">
              Sistema Desenvolvido por Ian Santos
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => { setIsPrinting(false); }, 1000);
    } else {
      setIsPrinting(false);
    }
  };

  const filteredReport = useMemo(() => {
    return allVotes.filter(v => {
      const s = filters.search.toLowerCase();
      const matchSearch = !s || v.voter_name.toLowerCase().includes(s) || (v.voter_document && v.voter_document.includes(s));
      const matchTurma = !filters.turmaId || v.turma_id === filters.turmaId;
      const matchType = !filters.voteType || v.vote_type === filters.voteType;
      const matchDate = !filters.date || (v.created_at && v.created_at.startsWith(filters.date));
      return matchSearch && matchTurma && matchType && matchDate;
    });
  }, [allVotes, filters]);

  // =====================================================================================
  // RELATÓRIO DE AUDITORIA GERAL (PDF)
  // =====================================================================================
  const printFilteredReport = () => {
    setIsPrinting(true);
    const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';
    const nomeDaEscolaSeguro = escapeHtml(escolaNome);

    const rows = filteredReport.map(v => `
      <tr>
        <td>${v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '-'}</td>
        <td>${escapeHtml(getTurmaName(v.turma_id))}</td>
        <td><strong>${escapeHtml(v.voter_name)}</strong></td>
        <td style="text-align: center; font-weight: bold;">
          ${v.candidate_role ? `[${v.candidate_role}]<br/>` : ''}
          ${v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type.toUpperCase()}
        </td>
      </tr>
    `).join("");

    const reportHtml = `
      <html>
        <head>
          <title>Auditoria de Votação - ${nomeDaEscolaSeguro}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; }
            .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; color: #202683; }
            .sub { color: #666; font-size: 14px; margin-top: 5px; }
            .filters { background: #f4f4f5; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; border: 1px solid #e4e4e7; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #e4e4e7; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 15px; line-height: 1.6; }
            .creditos { margin-top: 15px; font-weight: bold; font-size: 11px; color: #555; text-transform: uppercase; letter-spacing: 1px; }
            @media print {
              @page { margin: 1cm; size: A4 portrait; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            ${escolaLogo ? `<img src="${escolaLogo}" style="height: 60px; object-fit: contain; margin-bottom: 10px;" />` : ''}
            <h1>${nomeDaEscolaSeguro}</h1>
            <div class="sub">Relatório Oficial de Auditoria Cadastral</div>
          </div>
          <div class="filters">
            <strong>Filtros aplicados na pesquisa:</strong><br/>
            Turma: ${filters.turmaId ? getTurmaName(filters.turmaId) : 'Todas'} | 
            Tipo: ${filters.voteType ? filters.voteType.toUpperCase() : 'Todos'} | 
            Data: ${filters.date ? new Date(filters.date).toLocaleDateString('pt-BR') : 'Todas'} <br/>
            Busca por nome: ${filters.search || 'Nenhuma'}
          </div>
          <p><strong>Total de votos encontrados: ${filteredReport.length}</strong></p>
          <table>
            <thead><tr><th>Data/Hora</th><th>Turma</th><th>Eleitor</th><th>Voto Registrado</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="rodape">
            Documento gerado eletronicamente em ${new Date().toLocaleString('pt-BR')} pelo Sistema Oficial de Votação - ${nomeDaEscolaSeguro}.<br/>
            Para salvar em PDF, utilize a opção "Salvar como PDF" no destino de impressão.
            <div class="creditos">
              Sistema Desenvolvido por Ian Santos
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => { setIsPrinting(false); }, 1000);
    } else {
      setIsPrinting(false);
    }
  };

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="bg-red-600 p-8 text-center text-white">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Acesso Bloqueado</h1>
            <p className="font-medium opacity-90 mt-2">O plano da instituição {escolaNome} expirou.</p>
          </div>
          
          <div className="p-8 text-center space-y-6">
            <p className="text-slate-600 font-medium">
              Sua chave de acesso venceu no dia <strong className="text-slate-900">{validadeStr}</strong>. 
              Para continuar utilizando o sistema de eleições e acessar os relatórios, renove sua assinatura.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Valor da Renovação</p>
              <p className="text-4xl font-black text-slate-800">R$ 197<span className="text-lg text-slate-400">/mês</span></p>
              
              <div className="mt-6">
                <div id="wallet_container">
                  <Wallet 
                    initialization={{ preferenceId: 'COLOQUE_A_PREFERENCE_ID_AQUI' }} 
                    customization={{ texts: { valueProp: 'security_safety' } }} 
                  />
                </div>
                <button className="w-full bg-[#009EE3] hover:bg-[#0089C4] text-white font-bold py-3.5 rounded-xl transition-all flex justify-center items-center gap-2 mt-2 shadow-md">
                  <CreditCard className="w-5 h-5" /> Renovar com Mercado Pago
                </button>
              </div>
            </div>

            <button onClick={onBack} className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
              Sair do Sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-slate-50 text-slate-900">
      {/* Cabeçalho Global */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => window.open('/telao', '_blank')} 
            className="hidden md:flex items-center gap-2 text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
          >
            <Maximize className="w-3 h-3" /> ABRIR MODO TELÃO
          </button>
          
          <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4" /> GESTÃO DE ELEIÇÕES - {escolaNome}
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-3 md:grid-cols-6 gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-6">
        {(["apuracao", "reports", "eleicoes", "turmas", "admins", "perfil"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg text-xs md:text-sm font-bold transition-all ${
              activeTab === tab ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {tab === "apuracao" && <BarChart3 className="w-4 h-4" />}
            {tab === "reports" && <FileText className="w-4 h-4" />}
            {tab === "eleicoes" && <CheckSquare className="w-4 h-4" />}
            {tab === "turmas" && <GraduationCap className="w-4 h-4" />}
            {tab === "admins" && <ShieldCheck className="w-4 h-4" />}
            {tab === "perfil" && <User className="w-4 h-4" />}
            <span className="hidden md:inline">
              {tab === "reports" ? "AUDITORIA" : tab === "apuracao" ? "DASHBOARD" : tab === "eleicoes" ? "ELEIÇÕES" : tab === "perfil" ? "PERFIL" : tab.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      <div className="w-full max-w-5xl">
        {activeTab === "apuracao" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Apuração Oficial</h2>
                  <p className="text-sm text-slate-500 font-medium">Análise de votos computados por turma</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
                <select 
                  className="w-full md:w-64 p-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-slate-50 outline-none focus:border-blue-500 transition-colors" 
                  value={apuracaoTurmaId} 
                  onChange={e => setApuracaoTurmaId(e.target.value)}
                >
                  <option value="" disabled>Selecione a Turma...</option>
                  {allTurmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                
                <button 
                  onClick={printDashboardReport} 
                  disabled={isPrinting || !apuracaoTurmaId} 
                  className="w-full md:w-auto bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" /> {isPrinting ? "Gerando..." : "Salvar PDF / Imprimir"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Votos Computados</p>
                <p className="text-3xl font-black text-blue-600 mt-1">{apuracaoOverview.total}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Votos Válidos</p>
                <p className="text-3xl font-black text-green-600 mt-1">{apuracaoOverview.validos}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Votos em Branco</p>
                <p className="text-3xl font-black text-slate-600 mt-1">{apuracaoOverview.brancos}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-xs font-bold text-slate-500 uppercase">Votos Nulos</p>
                <p className="text-3xl font-black text-orange-500 mt-1">{apuracaoOverview.nulos}</p>
              </div>
            </div>

            {reportLoading ? (
              <div className="py-12 text-center text-slate-400 font-bold animate-pulse">Calculando resultados...</div>
            ) : !apuracaoTurmaId ? (
              <div className="py-12 text-center text-slate-400">Selecione uma turma acima para ver os resultados.</div>
            ) : apuracaoResults?.length === 0 ? (
              <div className="py-12 text-center text-slate-400">Nenhum candidato registrado nesta turma ainda.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {apuracaoResults?.map((result, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                    <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
                      <h3 className="text-lg font-black uppercase tracking-widest">{result.role}</h3>
                      <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold">{result.totalVotes} votos no cargo</span>
                    </div>
                    
                    <div className="p-6 flex-1 space-y-6">
                      {result.candidateResults.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Nenhum candidato cadastrado para este cargo.</p>
                      ) : (
                        result.candidateResults.map((cand, cIdx) => (
                          <div key={cand.id} className="relative">
                            <div className="flex items-center gap-4 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-end mb-1">
                                  <p className="font-bold text-slate-800 truncate pr-2 flex items-center gap-1">
                                    {cIdx === 0 && result.totalVotes > 0 && <CheckCircle2 className="w-4 h-4 text-green-500 inline" />}
                                    {cand.name} <span className="text-slate-400 font-normal text-xs">(Nº {cand.candidate_number})</span>
                                  </p>
                                  <p className="font-black text-blue-600 text-lg leading-none">{cand.votes}</p>
                                </div>
                                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                                  <div 
                                    className={`h-full transition-all duration-1000 ${cIdx === 0 && cand.votes > 0 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${cand.percentage}%` }}
                                  ></div>
                                </div>
                                <p className="text-[10px] text-slate-400 text-right mt-1 font-bold">{cand.percentage.toFixed(1)}% dos votos</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="bg-slate-50 border-t border-slate-200 p-4 grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>Brancos</span>
                          <span>{result.brancos.votes}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-slate-400 h-full transition-all duration-1000" style={{ width: `${result.brancos.percentage}%` }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                          <span>Nulos</span>
                          <span>{result.nulos.votes}</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full transition-all duration-1000" style={{ width: `${result.nulos.percentage}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                <Filter className="w-5 h-5 text-blue-600" /> Relatório Geral e Auditoria
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Buscar Aluno</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input type="text" placeholder="Nome" className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Turma</label>
                  <select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.turmaId} onChange={e => setFilters({...filters, turmaId: e.target.value})}>
                    <option value="">Todas as Turmas</option>
                    {allTurmas.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Tipo de Voto</label>
                  <select className="w-full p-2.5 border rounded-lg text-sm bg-white" value={filters.voteType} onChange={e => setFilters({...filters, voteType: e.target.value})}>
                    <option value="">Todos</option>
                    <option value="candidate">Válidos (Candidatos)</option>
                    <option value="branco">Em Branco</option>
                    <option value="nulo">Nulos</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Data da Votação</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input type="date" className="w-full pl-9 p-2.5 border rounded-lg text-sm text-slate-600" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <p className="text-sm text-slate-500 font-medium">Exibindo <strong className="text-blue-600 text-lg">{filteredReport.length}</strong> votos.</p>
                <button onClick={printFilteredReport} disabled={isPrinting || filteredReport.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                  <Printer className="w-4 h-4" /> {isPrinting ? "Gerando..." : "Salvar em PDF / Imprimir"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                 <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Listagem de Votos da Auditoria</span>
                 <button onClick={() => setShowVotes(!showVotes)} className="text-[10px] font-bold bg-white border px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-sm">
                    {showVotes ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />} {showVotes ? "OCULTAR VOTOS" : "REVELAR VOTOS"}
                  </button>
              </div>
              <div className="max-h-[500px] overflow-y-auto">
                {reportLoading ? (
                  <div className="p-12 text-center text-slate-400 font-bold animate-pulse">Buscando banco de dados...</div>
                ) : filteredReport.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">Nenhum voto encontrado para estes filtros.</div>
                ) : (
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                      <tr className="text-[10px] text-slate-500 uppercase">
                        <th className="p-4 font-black">Data/Hora</th>
                        <th className="p-4 font-black">Turma</th>
                        <th className="p-4 font-black">Eleitor</th>
                        <th className="p-4 font-black text-center">Voto Computado</th>
                        <th className="p-4 font-black text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredReport.map((v, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-xs text-slate-500">{v.created_at ? new Date(v.created_at).toLocaleString('pt-BR') : '-'}</td>
                          <td className="p-4 font-semibold text-slate-700">{getTurmaName(v.turma_id)}</td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900">{v.voter_name}</p>
                          </td>
                          <td className="p-4 text-center">
                            {showVotes ? (
                              <>
                                <span className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">{v.candidate_role || 'Geral'}</span>
                                <span className={`font-black ${v.vote_type === 'candidate' ? 'text-blue-600' : 'text-slate-400'}`}>
                                  {v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type.toUpperCase()}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-300 italic text-xs flex justify-center items-center gap-1"><Lock className="w-3 h-3" /> Sigilo Ativo</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button onClick={() => handleDeleteVote(v.id!)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir este voto">
                              <Trash2 className="w-4 h-4 mx-auto" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA DE GESTÃO DE ELEIÇÕES */}
        {activeTab === "eleicoes" && (
          <div className="animate-in fade-in duration-300">
            <ManageEleicoes />
          </div>
        )}

        {activeTab === "turmas" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300">
            <ManageTurmas onTurmasChanged={onTurmasChanged} />
          </div>
        )}

        {activeTab === "admins" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-300">
            <ManageAdmins />
          </div>
        )}

        {/* ABA DO PERFIL DO GESTOR */}
        {activeTab === "perfil" && (
          <div className="animate-in fade-in duration-300">
            <MeuPerfil escolaNome={escolaNome} />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
