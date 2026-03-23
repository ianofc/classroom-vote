import { useState, useCallback, useEffect } from "react";
import { UserCheck, ShieldCheck, Moon, Sun, Loader2, Maximize, Minimize } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";

// ==================== MOTOR DE ÁUDIO DO TSE ====================
const playUrnaSound = (type: 'key' | 'end') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square'; 

    if (type === 'key') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime); 
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
      osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'end') {
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime); 
      osc.start();
      gain.gain.setValueAtTime(0.1, ctx.currentTime + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      osc.stop(ctx.currentTime + 1.2);
    }
  } catch (e) {
    console.error("Áudio não suportado ou bloqueado", e);
  }
};

const Urna = ({ turma, onVoteConfirmed, onBack }: any) => {
  const [step, setStep] = useState<'identificacao' | 'urna'>('identificacao');
  const [voterData, setVoterData] = useState({ name: "" }); 
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [turmaStudents, setTurmaStudents] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('students').select('*').eq('turma_id', turma.id).then(({data}) => {
      if (data) setTurmaStudents(data);
    });

    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [turma.id]);

  const rolesAvailable = Array.from(new Set(turma.candidates.map((c: any) => c.candidate_role))) as string[];
  const sequence = rolesAvailable.length > 0 ? rolesAvailable : ['Líder Geral'];
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [votesArray, setVotesArray] = useState<any[]>([]);

  const [digits, setDigits] = useState("");
  const [showEndAnim, setShowEndAnim] = useState(false);
  const currentRole = sequence[currentRoleIndex];
  
  // ==================== REGRA DOS DÍGITOS ====================
  // Se for Líder Geral são 2 dígitos (dezena), os restantes são 3 (centena)
  const maxDigits = currentRole === 'Líder Geral' ? 2 : 3;

  const candidate = digits.length === maxDigits
    ? turma.candidates.find((c: any) => c.candidate_number === parseInt(digits) && c.candidate_role === currentRole)
    : null;

  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        toast({ title: "Erro", description: "O seu navegador bloqueou o Ecrã Inteiro.", variant: "destructive" });
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleLiberarUrna = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voterData.name.trim()) {
      toast({ title: "Atenção", description: "Preencha o nome para votar.", variant: "destructive" });
      return;
    }

    setIsAuthenticating(true);
    const nameTrimmed = voterData.name.trim();

    const studentEncontrado = turmaStudents.find(s => normalize(s.name) === normalize(nameTrimmed));

    if (!studentEncontrado) {
      const { error } = await supabase
        .from('students')
        .insert({ turma_id: turma.id, name: nameTrimmed, is_candidate: false });

      if (error) {
        setIsAuthenticating(false);
        toast({ title: "Erro de Registo", description: "Não foi possível registar o aluno.", variant: "destructive" });
        return;
      }
    }

    setIsAuthenticating(false);
    setStep('urna');
  };

  const handleDigit = useCallback((d: string) => {
    if (step !== 'urna' || showEndAnim) return;
    if (digits.length < maxDigits) {
      playUrnaSound('key');
      setDigits((prev) => prev + d);
    }
  }, [digits, step, showEndAnim, maxDigits]);

  const handleCorrect = useCallback(() => {
    if (step !== 'urna' || showEndAnim) return;
    playUrnaSound('key');
    setDigits("");
  }, [step, showEndAnim]);

  const processVote = (voteData: any) => {
    const newVotes = [...votesArray, voteData];
    
    if (currentRoleIndex < sequence.length - 1) {
      playUrnaSound('key'); 
      setVotesArray(newVotes);
      setCurrentRoleIndex(currentRoleIndex + 1);
      setDigits("");
    } else {
      playUrnaSound('end');
      setShowEndAnim(true);
      setTimeout(() => {
        onVoteConfirmed(newVotes, voterData);
        setVoterData({ name: "" });
        setVotesArray([]);
        setCurrentRoleIndex(0);
        setDigits("");
        setStep('identificacao');
        setShowEndAnim(false);
      }, 2500);
    }
  };

  const handleBlank = useCallback(() => {
    if (step !== 'urna' || showEndAnim) return;
    playUrnaSound('key');
    processVote({ role: currentRole, number: -1, type: "branco" });
  }, [step, showEndAnim, currentRole, votesArray, currentRoleIndex, sequence]);

  const handleConfirm = useCallback(() => {
    if (step !== 'urna' || showEndAnim || digits.length < maxDigits) return;
    processVote({ role: currentRole, number: parseInt(digits), type: candidate ? "candidate" : "nulo" });
  }, [step, showEndAnim, digits, candidate, currentRole, votesArray, currentRoleIndex, sequence, maxDigits]);

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
          
          <button 
            onClick={toggleFullscreen} 
            title="Ativar/Desativar Ecrã Inteiro"
            className="absolute top-6 right-6 text-slate-400 hover:text-blue-600 transition-colors"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-5 pt-2">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Mesa Receptora</h2>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1">Turma: {turma.name}</p>
            </div>
          </div>
          
          <form onSubmit={handleLiberarUrna} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase mb-1">Nome do Eleitor</label>
              <input 
                required autoFocus 
                className="w-full p-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-lg" 
                value={voterData.name} 
                onChange={e => setVoterData({ name: e.target.value })} 
                placeholder="Ex: Ana Souza"
              />
            </div>
            
            <button type="submit" disabled={isAuthenticating} className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg disabled:opacity-50">
              {isAuthenticating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />} 
              {isAuthenticating ? "Validando..." : "Liberar Urna"}
            </button>
            <button type="button" onClick={onBack} className="w-full py-3 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest mt-2 transition-colors">
              Encerrar e Voltar
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
                  
                  <div className="grid grid-cols-[120px_1fr] md:grid-cols-[180px_1fr] gap-8 items-start">
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Número</p>
                      <div className="flex gap-2">
                        {/* OS QUADRADINHOS AGORA SE ADAPTAM (2 OU 3) BASEADOS NO MAXDIGITS */}
                        {Array.from({ length: maxDigits }).map((_, i) => (
                          <div key={i} className="w-12 h-16 md:w-14 md:h-20 border-2 border-slate-800 bg-white flex items-center justify-center text-4xl md:text-5xl font-black shadow-inner rounded-sm">{digits[i] || ""}</div>
                        ))}
                      </div>
                    </div>

                    {digits.length === maxDigits && candidate ? (
                      <div className="flex flex-col justify-center pl-6 border-l-4 border-slate-300 animate-in fade-in slide-in-from-left-4 duration-300 h-full">
                        <p className="font-black text-3xl md:text-4xl text-slate-800 leading-none mb-3">{candidate.name}</p>
                        {candidate.vice_name && <p className="font-bold text-base md:text-lg text-slate-600 bg-slate-200 inline-block px-3 py-1 rounded self-start">Vice: {candidate.vice_name}</p>}
                      </div>
                    ) : digits.length === maxDigits ? (
                      <div className="pl-6 flex items-center h-full animate-in fade-in duration-300">
                        <p className="font-black text-4xl md:text-5xl text-slate-800 tracking-tighter">VOTO NULO</p>
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
                <button onClick={handleCorrect} className="h-14 w-[85px] rounded-sm bg-[#e86a10] border-t border-white/20 shadow-[0_4px_0_#b34d00] text-slate-900 font-black text-[11px] uppercase tracking-wider active:translate-y-1 active:shadow-none transition-all">Corrige</button>
                <button onClick={handleConfirm} disabled={digits.length < maxDigits} className="h-16 w-[100px] rounded-sm bg-[#108c4f] border-t border-white/20 shadow-[0_4px_0_#0a5932] text-white font-black text-sm uppercase tracking-wider active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 disabled:active:translate-y-0 disabled:shadow-[0_4px_0_#0a5932]">Confirma</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Urna;
