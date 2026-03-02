import { Turma, VoteResult } from "@/data/turmas";
import { BarChart3, Trophy, ArrowLeft } from "lucide-react";

interface ResultsProps {
  turma: Turma;
  results: VoteResult[];
  blanks: number;
  nulls: number;
  onBack: () => void;
}

const Results = ({ turma, results, blanks, nulls, onBack }: ResultsProps) => {
  const totalVotes = results.reduce((s, r) => s + r.votes, 0) + blanks + nulls;
  const sorted = [...results].sort((a, b) => b.votes - a.votes);
  const maxVotes = sorted.length > 0 ? sorted[0].votes : 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold">Resultado da Eleição</h1>
        </div>
        <p className="text-muted-foreground">{turma.name} — {totalVotes} voto(s) computado(s)</p>
      </div>

      <div className="w-full max-w-md space-y-3">
        {sorted.map((r, i) => {
          const pct = totalVotes > 0 ? (r.votes / totalVotes) * 100 : 0;
          const isWinner = i === 0 && r.votes > 0;
          return (
            <div
              key={r.candidateNumber}
              className={`relative bg-card border rounded-xl p-4 overflow-hidden transition-all ${
                isWinner ? "border-primary shadow-lg shadow-primary/20" : "border-border"
              }`}
            >
              <div className="absolute inset-0 bg-primary/10 origin-left transition-transform duration-700"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isWinner && <Trophy className="w-5 h-5 text-secondary" />}
                  <div>
                    <p className="font-bold">{r.candidateName}</p>
                    <p className="text-xs text-muted-foreground">Nº {r.candidateNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold font-mono-display">{r.votes}</p>
                  <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Brancos e Nulos */}
        <div className="flex gap-3 mt-2">
          <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Brancos</p>
            <p className="text-lg font-bold font-mono-display">{blanks}</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Nulos</p>
            <p className="text-lg font-bold font-mono-display">{nulls}</p>
          </div>
        </div>
      </div>

      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Nova eleição
      </button>
    </div>
  );
};

export default Results;
