import { useState, useCallback, useEffect } from "react";
import { Turma } from "@/data/turmas";

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

  return (
    <div className="min-h-screen bg-[#cdc8bc] p-4 md:p-8 flex flex-col items-center justify-center gap-4">
      <div className="text-center space-y-1">
        <p className="text-sm text-zinc-700">
          {turma.name} — Eleitor {voterNumber} de {totalVoters}
        </p>
        <button onClick={onBack} className="text-xs text-zinc-600 underline hover:text-zinc-900">
          ← Voltar para seleção
        </button>
      </div>

      <div className="w-full max-w-[1280px] grid grid-cols-1 lg:grid-cols-[1fr_430px] gap-8 items-stretch">
        <div className="bg-[#f4f4f4] border border-black/10 min-h-[520px] rounded-sm p-6">
          {showEndAnim ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center animate-pulse">
                <p className="text-6xl font-extrabold">FIM</p>
                <p className="text-lg">Voto computado</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between">
              <div>
                <p className="text-xs tracking-[0.2em] text-zinc-600 uppercase">Líder de Turma</p>
                <div className="mt-6 grid grid-cols-[120px_1fr] gap-6 items-start">
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-600">Número</p>
                    <div className="flex gap-2">
                      {Array.from({ length: maxDigits }).map((_, i) => (
                        <div
                          key={i}
                          className="w-12 h-14 border-2 border-zinc-500 bg-white flex items-center justify-center text-3xl font-black"
                        >
                          {digits[i] || ""}
                        </div>
                      ))}
                    </div>
                  </div>

                  {digits.length === maxDigits && candidate ? (
                    <div className="flex gap-4 items-start">
                      <div className="w-[130px] h-[160px] border border-black/20 bg-white overflow-hidden flex items-center justify-center">
                        {candidate.photo ? (
                          <img src={candidate.photo} alt={candidate.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs text-zinc-500 px-2 text-center">Sem imagem</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-zinc-500">Nome:</p>
                        <p className="font-bold text-xl">{candidate.name}</p>
                        <p className="text-sm text-zinc-500 mt-3">Turma:</p>
                        <p className="text-lg">{candidate.turma}</p>
                      </div>
                    </div>
                  ) : digits.length === maxDigits ? (
                    <div>
                      <p className="font-black text-4xl text-red-600">VOTO NULO</p>
                      <p className="text-zinc-600">Número não corresponde a nenhum candidato.</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-black/20 pt-3 text-sm text-zinc-600">
                Digite o número do candidato e pressione <strong>CONFIRMA</strong>.
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#666062] border border-black/10 rounded-sm overflow-hidden">
          <div className="bg-[#f5f5f3] h-[92px] grid grid-cols-[120px_1fr] items-center">
            <div className="h-full bg-[#202683] text-white flex items-center justify-center text-xs font-bold text-center p-2">
              CEEPS
            </div>
            <div className="text-center leading-tight">
              <p className="text-5xl font-black tracking-wide">CEEPS</p>
              <p className="text-3xl font-black tracking-wide">ELEITORAL</p>
            </div>
          </div>

          <div className="p-7">
            <div className="grid grid-cols-3 gap-4 max-w-[290px] mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                <button
                  key={n}
                  onClick={() => handleDigit(String(n))}
                  className={`h-20 rounded-[24px] bg-black text-white text-6xl font-black transition-all hover:opacity-90 active:scale-95 ${
                    n === 0 ? "col-start-2" : ""
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8 justify-center">
              <button
                onClick={handleBlank}
                className="h-16 px-6 rounded-[22px] bg-white text-black font-black text-3xl uppercase"
              >
                Branco
              </button>
              <button
                onClick={handleCorrect}
                className="h-16 px-6 rounded-[22px] bg-[#ee9133] text-black font-black text-3xl uppercase"
              >
                Corrige
              </button>
              <button
                onClick={handleConfirm}
                disabled={digits.length < maxDigits}
                className="h-16 px-6 rounded-[22px] bg-[#0dd16f] text-black font-black text-3xl uppercase disabled:opacity-40"
              >
                Confirma
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Urna;
