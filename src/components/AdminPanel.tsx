import { useState } from "react";
import { Turma } from "@/data/turmas";
import { getSessionVoteReport, VoteRecord, VoteReport } from "@/data/votes";
import { ArrowLeft, ShieldCheck, Hash, User, AlertTriangle, Lock, Eye, EyeOff, GraduationCap, Printer } from "lucide-react";
import ManageTurmas from "./ManageTurmas";
import ManageAdmins from "./ManageAdmins";

interface AdminPanelProps {
  turma: Turma | null;
  votes: VoteRecord[];
  totalVoters: number;
  currentVoter: number;
  votingComplete: boolean;
  sessionId: string | null;
  onBack: () => void;
  onTurmasChanged: () => void;
}

type Tab = "votes" | "turmas" | "admins";

const AdminPanel = ({ turma, votes, totalVoters, currentVoter, votingComplete, sessionId, onBack, onTurmasChanged }: AdminPanelProps) => {
  const [showVotes, setShowVotes] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(turma ? "votes" : "turmas");
  const [isPrinting, setIsPrinting] = useState(false);

  const buildLocalReport = (): VoteReport => {
    const totalsByCandidate: Record<number, number> = {};

    votes.forEach((vote) => {
      if (vote.type === "candidate") {
        totalsByCandidate[vote.number] = (totalsByCandidate[vote.number] ?? 0) + 1;
      }
    });

    return {
      totalsByCandidate,
      blanks: votes.filter((vote) => vote.type === "branco").length,
      nulls: votes.filter((vote) => vote.type === "nulo").length,
      totalVotes: votes.length,
    };
  };

  const printVotesReport = async () => {
    if (!turma) return;

    setIsPrinting(true);

    const escapeHtml = (text: string) =>
      text
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

    const reportData = sessionId ? (await getSessionVoteReport(sessionId)) ?? buildLocalReport() : buildLocalReport();

    const candidateRows = turma.candidates
      .map((candidate) => {
        const total = reportData.totalsByCandidate[candidate.number] ?? 0;
        return `<tr><td>${candidate.number}</td><td>${escapeHtml(candidate.name)}</td><td>${total}</td></tr>`;
      })
      .join("");

    const report = `
      <html>
        <head>
          <title>Relatório de votos - ${escapeHtml(turma.name)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 4px 0; }
            p { margin: 4px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background: #f3f3f3; }
            .totals { margin-top: 16px; display: grid; gap: 4px; }
          </style>
        </head>
        <body>
          <h1>Relatório de votos por turma</h1>
          <p><strong>Turma:</strong> ${escapeHtml(turma.name)}</p>
          <p><strong>Total de eleitores configurados:</strong> ${totalVoters}</p>
          <p><strong>Total de votos registrados:</strong> ${reportData.totalVotes}</p>

          <table>
            <thead>
              <tr>
                <th>Número</th>
                <th>Candidato</th>
                <th>Soma de votos</th>
              </tr>
            </thead>
            <tbody>
              ${candidateRows}
            </tbody>
          </table>

          <div class="totals">
            <p><strong>Brancos:</strong> ${reportData.blanks}</p>
            <p><strong>Nulos:</strong> ${reportData.nulls}</p>
            <p><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      setIsPrinting(false);
      return;
    }

    printWindow.document.open();
    printWindow.document.write(report);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();

    setIsPrinting(false);
  };

  const getCandidateName = (vote: VoteRecord) => {
    if (!turma) return "—";
    if (vote.type === "branco") return "BRANCO";
    if (vote.type === "nulo") return "NULO";
    const candidate = turma.candidates.find((c) => c.number === vote.number);
    return candidate ? candidate.name : "Desconhecido";
  };

  const getVoteTypeColor = (type: VoteRecord["type"]) => {
    switch (type) {
      case "candidate": return "text-primary";
      case "branco": return "text-muted-foreground";
      case "nulo": return "text-destructive";
    }
  };

  const progress = totalVoters > 0 ? (votes.length / totalVoters) * 100 : 0;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    ...(turma ? [{ id: "votes" as Tab, label: "Votos", icon: <Hash className="w-3.5 h-3.5" /> }] : []),
    { id: "turmas", label: "Turmas", icon: <GraduationCap className="w-3.5 h-3.5" /> },
    { id: "admins", label: "Admins", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen p-6 gap-6">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-extrabold">Painel de Gestão</h1>
            {turma && <p className="text-sm text-muted-foreground">{turma.name}</p>}
          </div>
        </div>
      </div>

      <div className="w-full max-w-2xl flex gap-1 bg-muted rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-2xl">
        {activeTab === "votes" && turma && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Progresso da Votação</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={printVotesReport}
                    disabled={isPrinting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-50"
                    title="Imprimir relatório"
                  >
                    <Printer className="w-3.5 h-3.5" /> {isPrinting ? "Gerando..." : "Imprimir relatório"}
                  </button>
                  <span className="text-sm font-bold font-mono-display">{votes.length} / {totalVoters} votos</span>
                </div>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center gap-2">
                {votingComplete ? (
                  <span className="text-xs text-primary font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Votação encerrada
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Em andamento — eleitor {currentVoter} de {totalVoters}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4 text-muted-foreground" /> Registro de Votos
                </h2>
                <button
                  onClick={() => setShowVotes(!showVotes)}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                >
                  {showVotes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showVotes ? "Ocultar" : "Mostrar"}
                </button>
              </div>

              {votes.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Nenhum voto registrado.</div>
              ) : showVotes ? (
                <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
                  {votes.map((vote, i) => (
                    <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono-display text-muted-foreground">
                        {vote.voterIndex}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${getVoteTypeColor(vote.type)}`}>{getCandidateName(vote)}</p>
                        <p className="text-xs text-muted-foreground">
                          {vote.type === "candidate" ? `Nº ${vote.number}` : vote.type === "branco" ? "Voto em branco" : "Voto nulo"}
                        </p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {vote.type}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center gap-2">
                  <Lock className="w-5 h-5" /> Votos ocultos.
                </div>
              )}
            </div>

            {votingComplete && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h2 className="font-bold text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> Resumo
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {turma.candidates.map((c) => {
                    const count = votes.filter((v) => v.type === "candidate" && v.number === c.number).length;
                    return (
                      <div key={c.number} className="bg-muted rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground truncate">{c.name.split(" ")[0]}</p>
                        <p className="text-xl font-extrabold font-mono-display text-primary">{count}</p>
                      </div>
                    );
                  })}
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Brancos</p>
                    <p className="text-xl font-extrabold font-mono-display">{votes.filter((v) => v.type === "branco").length}</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <p className="text-xs text-muted-foreground">Nulos</p>
                    <p className="text-xl font-extrabold font-mono-display">{votes.filter((v) => v.type === "nulo").length}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "turmas" && (
          <div className="bg-card border border-border rounded-xl p-4">
            <ManageTurmas onTurmasChanged={onTurmasChanged} />
          </div>
        )}

        {activeTab === "admins" && (
          <div className="bg-card border border-border rounded-xl p-4">
            <ManageAdmins />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
