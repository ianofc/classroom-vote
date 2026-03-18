import { useState, useCallback, useEffect } from "react";
import { Turma } from "@/data/turmas";
import { UserCheck, ShieldCheck, Moon, Sun } from "lucide-react";

interface VoterData {
  name: string;
  document: string;
  contact: string;
}

interface UrnaProps {
  turma: Turma;
  onVoteConfirmed: (vote: { number: number; type: "candidate" | "branco" | "nulo" }, voterData: VoterData) => void;
  onBack: () => void;
  voterNumber: number;
  totalVoters: number;
}

const Urna = ({ turma, onVoteConfirmed, onBack, voterNumber, totalVoters }: UrnaProps) => {
  // Etapas: 'mesario' (identificação) -> 'urna' (votação)
  const [step, setStep] = useState<'mesario' | 'urna'>('mesario');
  const [voterData, setVoterData] = useState<VoterData>({ name: "", document: "", contact: "" });
  
  // Tema (Dark/Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Estados da Urna
  const [digits, setDigits] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [showEndAnim, setShowEndAnim] = useState(false);

  const maxDigits = 2; // Pode ajustar conforme a necessidade (ex: 5 para vereador)
  const candidate = digits.length === maxDigits
    ? turma.candidates.find((c) => c.number === parseInt(digits))
    : null;

  useEffect(() => {
    // Aplica a classe dark no elemento html principal
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleLiberarUrna = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterData.name || !voterData.document) return;
    setStep('urna');
  };

  // --- Lógicas do Teclado da Urna ---
  const handleDigit = useCallback((d: string) => {
    if (confirmed || step !== 'urna') return;
    if (digits.length < maxDigits) setDigits((prev) => prev + d);
  }, [digits, confirmed, step]);

  const handleCorrect = useCallback(() => {
    if (confirmed || step !== 'urna') return;
    setDigits("");
  }, [confirmed, step]);

  const handleBlank = useCallback(() => {
    if (confirmed || step !== 'urna') return;
    setDigits("");
    setShowEndAnim(true);
    setTimeout(() => {
      setShowEndAnim(false);
      onVoteConfirmed({ number: -1, type: "branco" }, voterData);
      
      // Reinicia a urna para o próximo eleitor
      setVoterData({ name: "", document: "", contact: "" });
      setStep('mesario');
      setConfirmed(false);
    }, 1500);
    setConfirmed(true);
  }, [confirmed, onVoteConfirmed, voterData, step]);

  const handleConfirm = useCallback(() => {
    if (confirmed || digits.length < maxDigits || step !== 'urna') return;
    setShowEndAnim(true);
    setTimeout(() => {
      setShowEndAnim(false);
      onVoteConfirmed({
        number: parseInt(digits),
        type: candidate ? "candidate" : "nulo",
      }, voterData);
      
      // Reinicia a urna para o próximo eleitor limpando os rastros
      setVoterData({ name: "", document: "", contact: "" });
      setDigits("");
      setStep('mesario');
      setConfirmed(false);
    }, 1500);
    setConfirmed(true);
  }, [confirmed, digits, candidate, onVoteConfirmed, voterData, step]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (step !== 'urna') return;
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      if (e.key === "Backspace" || e.key === "Delete") handleCorrect();
      if (e.key === "Enter") handleConfirm();
      if (e.key === "b" || e.key === "B") handleBlank();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleDigit, handleCorrect, handleConfirm, handleBlank, step]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 p-4 md:p-8 flex flex-col items-center justify-center gap-4 relative">
      
      {/* Botão de Troca de Tema */}
      <button 
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-slate-800 shadow-md text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="text-center space-y-1 mb-4">
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          {turma.name} — Eleitor {voterNumber} de {totalVoters}
        </p>
        <button onClick={onBack} className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          ← Cancelar e Voltar
        </button>
      </div>

      {step === 'mesario' ? (
        /* ================= TERMINAL DO MESÁRIO ================= */
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-t-4 border-blue-600 transition-all">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <UserCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase">Terminal do Mesário</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Identificação obrigatória do eleitor</p>
            </div>
          </div>

          <form onSubmit={handleLiberarUrna} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Nome Completo</label>
              <input 
                type="text" required autoFocus
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 font-medium"
                value={voterData.name}
                onChange={e => setVoterData({...voterData, name: e.target.value})}
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Documento (RG ou CPF)</label>
              <input 
                type="text" required
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 font-medium tracking-wider"
                value={voterData.document}
                onChange={e => setVoterData({...voterData, document: e.target.value})}
                placeholder="Apenas números"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Celular / Contato</label>
              <input 
                type="text"
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-400 font-medium"
                value={voterData.contact}
                onChange={e => setVoterData({...voterData, contact: e.target.value})}
                placeholder="(75) 90000-0000"
              />
            </div>

            <button type="submit" className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest py-4 rounded-lg flex justify-center items-center gap-2 transition-colors shadow-md">
              <ShieldCheck className="w-5 h-5" /> Liberar Urna
            </button>
          </form>
        </div>
      ) : (
        /* ================= URNA ELETRÔNICA ================= */
        <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-0 items-stretch shadow-2xl rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700">
          
          {/* TELA DA URNA */}
          <div className="bg-[#f4f4f4] min-h-[500px] p-6 relative">
            {showEndAnim ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <p className="text-7xl font-extrabold tracking-widest text-slate-800">FIM</p>
                  <p className="text-lg text-slate-500 mt-2 font-bold">VOTOU</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <p className="text-sm font-black tracking-widest text-slate-800 uppercase">Candidato / Chapa</p>
                  <div className="mt-8 grid grid-cols-[100px_1fr] gap-6 items-start">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-600">Número</p>
                      <div className="flex gap-2">
                        {Array.from({ length: maxDigits }).map((_, i) => (
                          <div key={i} className="w-12 h-16 border border-slate-800 bg-white flex items-center justify-center text-4xl font-black shadow-inner">
                            {digits[i] || ""}
                          </div>
                        ))}
                      </div>
                    </div>

                    {digits.length === maxDigits && candidate ? (
                      <div className="flex gap-4 items-start pl-4 border-l-2 border-slate-300">
                        <div className="w-[120px] h-[160px] border-2 border-slate-800 bg-white overflow-hidden shadow-sm">
                          {candidate.photo ? (
                            <img src={candidate.photo} alt={candidate.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold bg-slate-100">Sem Foto</div>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase">Nome</p>
                          <p className="font-black text-2xl text-slate-800 leading-none mb-3">{candidate.name}</p>
                          {candidate.vice_name && (
                            <>
                              <p className="text-xs font-bold text-slate-500 uppercase mt-2">Vice</p>
                              <p className="font-bold text-lg text-slate-700">{candidate.vice_name}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : digits.length === maxDigits ? (
                      <div className="pl-4">
                        <p className="font-black text-5xl text-slate-800 mt-4">VOTO NULO</p>
                        <p className="text-slate-500 font-bold mt-2">Número não encontrado.</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="border-t-2 border-slate-800 pt-3 text-xs font-bold text-slate-800 flex flex-col gap-1">
                  <p>Aperte a tecla:</p>
                  <p className="text-green-700">VERDE para CONFIRMAR este voto</p>
                  <p className="text-orange-600">LARANJA para REINICIAR este voto</p>
                </div>
              </div>
            )}
          </div>

          {/* TECLADO DA URNA */}
          <div className="bg-[#2b2b2b] flex flex-col">
            <div className="bg-slate-100 h-[80px] flex items-center px-4 justify-between border-b-4 border-[#1a1a1a]">
              <div className="h-[50px] px-4 bg-[#202683] text-white flex items-center justify-center font-black text-xl tracking-widest shadow-inner">
                CEEPS
              </div>
              <div className="text-right leading-none">
                <p className="text-2xl font-black text-slate-800 tracking-tighter">JUSTIÇA</p>
                <p className="text-xl font-black text-slate-800 tracking-tighter">ELEITORAL</p>
              </div>
            </div>

            <div className="p-8 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                  <button
                    key={n} onClick={() => handleDigit(String(n))}
                    className={`h-14 rounded-md bg-[#1a1a1a] shadow-[0_4px_0_#000] text-white text-2xl font-black hover:bg-[#333] active:translate-y-1 active:shadow-none transition-all ${n === 0 ? "col-start-2" : ""}`}
                  >
                    {n}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mt-8 justify-center">
                <button onClick={handleBlank} className="h-12 w-[80px] rounded bg-white shadow-[0_3px_0_#999] text-slate-800 font-black text-[10px] uppercase active:translate-y-1 active:shadow-none transition-all">
                  Branco
                </button>
                <button onClick={handleCorrect} className="h-12 w-[80px] rounded bg-[#e86a10] shadow-[0_3px_0_#b34d00] text-slate-900 font-black text-[10px] uppercase active:translate-y-1 active:shadow-none transition-all">
                  Corrige
                </button>
                <button onClick={handleConfirm} disabled={digits.length < maxDigits} className="h-14 w-[90px] rounded bg-[#108c4f] shadow-[0_3px_0_#0a5932] text-slate-900 font-black text-xs uppercase -mt-2 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:shadow-[0_3px_0_#0a5932]">
                  Confirma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Urna;
