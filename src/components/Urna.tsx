import { useState, useCallback, useEffect } from "react";
import { Candidate, Turma } from "@/data/turmas";

interface UrnaProps {
  turma: Turma;
  onVoteConfirmed: (vote: { number: number; type: "candidate" | "branco" | "nulo" }) => void;
  onBack: () => void;
  voterNumber: number;
  totalVoters: number;
}

const Urna = ({ turma, onVoteConfirmed, onBack, voterNumber, totalVoters }: UrnaProps) => {
  const [digits, setDigits] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [showEndAnim, setShowEndAnim] = useState(false);

  const maxDigits = 2;
  const candidate = digits.length === maxDigits
    ? turma.candidates.find((c) => c.number === parseInt(digits))
    : null;
  const isNulo = digits.length === maxDigits && !candidate;

  const handleDigit = useCallback((d: string) => {
    if (confirmed) return;
    if (digits.length < maxDigits) {
      setDigits((prev) => prev + d);
    }
  }, [digits, confirmed]);

  const handleCorrect = useCallback(() => {
    if (confirmed) return;
    setDigits("");
  }, [confirmed]);

  const handleBlank = useCallback(() => {
    if (confirmed) return;
    setDigits("");
    setShowEndAnim(true);
    setTimeout(() => {
      setShowEndAnim(false);
      onVoteConfirmed({ number: -1, type: "branco" });
    }, 1200);
    setConfirmed(true);
  }, [confirmed, onVoteConfirmed]);

  const handleConfirm = useCallback(() => {
    if (confirmed || digits.length < maxDigits) return;
    setShowEndAnim(true);
    setTimeout(() => {
      setShowEndAnim(false);
      onVoteConfirmed({
        number: parseInt(digits),
        type: candidate ? "candidate" : "nulo",
      });
    }, 1200);
    setConfirmed(true);
  }, [confirmed, digits, candidate, onVoteConfirmed]);

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      if (e.key === "Backspace" || e.key === "Delete") handleCorrect();
      if (e.key === "Enter") handleConfirm();
      if (e.key === "b" || e.key === "B") handleBlank();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDigit, handleCorrect, handleConfirm, handleBlank]);

  const initials = candidate
    ? candidate.name.split(" ").map((n) => n[0]).slice(0, 2).join("")
    : "";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {turma.name} — Eleitor {voterNumber} de {totalVoters}
        </p>
        <button onClick={onBack} className="text-xs text-muted-foreground underline hover:text-foreground">
          ← Voltar para seleção
        </button>
      </div>

      {/* Urna Body */}
      <div className="w-full max-w-md bg-urna-body rounded-2xl border border-border shadow-2xl overflow-hidden">
        {/* Screen */}
        <div className="bg-urna-screen text-urna-screen-foreground p-5 m-4 rounded-lg min-h-[220px] flex flex-col relative">
          {showEndAnim ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center animate-pulse">
                <p className="text-3xl font-bold text-urna-screen-foreground">FIM</p>
                <p className="text-sm mt-1">Voto computado</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3 opacity-60">
                Líder de Turma
              </p>

              <div className="flex gap-4">
                {/* Number display */}
                <div>
                  <p className="text-xs mb-1 opacity-60">Número:</p>
                  <div className="flex gap-1">
                    {Array.from({ length: maxDigits }).map((_, i) => (
                      <div
                        key={i}
                        className="w-10 h-12 border-2 border-urna-screen-foreground/30 rounded flex items-center justify-center font-mono-display text-2xl font-bold"
                      >
                        {digits[i] || ""}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Candidate info */}
                {digits.length === maxDigits && (
                  <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-300">
                    {candidate ? (
                      <div className="flex gap-3 items-start">
                        <div className="w-16 h-20 rounded bg-urna-screen-foreground/10 flex items-center justify-center text-lg font-bold shrink-0">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs opacity-60">Nome:</p>
                          <p className="font-bold text-sm">{candidate.name}</p>
                          <p className="text-xs opacity-60 mt-1">Turma:</p>
                          <p className="text-sm">{candidate.turma}</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-destructive text-lg">VOTO NULO</p>
                        <p className="text-xs opacity-60 mt-1">
                          Número não corresponde a nenhum candidato
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Candidate list hint */}
              <div className="mt-auto pt-3 border-t border-urna-screen-foreground/10">
                <p className="text-[10px] opacity-50 mb-1">Candidatos:</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  {turma.candidates.map((c) => (
                    <span key={c.number} className="text-[11px] opacity-60">
                      <strong>{c.number}</strong> — {c.name.split(" ").slice(0, 2).join(" ")}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Keypad */}
        <div className="p-4 pt-2">
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
              <button
                key={n}
                onClick={() => handleDigit(String(n))}
                className={`h-12 rounded-lg bg-urna-key text-urna-key-foreground font-mono-display text-xl font-bold transition-all hover:bg-urna-key-hover active:scale-95 ${
                  n === 0 ? "col-start-2" : ""
                }`}
              >
                {n}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4 justify-center">
            <button
              onClick={handleCorrect}
              className="px-5 py-2.5 rounded-lg bg-urna-correct text-secondary-foreground font-bold text-sm uppercase tracking-wider transition-all hover:brightness-110 active:scale-95"
            >
              Corrige
            </button>
            <button
              onClick={handleBlank}
              className="px-5 py-2.5 rounded-lg bg-urna-blank text-secondary-foreground font-bold text-sm uppercase tracking-wider transition-all hover:brightness-95 active:scale-95"
            >
              Branco
            </button>
            <button
              onClick={handleConfirm}
              disabled={digits.length < maxDigits}
              className="px-5 py-2.5 rounded-lg bg-urna-confirm text-primary-foreground font-bold text-sm uppercase tracking-wider transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Urna;
