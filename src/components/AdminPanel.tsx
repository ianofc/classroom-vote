import { useState, useEffect, useMemo } from "react";
import { Turma } from "@/data/turmas";
import { getSessionVoteReport } from "@/data/votes";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, ShieldCheck, Hash, User, AlertTriangle, 
  Lock, Eye, EyeOff, GraduationCap, Printer, FileText, 
  Filter, Search, Calendar, CheckSquare, Trash2
} from "lucide-react";
import ManageTurmas from "./ManageTurmas";
import ManageAdmins from "./ManageAdmins";
import { toast } from "@/hooks/use-toast";

interface ExtendedVoteRecord {
  id?: string;
  turma_id?: string;
  voter_name: string;
  voter_document: string;
  voter_contact: string;
  candidate_number: number | null;
  vote_type: "candidate" | "branco" | "nulo";
  created_at?: string;
}

interface AdminPanelProps {
  turma: Turma | null;
  totalVoters: number;
  currentVoter: number;
  votingComplete: boolean;
  sessionId: string | null;
  onBack: () => void;
  onTurmasChanged: () => void;
}

type Tab = "votes" | "reports" | "turmas" | "admins";

const AdminPanel = ({ turma, totalVoters, currentVoter, votingComplete, sessionId, onBack, onTurmasChanged }: AdminPanelProps) => {
  const [showVotes, setShowVotes] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(turma ? "votes" : "turmas");
  const [isPrinting, setIsPrinting] = useState(false);
  
  const [realTimeVotes, setRealTimeVotes] = useState<ExtendedVoteRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [allVotes, setAllVotes] = useState<ExtendedVoteRecord[]>([]);
  const [allTurmas, setAllTurmas] = useState<{id: string, name: string}[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    turmaId: "",
    voteType: "",
    date: ""
  });

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const fetchSessionVotes = async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("votes")
      .select("id, voter_name, voter_document, voter_contact, candidate_number, vote_type, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) toast({ title: "Erro ao buscar dados", description: error.message, variant: "destructive" });
    else setRealTimeVotes(data as ExtendedVoteRecord[]);
    setLoading(false);
  };

  const fetchAllReports = async () => {
    setReportLoading(true);
    const [votesRes, turmasRes] = await Promise.all([
      supabase.from("votes").select("*").order("created_at", { ascending: false }),
      supabase.from("turmas").select("id, name").order("name")
    ]);

    if (votesRes.error) toast({ title: "Erro", description: votesRes.error.message, variant: "destructive" });
    else setAllVotes(votesRes.data as ExtendedVoteRecord[]);
    
    if (turmasRes.data) setAllTurmas(turmasRes.data);
    setReportLoading(false);
  };

  // Nova função para deletar VOTO DE TESTE
  const handleDeleteVote = async (id: string) => {
    if (!confirm("Atenção! Você está prestes a excluir este voto permanentemente do sistema. Continuar?")) return;
    
    const { error } = await supabase.from('votes').delete().eq('id', id);
    
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: "Voto excluído com sucesso." });
      setAllVotes(allVotes.filter(v => v.id !== id));
      setRealTimeVotes(realTimeVotes.filter(v => v.id !== id));
    }
  };

  useEffect(() => {
    if (activeTab === "votes" && sessionId) fetchSessionVotes();
    if (activeTab === "reports") fetchAllReports();
  }, [activeTab, sessionId]);

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

  const getTurmaName = (id?: string) => allTurmas.find(t => t.id === id)?.name || "Desconhecida";

  const getCandidateDisplay = (vote: ExtendedVoteRecord) => {
    if (vote.vote_type === "branco") return "BRANCO";
    if (vote.vote_type === "nulo") return "NULO";
    const cand = turma?.candidates?.find(c => c.number === vote.candidate_number);
    return cand ? cand.name : `Candidato ${vote.candidate_number || '?'}`;
  };

  const printFilteredReport = () => {
    setIsPrinting(true);
    const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';

    const rows = filteredReport.map(v => `
      <tr>
        <td>${v.created_at ? new Date(v.created_at).toLocaleDateString('pt-BR') : '-'}</td>
        <td>${escapeHtml(getTurmaName(v.turma_id))}</td>
        <td><strong>${escapeHtml(v.voter_name)}</strong><br/><small>${escapeHtml(v.voter_document || "Sem doc")}</small></td>
        <td style="text-align: center; font-weight: bold;">
          ${v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type.toUpperCase()}
        </td>
      </tr>
    `).join("");

    const reportHtml = `
      <html>
        <head>
          <title>Relatório de Votação - CEEPS</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #222; }
            .cabecalho { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
            .sub { color: #666; font-size: 14px; margin-top: 5px; }
            .filters { background: #f4f4f5; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; border: 1px solid #e4e4e7; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 10px; text-align: left; }
            th { background-color: #e4e4e7; font-weight: bold; text-transform: uppercase; font-size: 11px; }
            .rodape { text-align: center; font-size: 10px; color: #999; margin-top: 40px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print {
              @page { margin: 1cm; size: A4 portrait; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <h1>CEEPS Seabra-Ba</h1>
            <div class="sub">Relatório Oficial de Apuração e Auditoria</div>
          </div>
          <div class="filters">
            <strong>Filtros aplicados na pesquisa:</strong><br/>
            Turma: ${filters.turmaId ? getTurmaName(filters.turmaId) : 'Todas'} | 
            Tipo: ${filters.voteType ? filters.voteType.toUpperCase() : 'Todos'} | 
            Data: ${filters.date ? new Date(filters.date).toLocaleDateString('pt-BR') : 'Todas'} <br/>
            Busca por nome/documento: ${filters.search || 'Nenhuma'}
          </div>
          <p><strong>Total de votos encontrados: ${filteredReport.length}</strong></p>
          <table>
            <thead><tr><th>Data/Hora</th><th>Turma</th><th>Eleitor / Documento</th><th>Voto Registrado</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="rodape">
            Documento gerado eletronicamente em ${new Date().toLocaleString('pt-BR')} pelo Sistema de Votação CEEPS.<br/>
            Para salvar em PDF, utilize a opção "Salvar como PDF" no destino de impressão.
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

  const progress = totalVoters > 0 ? (realTimeVotes.length / totalVoters) * 100 : 0;

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-slate-50 text-slate-900">
      {/* Cabeçalho Global */}
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Painel Inicial
        </button>
        <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
          <ShieldCheck className="w-4 h-4" /> ADMIN MODE
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-6">
        {(["votes", "reports", "turmas", "admins"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {tab === "votes" && <Hash className="w-4 h-4" />}
            {tab === "reports" && <Filter className="w-4 h-4" />}
            {tab === "turmas" && <GraduationCap className="w-4 h-4" />}
            {tab === "admins" && <ShieldCheck className="w-4 h-4" />}
            {tab === "reports" ? "RELATÓRIOS" : tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-5xl">
        
        {/* ABA DE RELATÓRIOS */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 border-b pb-3">
                <FileText className="w-5 h-5 text-blue-600" /> Relatório Geral e Pesquisa
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Buscar Aluno</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input 
                      type="text" placeholder="Nome ou Documento" 
                      className="w-full pl-9 p-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}
                    />
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
                <p className="text-sm text-slate-500 font-medium">
                  Exibindo <strong className="text-blue-600 text-lg">{filteredReport.length}</strong> votos correspondentes.
                </p>
                <button onClick={printFilteredReport} disabled={isPrinting || filteredReport.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
                  <Printer className="w-4 h-4" /> {isPrinting ? "Gerando..." : "Salvar em PDF / Imprimir"}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                 <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Listagem de Votos</span>
                 <button onClick={() => setShowVotes(!showVotes)} className="text-[10px] font-bold bg-white border px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors flex items-center gap-1 shadow-sm">
                    {showVotes ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showVotes ? "OCULTAR" : "MOSTRAR"}
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
                        <th className="p-4 font-black">Eleitor & Documento</th>
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
                            <p className="font-mono text-xs text-slate-400">{v.voter_document || "Pendente"}</p>
                          </td>
                          <td className="p-4 text-center">
                            {showVotes ? (
                              <span className={`font-black ${v.vote_type === 'candidate' ? 'text-blue-600' : 'text-slate-400'}`}>
                                {v.vote_type === 'candidate' ? `Nº ${v.candidate_number}` : v.vote_type.toUpperCase()}
                              </span>
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

        {/* ABA DE VOTOS (SESSÃO ATUAL) */}
        {activeTab === "votes" && turma && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Progresso da Urna</h3>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-black text-blue-600">{realTimeVotes.length}</span>
                  <span className="text-sm font-bold text-slate-400">/ {totalVoters} Alunos</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
              </div>
              {votingComplete && (
                <div className="bg-green-50 border border-green-200 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                    <CheckSquare className="w-5 h-5" /> Urna Finalizada
                  </div>
                  <p className="text-sm text-green-600">Para ver o panorama geral e aplicar filtros, acesse a aba <strong>Relatórios</strong>.</p>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <h2 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-tighter">
                    <FileText className="w-4 h-4" /> Auditoria da Sessão
                  </h2>
                  <button onClick={() => setShowVotes(!showVotes)} className="text-[10px] font-bold bg-white border border-slate-300 px-2 py-1.5 rounded hover:bg-slate-50">
                    {showVotes ? "OCULTAR" : "MOSTRAR"}
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-2">
                  {loading ? <div className="p-8 text-center text-slate-400 font-bold">CARREGANDO...</div> :
                   realTimeVotes.length === 0 ? <div className="p-8 text-center text-slate-400">Aguardando votos...</div> :
                   <table className="w-full text-left text-sm">
                     <tbody>
                       {realTimeVotes.map((v, i) => (
                         <tr key={i} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                           <td className="p-3"><p className="font-bold">{v.voter_name}</p><p className="text-[10px] text-slate-400">{v.voter_document || "Sem doc"}</p></td>
                           <td className="p-3 text-right">
                             {showVotes ? <span className="font-bold text-blue-600">{getCandidateDisplay(v)}</span> : <Lock className="w-3 h-3 text-slate-300 inline" />}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AVISO QUANDO NÃO HÁ URNA ATIVA */}
        {activeTab === "votes" && !turma && (
          <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-500">
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 opacity-50" />
            <p>Nenhuma urna ativa no momento. Acesse <strong>Turmas</strong> para iniciar ou <strong>Relatórios</strong> para ver o histórico.</p>
          </div>
        )}

        {/* ABA DE TURMAS */}
        {activeTab === "turmas" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <ManageTurmas onTurmasChanged={onTurmasChanged} />
          </div>
        )}

        {/* ABA DE ADMINS */}
        {activeTab === "admins" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <ManageAdmins />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
