import { useState, useEffect } from "react";
import { Turma } from "@/data/turmas";
import { getSessionVoteReport, VoteReport } from "@/data/votes";
import { supabase } from "@/lib/supabase"; // CORREÇÃO: Importação correta do Supabase
import { 
  ArrowLeft, ShieldCheck, Hash, User, AlertTriangle, 
  Lock, Eye, EyeOff, GraduationCap, Printer, FileText, Users 
} from "lucide-react";
import ManageTurmas from "./ManageTurmas";
import ManageAdmins from "./ManageAdmins";
import { toast } from "@/hooks/use-toast";

interface ExtendedVoteRecord {
  voter_name: string;
  voter_document: string;
  voter_contact: string;
  candidate_number: number | null;
  vote_type: "candidate" | "branco" | "nulo";
  voter_index?: number;
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

type Tab = "votes" | "turmas" | "admins";

const AdminPanel = ({ turma, totalVoters, currentVoter, votingComplete, sessionId, onBack, onTurmasChanged }: AdminPanelProps) => {
  const [showVotes, setShowVotes] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(turma ? "votes" : "turmas");
  const [isPrinting, setIsPrinting] = useState(false);
  const [realTimeVotes, setRealTimeVotes] = useState<ExtendedVoteRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Garante que o painel de gestão não bugue caso o modo escuro esteja ativado na urna
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const fetchVotesFromDb = async () => {
    if (!sessionId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("votes")
      .select("voter_name, voter_document, voter_contact, candidate_number, vote_type")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Erro ao buscar dados", description: error.message, variant: "destructive" });
    } else {
      setRealTimeVotes(data as ExtendedVoteRecord[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === "votes" && sessionId) {
      fetchVotesFromDb();
    }
  }, [activeTab, sessionId]);

  const printVotesReport = async () => {
    if (!turma || !sessionId) return;
    setIsPrinting(true);

    const reportData = await getSessionVoteReport(sessionId);
    if (!reportData) {
      toast({ title: "Erro", description: "Não foi possível gerar o relatório.", variant: "destructive" });
      setIsPrinting(false);
      return;
    }

    const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));

    const candidateRows = turma.candidates
      .map((c) => {
        const total = reportData.totalsByCandidate[c.number] ?? 0;
        return `
          <tr>
            <td>${c.number}</td>
            <td><strong>${escapeHtml(c.name)}</strong>${c.vice_name ? `<br/><small>Vice: ${escapeHtml(c.vice_name)}</small>` : ''}</td>
            <td style="text-align: center;">${total}</td>
          </tr>`;
      }).join("");

    const reportHtml = `
      <html>
        <head>
          <title>Relatório Final - ${escapeHtml(turma.name)}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #202683; padding-bottom: 20px; margin-bottom: 30px; }
            h1 { color: #202683; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; color: #202683; }
            .summary { background: #f0f0f0; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .footer { margin-top: 50px; font-size: 10px; text-align: center; color: #777; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>CEEPS - Relatório de Votação Eletrônica</h1>
            <p><strong>Turma:</strong> ${escapeHtml(turma.name)} | <strong>ID Sessão:</strong> ${sessionId.slice(0, 8)}</p>
          </div>
          <table>
            <thead>
              <tr><th>Nº</th><th>Candidato / Chapa</th><th>Total de Votos</th></tr>
            </thead>
            <tbody>${candidateRows}</tbody>
          </table>
          <div class="summary">
            <p><strong>Votos em Branco:</strong> ${reportData.blanks}</p>
            <p><strong>Votos Nulos:</strong> ${reportData.nulls}</p>
            <hr/>
            <p><strong>Total Geral de Votos:</strong> ${reportData.totalVotes} de ${totalVoters} previstos</p>
          </div>
          <div class="footer">Documento gerado em ${new Date().toLocaleString("pt-BR")} - Sistema de Votação CEEPS</div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
        setIsPrinting(false);
      }, 500);
    }
  };

  const getCandidateDisplay = (vote: ExtendedVoteRecord) => {
    if (vote.vote_type === "branco") return "BRANCO";
    if (vote.vote_type === "nulo") return "NULO";
    const cand = turma?.candidates.find(c => c.number === vote.candidate_number);
    return cand ? cand.name : `Candidato ${vote.candidate_number}`;
  };

  const progress = totalVoters > 0 ? (realTimeVotes.length / totalVoters) * 100 : 0;

  return (
    <div className="flex flex-col items-center min-h-screen p-6 bg-slate-50 text-slate-900">
      {/* Cabeçalho */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Painel Inicial
        </button>
        <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
          <ShieldCheck className="w-4 h-4" /> ADMIN MODE
        </div>
      </div>

      {/* Tabs */}
      <div className="w-full max-w-4xl grid grid-cols-3 gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm mb-6">
        {(["votes", "turmas", "admins"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
              activeTab === tab ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {tab === "votes" && <Hash className="w-4 h-4" />}
            {tab === "turmas" && <GraduationCap className="w-4 h-4" />}
            {tab === "admins" && <ShieldCheck className="w-4 h-4" />}
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-4xl">
        {activeTab === "votes" && turma && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Coluna de Status e Resumo */}
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Progresso Real</h3>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xl font-black text-blue-600">{realTimeVotes.length}</span>
                  <span className="text-sm font-bold text-slate-400">/ {totalVoters} Alunos</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${progress}%` }} />
                </div>
                <button 
                  onClick={printVotesReport}
                  disabled={isPrinting || realTimeVotes.length === 0}
                  className="w-full mt-6 flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
                >
                  <Printer className="w-4 h-4" /> {isPrinting ? "Gerando..." : "Imprimir Ata"}
                </button>
              </div>

              {votingComplete && (
                <div className="bg-green-50 border border-green-200 p-5 rounded-2xl">
                  <div className="flex items-center gap-2 text-green-700 font-bold mb-3">
                    <ShieldCheck className="w-5 h-5" /> Votação Finalizada
                  </div>
                  <p className="text-sm text-green-600">Todos os votos foram criptografados e salvos no banco de dados.</p>
                </div>
              )}
            </div>

            {/* Lista de Auditoria de Votos */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="font-black text-slate-700 flex items-center gap-2 uppercase text-xs tracking-tighter">
                    <FileText className="w-4 h-4" /> Auditoria de Presença
                  </h2>
                  <button onClick={() => setShowVotes(!showVotes)} className="text-[10px] font-bold bg-white border border-slate-300 text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                    {showVotes ? <EyeOff className="w-3 h-3 inline mr-1" /> : <Eye className="w-3 h-3 inline mr-1" />}
                    {showVotes ? "OCULTAR VOTOS" : "MOSTRAR VOTOS"}
                  </button>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                  {loading ? (
                    <div className="p-10 text-center animate-pulse text-slate-400 font-bold">CARREGANDO DADOS...</div>
                  ) : realTimeVotes.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">Aguardando primeiro eleitor...</div>
                  ) : (
                    <table className="w-full text-left text-sm border-separate border-spacing-0">
                      <thead>
                        <tr className="text-[10px] text-slate-400 uppercase">
                          <th className="p-4 font-black">Eleitor</th>
                          <th className="p-4 font-black">Documento</th>
                          <th className="p-4 font-black text-right">Voto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {realTimeVotes.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4">
                              <p className="font-bold text-slate-800">{v.voter_name}</p>
                              <p className="text-[10px] text-slate-400">{v.voter_contact}</p>
                            </td>
                            <td className="p-4 font-mono text-xs text-slate-500">{v.voter_document}</td>
                            <td className="p-4 text-right">
                              {showVotes ? (
                                <span className={`font-black ${v.vote_type === 'candidate' ? 'text-blue-600' : 'text-slate-400'}`}>
                                  {getCandidateDisplay(v)}
                                </span>
                              ) : (
                                <span className="text-slate-300 italic text-xs flex justify-end items-center gap-1">
                                  <Lock className="w-3 h-3" /> Sigiloso
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "turmas" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <ManageTurmas onTurmasChanged={onTurmasChanged} />
          </div>
        )}

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
