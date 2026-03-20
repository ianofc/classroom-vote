import { useState, useCallback, useEffect } from "react";
import { UserCheck, ShieldCheck, Moon, Sun } from "lucide-react";

const Urna = ({ turma, onVoteConfirmed, onBack, voterNumber, totalVoters }: any) => {
  const [step, setStep] = useState<'mesario' | 'urna'>('mesario');
  const [voterData, setVoterData] = useState({ name: "", document: "", contact: "" });
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Lógica de Votação em Sequência
  const rolesAvailable = Array.from(new Set(turma.candidates.map((c: any) => c.candidate_role))) as string[];
  const sequence = rolesAvailable.length > 0 ? rolesAvailable : ['Geral'];
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [votesArray, setVotesArray] = useState<any[]>([]);

  const [digits, setDigits] = useState("");
  const [showEndAnim, setShowEndAnim] = useState(false);
  const currentRole = sequence[currentRoleIndex];
  const maxDigits = 2;

  const candidate = digits.length === maxDigits
    ? turma.candidates.find((c: any) => c.candidate_number === parseInt(digits) && c.candidate_role === currentRole)
    : null;

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleDigit = useCallback((d: string) => {
    if (step !== 'urna' || showEndAnim) return;
    if (digits.length < maxDigits) setDigits((prev) => prev + d);
  }, [digits, step, showEndAnim]);

  const handleCorrect = useCallback(() => {
    if (step !== 'urna' || showEndAnim) return;
    setDigits("");
  }, [step, showEndAnim]);

  const processVote = (voteData: any) => {
    const newVotes = [...votesArray, voteData];
    if (currentRoleIndex < sequence.length - 1) {
      setVotesArray(newVotes);
      setCurrentRoleIndex(currentRoleIndex + 1);
      setDigits("");
    } else {
      setShowEndAnim(true);
      setTimeout(() => {
        onVoteConfirmed(newVotes, voterData);
        setVoterData({ name: "", document: "", contact: "" });
        setVotesArray([]);
        setCurrentRoleIndex(0);
        setDigits("");
        setStep('mesario');
        setShowEndAnim(false);
      }, 2000);
    }
  };

  const handleBlank = useCallback(() => {
    if (step !== 'urna' || showEndAnim) return;
    processVote({ role: currentRole, number: -1, type: "branco" });
  }, [step, showEndAnim, currentRole, votesArray, currentRoleIndex, sequence]);

  const handleConfirm = useCallback(() => {
    if (step !== 'urna' || showEndAnim || digits.length < maxDigits) return;
    processVote({ role: currentRole, number: parseInt(digits), type: candidate ? "candidate" : "nulo" });
  }, [step, showEndAnim, digits, candidate, currentRole, votesArray, currentRoleIndex, sequence]);

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
      <button onClick={() => setIsDarkMode(!isDarkMode)} className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-slate-800 shadow-md text-slate-600 dark:text-slate-300">
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {step === 'mesario' ? (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-t-4 border-blue-600">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
            <UserCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase">Mesário</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Turma: {turma.name}</p>
            </div>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setStep('urna'); }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Nome Completo</label>
              <input required autoFocus className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={voterData.name} onChange={e => setVoterData({...voterData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Documento (RG/CPF)</label>
              <input required className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={voterData.document} onChange={e => setVoterData({...voterData, document: e.target.value})} />
            </div>
            <button type="submit" className="w-full mt-6 bg-green-600 text-white font-black uppercase py-4 rounded-lg flex justify-center items-center gap-2">
              <ShieldCheck className="w-5 h-5" /> Liberar Urna
            </button>
            <button type="button" onClick={onBack} className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600">Cancelar Eleição</button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-[1fr_380px] shadow-2xl rounded-lg overflow-hidden border border-slate-300">
          <div className="bg-[#f4f4f4] min-h-[500px] p-6 relative flex flex-col justify-between">
            {showEndAnim ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center">
                  <p className="text-7xl font-extrabold tracking-widest text-slate-800">FIM</p>
                  <p className="text-lg text-slate-500 mt-2 font-bold">VOTOU</p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-black tracking-widest text-slate-800 uppercase">Seu voto para</p>
                  <p className="text-3xl font-black uppercase text-blue-800">{currentRole}</p>
                  
                  <div className="mt-8 grid grid-cols-[100px_1fr] gap-6 items-start">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-600">Número</p>
                      <div className="flex gap-2">
                        {Array.from({ length: maxDigits }).map((_, i) => (
                          <div key={i} className="w-12 h-16 border border-slate-800 bg-white flex items-center justify-center text-4xl font-black shadow-inner">{digits[i] || ""}</div>
                        ))}
                      </div>
                    </div>

                    {digits.length === maxDigits && candidate ? (
                      <div className="flex flex-col gap-2 pl-4 border-l-2 border-slate-300">
                        {/* FOTOS LADO A LADO */}
                        <div className="flex items-end gap-3 mb-2">
                          <div className="w-[110px] h-[150px] border-2 border-slate-800 bg-white flex flex-col shadow-sm">
                            {candidate.photo_url ? <img src={candidate.photo_url} className="w-full flex-1 object-cover" /> : <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-bold bg-slate-100">Sem Foto</div>}
                            <div className="bg-slate-800 text-white text-[9px] text-center py-0.5 uppercase font-bold tracking-widest">Titular</div>
                          </div>
                          {(candidate.vice_name || candidate.vice_photo_url) && (
                            <div className="w-[85px] h-[115px] border-2 border-slate-800 bg-white flex flex-col shadow-sm">
                              {candidate.vice_photo_url ? <img src={candidate.vice_photo_url} className="w-full flex-1 object-cover" /> : <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 font-bold bg-slate-100">Sem Foto</div>}
                              <div className="bg-slate-800 text-white text-[9px] text-center py-0.5 uppercase font-bold tracking-widest">Vice</div>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-2xl text-slate-800 leading-none">{candidate.name}</p>
                          {candidate.vice_name && <p className="font-bold text-sm text-slate-600 mt-1">Vice: {candidate.vice_name}</p>}
                        </div>
                      </div>
                    ) : digits.length === maxDigits ? (
                      <div className="pl-4"><p className="font-black text-5xl text-slate-800 mt-4">VOTO NULO</p></div>
                    ) : null}
                  </div>
                </div>
                <div className="border-t-2 border-slate-800 pt-3 text-xs font-bold text-slate-800 flex flex-col gap-1">
                  <p className="text-green-700">VERDE para CONFIRMAR este voto</p>
                  <p className="text-orange-600">LARANJA para REINICIAR este voto</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-[#2b2b2b] flex flex-col">
            <div className="bg-slate-100 h-[80px] flex items-center px-4 justify-between border-b-4 border-[#1a1a1a]">
              <div className="h-[50px] px-4 bg-[#202683] text-white flex items-center justify-center font-black text-xl tracking-widest">CEEPS</div>
              <div className="text-right leading-none"><p className="text-2xl font-black text-slate-800 tracking-tighter">JUSTIÇA</p><p className="text-xl font-black text-slate-800 tracking-tighter">ELEITORAL</p></div>
            </div>
            <div className="p-8 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                  <button key={n} onClick={() => handleDigit(String(n))} className={`h-14 rounded-md bg-[#1a1a1a] shadow-[0_4px_0_#000] text-white text-2xl font-black hover:bg-[#333] active:translate-y-1 active:shadow-none ${n === 0 ? "col-start-2" : ""}`}>{n}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-8 justify-center">
                <button onClick={handleBlank} className="h-12 w-[80px] rounded bg-white shadow-[0_3px_0_#999] font-black text-[10px] uppercase active:translate-y-1 active:shadow-none">Branco</button>
                <button onClick={handleCorrect} className="h-12 w-[80px] rounded bg-[#e86a10] shadow-[0_3px_0_#b34d00] font-black text-[10px] uppercase active:translate-y-1 active:shadow-none">Corrige</button>
                <button onClick={handleConfirm} disabled={digits.length < maxDigits} className="h-14 w-[90px] rounded bg-[#108c4f] shadow-[0_3px_0_#0a5932] font-black text-xs uppercase -mt-2 active:translate-y-1 active:shadow-none disabled:opacity-50">Confirma</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Urna;
