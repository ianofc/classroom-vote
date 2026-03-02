import { useState, useCallback } from "react";
import TurmaSelection from "@/components/TurmaSelection";
import Urna from "@/components/Urna";
import Results from "@/components/Results";
import { Turma, VoteResult } from "@/data/turmas";
import { Users } from "lucide-react";

type Phase = "select" | "setup" | "voting" | "results";

const Index = () => {
  const [phase, setPhase] = useState<Phase>("select");
  const [turma, setTurma] = useState<Turma | null>(null);
  const [totalVoters, setTotalVoters] = useState(10);
  const [currentVoter, setCurrentVoter] = useState(1);
  const [votes, setVotes] = useState<{ number: number; type: "candidate" | "branco" | "nulo" }[]>([]);

  const handleSelectTurma = (t: Turma) => {
    setTurma(t);
    setPhase("setup");
  };

  const handleStartVoting = () => {
    setVotes([]);
    setCurrentVoter(1);
    setPhase("voting");
  };

  const handleVote = useCallback(
    (vote: { number: number; type: "candidate" | "branco" | "nulo" }) => {
      setVotes((prev) => [...prev, vote]);
      if (currentVoter >= totalVoters) {
        setTimeout(() => setPhase("results"), 400);
      } else {
        setCurrentVoter((v) => v + 1);
      }
    },
    [currentVoter, totalVoters]
  );

  const getResults = (): { results: VoteResult[]; blanks: number; nulls: number } => {
    if (!turma) return { results: [], blanks: 0, nulls: 0 };

    const blanks = votes.filter((v) => v.type === "branco").length;
    const nulls = votes.filter((v) => v.type === "nulo").length;

    const results: VoteResult[] = turma.candidates.map((c) => ({
      candidateNumber: c.number,
      candidateName: c.name,
      votes: votes.filter((v) => v.type === "candidate" && v.number === c.number).length,
    }));

    return { results, blanks, nulls };
  };

  const handleReset = () => {
    setPhase("select");
    setTurma(null);
    setVotes([]);
    setCurrentVoter(1);
  };

  if (phase === "select") {
    return <TurmaSelection onSelect={handleSelectTurma} />;
  }

  if (phase === "setup" && turma) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold">{turma.name}</h1>
          <p className="text-muted-foreground">Configure a votação</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Quantidade de eleitores
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={totalVoters}
              onChange={(e) => setTotalVoters(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full h-12 rounded-lg bg-muted border border-border px-4 text-lg font-mono-display font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">Candidatos:</p>
            <div className="space-y-1">
              {turma.candidates.map((c) => (
                <div key={c.number} className="flex items-center gap-2 text-sm">
                  <span className="font-mono-display font-bold text-primary w-8">{c.number}</span>
                  <span>{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setPhase("select")}
              className="flex-1 py-3 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleStartVoting}
              className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all"
            >
              Iniciar Votação
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "voting" && turma) {
    return (
      <Urna
        turma={turma}
        onVoteConfirmed={handleVote}
        onBack={handleReset}
        voterNumber={currentVoter}
        totalVoters={totalVoters}
      />
    );
  }

  if (phase === "results" && turma) {
    const { results, blanks, nulls } = getResults();
    return <Results turma={turma} results={results} blanks={blanks} nulls={nulls} onBack={handleReset} />;
  }

  return null;
};

export default Index;
