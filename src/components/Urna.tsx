import { useState, useCallback, useEffect, useMemo } from "react";
import { UserCheck, ShieldCheck, Moon, Sun } from "lucide-react";

const CATEGORIES_ORDER = ["Líder Geral", "Líder Quilombola", "Líder Indígena", "Líder LGBTQIA+", "Líder Rural"];

const Urna = ({ turma, onVoteConfirmed, onBack, voterNumber, totalVoters }: any) => {
  const [step, setStep] = useState<'mesario' | 'urna'>('mesario');
  const [voterData, setVoterData] = useState({ name: "", document: "", contact: "" });
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Descobre quais cargos têm candidatos nesta turma e os ordena
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(turma.candidates.map((c: any) => c.category || 'Líder Geral'))) as string[];
    return cats.sort((a, b) => CATEGORIES_ORDER.indexOf(a) - CATEGORIES_ORDER.indexOf(b));
  }, [turma]);

  const [currentCatIndex, setCurrentCatIndex] = useState(0);
  const [sessionVotes, setSessionVotes] = useState<any[]>([]);
  
  const [digits, setDigits] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);
  const [showEndAnim, setShowEndAnim] = useState(false);
  const maxDigits = 2; 

  const activeCategory = availableCategories[currentCatIndex] || 'Líder Geral';
  const activeCandidates = turma.candidates.filter((c: any) => (c.category || 'Líder Geral') === activeCategory);
  
  const candidate = digits.length === maxDigits ? activeCandidates.find((c:any) => c.number === parseInt(digits)) : null;

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleDigit = useCallback((d: string) => {
    if (confirmed || step !== 'urna') return;
    if (digits.length < maxDigits) setDigits(prev => prev + d);
  }, [digits, confirmed, step]);

  const handleCorrect = useCallback(() => {
    if (confirmed || step !== 'urna') return;
    setDigits("");
  }, [confirmed, step]);

  const processVote = useCallback((voteData: any) => {
    const newVotes = [...sessionVotes, voteData];
    
    if (currentCatIndex < availableCategories.length - 1) {
      setSessionVotes(newVotes);
      setCurrentCatIndex(i => i + 1);
      setDigits("");
      setConfirmed(false);
    } else {
      setShowEndAnim(true);
      setTimeout(() => {
        onVoteConfirmed(newVotes, voterData);
        setVoterData({ name: "", document: "", contact: "" });
        setSessionVotes([]);
        setCurrentCatIndex(0);
        setDigits("");
        setStep('mesario');
        setConfirmed(false);
        setShowEndAnim(false);
      }, 1500);
    }
  }, [currentCatIndex, availableCategories, sessionVotes, onVoteConfirmed, voterData]);

  const handleBlank = useCallback(() => {
    if (confirmed || step !== 'urna') return;
    setConfirmed(true);
    processVote({ number: -1, type: "branco", category: activeCategory });
  }, [confirmed, step, processVote, activeCategory]);

  const handleConfirm = useCallback(() => {
    if (confirmed || digits.length < maxDigits || step !== 'urna') return;
    setConfirmed(true);
    processVote({ number: parseInt(digits), type: candidate ? "candidate" : "nulo", category: activeCategory });
  }, [confirmed, digits, candidate, step, processVote, activeCategory]);

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
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8 flex flex-col items-center justify-center relative">
      <button onClick={() => setIsDarkMode(!isDarkMode)} className="absolute top-4 right-4 p-3 rounded-full bg-white dark:bg-slate-800 shadow-md">
        {isDarkMode ? <Sun className="w-5 h-5 text-white" /> : <Moon className="w-5 h-5 text-slate-800" />}
      </button>

      <div className="text-center space-y-1 mb-4">
        <p className="text-sm font-bold text-slate-500 uppercase">{turma.name} — Eleitor {voterNumber} de {totalVoters}</p>
        <button onClick={onBack} className="text-xs text-blue-600 font-semibold hover:underline">← Cancelar Sessão</button>
      </div>

      {step === 'mesario' ? (
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border-t-4 border-blue-600">
          <div className="flex items-center gap-3 mb-6 border-b pb-4"><UserCheck className="w-8 h-8 text-blue-600" /><div><h2 className="text-xl font-black dark:text-white uppercase">Terminal do Mesário</h2></div></div>
          <form onSubmit={e => { e.preventDefault(); setStep('urna'); }} className="space-y-4">
            <input required autoFocus className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:text-white" placeholder="Nome Completo do Aluno" value={voterData.name} onChange={e => setVoterData({...voterData, name: e.target.value})} />
            <input required className="w-full p-3 border rounded-lg bg-white dark:bg-slate-700 dark:text-white" placeholder="Documento (RG/CPF)" value={voterData.document} onChange={e => setVoterData({...voterData, document: e.target.value})} />
            <button type="submit" className="w-full mt-6 bg-green-600 text-white font-black py-4 rounded-lg flex justify-center items-center gap-2"><ShieldCheck className="w-5 h-5" /> Liberar Urna</button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-[1fr_380px] shadow-2xl rounded-lg overflow-hidden border">
          <div className="bg-[#f4f4f4] min-h-[500px] p-6 relative">
            {showEndAnim ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
                <p className="text-7xl font-extrabold tracking-widest text-slate-800">FIM</p><p className="text-lg text-slate-500 mt-2 font-bold">VOTOU</p>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-between">
                <div>
                  <p className="text-lg font-black tracking-widest text-slate-800 uppercase border-b-2 border-slate-300 pb-2 inline-block">Voto para: <span className="text-blue-700">{activeCategory}</span></p>
                  <div className="mt-8 grid grid-cols-[100px_1fr] gap-6 items-start">
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-600">Número</p>
                      <div className="flex gap-2">
                        {Array.from({ length: maxDigits }).map((_, i) => <div key={i} className="w-12 h-16 border border-slate-800 bg-white flex items-center justify-center text-4xl font-black">{digits[i] || ""}</div>)}
                      </div>
                    </div>

                    {digits.length === maxDigits && candidate ? (
                      <div className="flex gap-6 items-start pl-4 border-l-2 border-slate-300">
                        {/* Fotos Lado a Lado */}
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-[100px] h-[130px] border-2 border-slate-800 bg-white shadow-sm">
                              {candidate.photo ? <img src={candidate.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 bg-slate-100">Sem Foto</div>}
                            </div>
                            <span className="text-[10px] font-bold uppercase text-slate-500">Titular</span>
                          </div>
                          {candidate.vice_name && (
                            <div className="flex flex-col items-center gap-1">
                              <div className="w-[80px] h-[104px] border-2 border-slate-800 bg-white shadow-sm opacity-90">
                                {candidate.vice_photo ? <img src={candidate.vice_photo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 bg-slate-100">Sem Foto</div>}
                              </div>
                              <span className="text-[10px] font-bold uppercase text-slate-500">Vice</span>
                            </div>
                          )}
                        </div>
                        {/* Textos */}
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase">Nome</p>
                          <p className="font-black text-2xl text-slate-800 leading-none mb-3">{candidate.name}</p>
                          {candidate.vice_name && <><p className="text-xs font-bold text-slate-500 uppercase mt-2">Vice</p><p className="font-bold text-md text-slate-700">{candidate.vice_name}</p></>}
                        </div>
                      </div>
                    ) : digits.length === maxDigits ? (
                      <div className="pl-4"><p className="font-black text-5xl mt-4">VOTO NULO</p></div>
                    ) : null}
                  </div>
                </div>
                <div className="border-t-2 border-slate-800 pt-3 text-xs font-bold flex flex-col gap-1">
                  <p className="text-green-700">VERDE para CONFIRMAR</p><p className="text-orange-600">LARANJA para REINICIAR</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-[#2b2b2b] flex flex-col">
            <div className="bg-slate-100 h-[80px] flex items-center px-4 justify-between border-b-4 border-[#1a1a1a]">
              <div className="h-[50px] px-4 bg-[#202683] text-white flex items-center justify-center font-black text-xl">CEEPS</div>
              <div className="text-right leading-none"><p className="text-2xl font-black tracking-tighter">JUSTIÇA</p><p className="text-xl font-black tracking-tighter">ELEITORAL</p></div>
            </div>
            <div className="p-8 flex-1 flex flex-col justify-center">
              <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => <button key={n} onClick={() => handleDigit(String(n))} className={`h-14 rounded-md bg-[#1a1a1a] shadow-[0_4px_0_#000] text-white text-2xl font-black active:translate-y-1 active:shadow-none ${n===0?"col-start-2":""}`}>{n}</button>)}
              </div>
              <div className="flex gap-2 mt-8 justify-center">
                <button onClick={handleBlank} className="h-12 w-[80px] rounded bg-white shadow-[0_3px_0_#999] font-black text-[10px] uppercase active:translate-y-1 active:shadow-none">Branco</button>
                <button onClick={handleCorrect} className="h-12 w-[80px] rounded bg-[#e86a10] shadow-[0_3px_0_#b34d00] font-black text-[10px] uppercase active:translate-y-1 active:shadow-none">Corrige</button>
                <button onClick={handleConfirm} disabled={digits.length < maxDigits} className="h-14 w-[90px] rounded bg-[#108c4f] shadow-[0_3px_0_#0a5932] font-black text-xs uppercase -mt-2 disabled:opacity-50 active:translate-y-1 active:shadow-none">Confirma</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Urna;
