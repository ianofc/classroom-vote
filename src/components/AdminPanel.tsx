import { useState, useEffect, useMemo } from "react";
import { Turma } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ShieldCheck, FileText, 
  Filter, Search, Calendar, Eye, EyeOff, Lock, Trash2, GraduationCap, Printer, BarChart3, CheckCircle2, PieChart, AlertTriangle, CreditCard, User, CheckSquare
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
  const [isExpired, setIsExpired] = useState(false); // ESTADO DO BLOQUEIO
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
              status
            )
          `)
          .eq('auth_id', userData.user.id)
          .single();
          
        let escolaData = null;
        if (adminData?.escolas && !Array.isArray(adminData.escolas)) escolaData = adminData.escolas;
        else if (adminData?.escolas && Array.isArray(adminData.escolas)) escolaData = adminData.escolas[0];

        if (escolaData) {
           setEscolaNome(escolaData.nome);
           
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
