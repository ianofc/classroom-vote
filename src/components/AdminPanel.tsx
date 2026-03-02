import { useState } from "react";
import { Turma } from "@/data/turmas";
import { Lock, Eye, EyeOff, ArrowLeft, ShieldCheck, Hash, User, AlertTriangle } from "lucide-react";

interface Vote {
  number: number;
  type: "candidate" | "branco" | "nulo";
  voterIndex: number;
}

interface AdminPanelProps {
  turma: Turma;
  votes: Vote[];
  totalVoters: number;
  currentVoter: number;
  votingComplete: boolean;
  onBack: () => void;
}

const AdminPanel = ({ turma, votes, totalVoters, currentVoter, votingComplete, onBack }: AdminPanelProps) => {
  const [showVotes, setShowVotes] = useState(false);

  const getCandidateName = (vote: Vote) => {
    if (vote.type === "branco") return "BRANCO";
    if (vote.type === "nulo") return "NULO";
    const candidate = turma.candidates.find((c) => c.number === vote.number);
    return candidate ? candidate.name : "Desconhecido";
  };

  const getVoteTypeColor = (type: Vote["type"]) => {
    switch (type) {
      case "candidate": return "text-primary";
      case "branco": return "text-muted-foreground";
      case "nulo": return "text-destructive";
    }
  };

  const progress = totalVoters > 0 ? (votes.length / totalVoters) * 100 : 0;

  return (
    <div className="flex flex-col items-center min-h-screen p-6 gap-6">
      {/* Header */}
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>

        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-extrabold">Gestão da Eleição</h1>
            <p className="text-sm text-muted-foreground">{turma.name}</p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Progresso da Votação</span>
          <span className="text-sm font-bold font-mono-display">
            {votes.length} / {totalVoters} votos
          </span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          {votingComplete ? (
            <span className="text-xs text-primary font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Votação encerrada
            </span>
          ) : (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Votação em andamento — eleitor {currentVoter} de {totalVoters}
            </span>
          )}
        </div>
      </div>

      {/* Vote Log */}
      <div className="w-full max-w-2xl bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <Hash className="w-4 h-4 text-muted-foreground" />
            Registro de Votos
          </h2>
          <button
            onClick={() => setShowVotes(!showVotes)}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            {showVotes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showVotes ? "Ocultar votos" : "Mostrar votos"}
          </button>
        </div>

        {votes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum voto registrado ainda.
          </div>
        ) : showVotes ? (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {votes.map((vote, i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold font-mono-display text-muted-foreground">
                  {vote.voterIndex}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${getVoteTypeColor(vote.type)}`}>
                    {getCandidateName(vote)}
                  </p>
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
            <Lock className="w-5 h-5" />
            Votos ocultos. Clique em "Mostrar votos" para visualizar.
          </div>
        )}
      </div>

      {/* Summary (only when complete) */}
      {votingComplete && (
        <div className="w-full max-w-2xl bg-card border border-border rounded-xl p-4 space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Resumo Rápido
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
  );
};

export default AdminPanel;
