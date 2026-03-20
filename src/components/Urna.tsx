import { useState, useCallback, useEffect } from "react";
import { UserCheck, ShieldCheck, Moon, Sun } from "lucide-react";

const Urna = ({ turma, onVoteConfirmed, onBack, voterNumber, totalVoters }: any) => {
  // Etapas: 'identificacao' (dados do aluno) -> 'urna' (votação)
  const [step, setStep] = useState<'identificacao' | 'urna'>('identificacao');
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
        setStep('identificacao');
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
      <button onClick={() => setIsDarkMode(!isDarkMode)} className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-slate-800 shadow-md text-slate-600 dark:text-slate-300 z-50">
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {step === 'identificacao' ? (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border-t-4 border-blue-600 relative z-10 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-5">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Identificação do Aluno</h2>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">Turma: {turma.name}</p>
            </div>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); setStep('urna'); }} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Nome Completo</label>
              <input 
                required 
                autoFocus 
                className="w-full p-3.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" 
                value={voterData.name} 
                onChange={e => setVoterData({...voterData, name: e.target.value})} 
                placeholder="Ex: João da Silva"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Documento (RG ou CPF)</label>
              <input 
                required 
                className="w-full p-3.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium tracking-wide" 
                value={voterData.document} 
                onChange={e => setVoterData({...voterData, document: e.target.value})} 
                placeholder="Apenas números"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Contato (Telefone/WhatsApp)</label>
              <input 
                required
                className="w-full p-3.5 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium tracking-wide" 
                value={voterData.contact} 
                onChange={e => setVoterData({...voterData, contact: e.target.value})} 
                placeholder="(75) 90000-0000"
              />
            </div>
            
            <button type="submit" className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/30">
              <ShieldCheck className="w-5 h-5" /> Acessar Urna
            </button>
            <button type="button" onClick={onBack} className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest mt-2 transition-colors">
              Cancelar e Voltar
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-[1fr_380px] shadow-2xl rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-[#f4f4f4] min-h-[500px] p-6 lg:p-10 relative flex flex-col justify-between">
            {showEndAnim ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <div className="text-center animate-in zoom-in duration-500">
                  <p className="text-8xl font-black tracking-widest text-slate-800">FIM</p>
                  <p className="text-xl text-slate-500 mt-4 font-bold tracking-[0.5em] uppercase">Voto Computado</p>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm font-black tracking-widest text-slate-800 uppercase mb-1">Seu voto para</p>
                  <p className="text-4xl font-black uppercase text-blue-800 mb-8">{currentRole}</p>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-8 items-start">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número</p>
                      <div className="flex gap-2">
                        {Array.from({ length: maxDigits }).map((_, i) => (
                          <div key={i} className="w-14 h-20 border-2 border-slate-800 bg-white flex items-center justify-center text-5xl font-black shadow-inner rounded-sm">{digits[i] || ""}</div>
                        ))}
                      </div>
                    </div>

                    {digits.length === maxDigits && candidate ? (
                      <div className="flex flex-col gap-3 pl-6 border-l-4 border-slate-300 animate-in fade-in slide-in-from-left-4 duration-300">
                        {/* FOTOS LADO A LADO */}
                        <div className="flex items-end gap-4 mb-2">
                          <div className="w-[120px] h-[160px] border-2 border-slate-800 bg-white flex flex-col shadow-md rounded-sm overflow-hidden">
                            {candidate.photo_url ? <img src={candidate.photo_url} className="w-full flex-1 object-cover" alt="Titular" /> : <div className="flex-1 flex items-center justify-center text-xs text-slate-400 font-bold bg-slate-100">Sem Foto</div>}
                            <div className="bg-slate-800 text-white text-[10px] text-center py-1.5 uppercase font-bold tracking-widest">Titular</div>
                          </div>
                          {(candidate.vice_name || candidate.vice_photo_url) && (
                            <div className="w-[90px] h-[120px] border-2 border-slate-800 bg-white flex flex-col shadow-md rounded-sm overflow-hidden">
                              {candidate.vice_photo_url ? <img src={candidate.vice_photo_url} className="w-full flex-1 object-cover" alt="Vice" /> : <div className="flex-1 flex items-center justify-center text-[10px] text-slate-400 font-bold bg-slate-100 text-center px-2">Sem Foto</div>}
                              <div className="bg-slate-800 text-white text-[9px] text-center py-1 uppercase font-bold tracking-widest">Vice</div>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-black text-3xl text-slate-800 leading-none mb-2">{candidate.name}</p>
                          {candidate.vice_name && <p className="font-bold text-sm text-slate-600 bg-slate-200 inline-block px-2 py-1 rounded">Vice: {candidate.vice_name}</p>}
                        </div>
                      </div>
                    ) : digits.length === maxDigits ? (
                      <div className="pl-6 flex items-center h-full animate-in fade-in duration-300">
                        <p className="font-black text-5xl text-slate-800 tracking-tighter">VOTO NULO</p>
                      </div>
                    ) : null}
                  </div>
                </div>
                
                <div className="border-t-4 border-slate-800 pt-4 mt-8">
                  <p className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-widest">Aperte a tecla:</p>
                  <p className="text-green-700 font-bold text-sm uppercase tracking-wide">VERDE para CONFIRMAR este voto</p>
                  <p className="text-orange-600 font-bold text-sm uppercase tracking-wide">LARANJA para REINICIAR este voto</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-[#2b2b2b] flex flex-col">
            <div className="bg-slate-100 h-[90px] flex items-center px-6 justify-between border-b-4 border-[#1a1a1a]">
              <div className="h-[55px] px-6 bg-[#202683] text-white flex items-center justify-center font-black text-2xl tracking-widest rounded-sm shadow-inner">CEEPS</div>
              <div className="text-right leading-none">
                <p className="text-3xl font-black text-slate-800 tracking-tighter">JUSTIÇA</p>
                <p className="text-xl font-black text-slate-800 tracking-tighter">ELEITORAL</p>
              </div>
            </div>
            <div className="p-8 flex-1 flex flex-col justify-center bg-gradient-to-b from-[#2b2b2b] to-[#1a1a1a]">
              <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((n) => (
                  <button key={n} onClick={() => handleDigit(String(n))} className={`h-16 rounded-md bg-[#222] border-t border-white/10 shadow-[0_5px_0_#000] text-white text-3xl font-black hover:bg-[#333] active:translate-y-1 active:shadow-none transition-all ${n === 0 ? "col-start-2" : ""}`}>{n}</button>
                ))}
              </div>
              <div className="flex gap-3 mt-10 justify-center items-end">
                <button onClick={handleBlank} className="h-14 w-[85px] rounded-sm bg-white border-t border-white/50 shadow-[0_4px_0_#999] text-slate-800 font-black text-[11px] uppercase tracking-wider active:translate-y-1 active:shadow-none transition-all">Branco</button>
                <button onClick={handleCorrect} className="h-14 w-[85px] rounded-sm bg-[#e86a10] border-t border-white/20 shadow-[0_4px_0_#b34d00] text-slate-900 font-black text-[11px] uppercase tracking-wider active:translate-y-1 active:shadow-none transition
