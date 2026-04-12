import { useState, useMemo } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";

interface UrnaProps {
  turma: any; 
  onVoteConfirmed: (votes: any[]) => void;
  onBack: () => void;
}

const Urna = ({ turma, onVoteConfirmed, onBack }: UrnaProps) => {
  const [digits, setDigits] = useState("");
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [votesArray, setVotesArray] = useState<any[]>([]);
  const [showEndAnim, setShowEndAnim] = useState(false);
  const [receiptHash, setReceiptHash] = useState("");
  
  // TRANCA DE SEGURANÇA ANTI-SPAM
  const [isLocked, setIsLocked] = useState(false);

  // Apanha o vetor de eleições completo que o Index.tsx agora envia
  const electionsSequence = turma.allowedElections || [];
  const currentElection = electionsSequence[currentRoleIndex];

  // =========================================================================
  // PROTEÇÃO CONTRA O "ECRÃ BRANCO DA MORTE"
  // =========================================================================
  if (!currentElection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
        <div className="w-full max-w-md bg-white p-10 rounded-2xl shadow-2xl text-center border-t-4 border-red-500 animate-in zoom-in">
           <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6 drop-shadow-md" />
           <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">Falha de Configuração</h2>
           <p className="text-slate-500 text-sm mb-8 font-medium leading-relaxed">
             A sequência de votação não foi carregada. Verifique se o aluno tem perfis que correspondam aos cargos ativos nesta eleição.
           </p>
           <button onClick={onBack} className="w-full bg-slate-900 hover:bg-slate-800 text-white px-6 py-4 rounded-xl font-black uppercase tracking-widest transition-colors shadow-lg">
             Encerrar Sessão e Voltar
           </button>
        </div>
      </div>
    );
  }

  const candidate = useMemo(() => {
    if (digits.length === 0 || !currentElection) return null;
    return turma.candidates.find((c: any) => {
      // Comparação estrita do número digitado (Ex: Se digitou 10, ignora quem for 104 até digitar o 4)
      if (c.candidate_number !== parseInt(digits)) return false;
      const candRoles = c.candidate_role ? c.candidate_role.split(',').map((r: string) => r.trim().toLowerCase()) : [];
      const isCompetingForThis = candRoles.includes(currentElection.nome.toLowerCase());
      if (!isCompetingForThis) return false;
      if (currentElection.tipo === 'turma') {
         if (c.turma_id !== turma.id) return false; 
      }
      return true;
    });
  }, [digits, currentElection, turma.candidates, turma.id]);

  const playUrnaSound = (type: 'key' | 'end') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === 'key') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + 0.1);
      } else {
        const osc1 = audioCtx.createOscillator(); const osc2 = audioCtx.createOscillator(); const gain = audioCtx.createGain();
        osc1.type = 'square'; osc2.type = 'square';
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime); osc2.frequency.setValueAtTime(554, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
        osc1.connect(gain); osc2.connect(gain); gain.connect(audioCtx.destination);
        osc1.start(); osc2.start(); osc1.stop(audioCtx.currentTime + 1.5); osc2.stop(audioCtx.currentTime + 1.5);
      }
    } catch (e) { console.log("Audio not supported"); }
  };

  const handleNumber = (num: number) => {
    if (isLocked) return; 
    // Agora permite até 4 dígitos (Para chapas 104, 12, etc.)
    if (digits.length < 4) {
      playUrnaSound('key');
      setDigits(prev => prev + num);
    }
  };

  const handleCorrige = () => {
    if (isLocked) return; 
    playUrnaSound('key');
    setDigits("");
  };

  const handleBranco = () => {
    if (isLocked) return; 
    playUrnaSound('key');
    processVote({ role: currentElection.nome, eleicao_id: currentElection.eleicao_id, number: null, type: 'branco' });
  };

  const handleConfirma = () => {
    if (isLocked) return; 
    if (digits.length === 0) return;
    const voteType = candidate ? 'candidate' : 'nulo';
    processVote({ role: currentElection.nome, eleicao_id: currentElection.eleicao_id, number: parseInt(digits), type: voteType });
  };

  const processVote = (voteData: any) => {
    const newVotes = [...votesArray, voteData];
    
    if (currentRoleIndex < electionsSequence.length - 1) {
      playUrnaSound('key');
      setVotesArray(newVotes);
      setCurrentRoleIndex(currentRoleIndex + 1);
      setDigits("");
    } else {
      setIsLocked(true); 
      playUrnaSound('end');
      setReceiptHash(Math.random().toString(36).substring(2, 10).toUpperCase());
      setShowEndAnim(true);
      
      setTimeout(() => {
        onVoteConfirmed(newVotes);
      }, 4000); 
    }
  };

  // Prepara os "quadrados" brancos para os números com base no que já foi digitado (Mínimo 2 quadrados)
  const displayBoxes = Array.from({ length: Math.max(2, digits.length + 1) }).slice(0, 4);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="w-full max-w-4xl bg-slate-200 p-6 md:p-10 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-8 border-[6px] border-slate-300">
        <div className="flex-1 bg-white border-4 border-slate-300 rounded-xl p-6 relative min-h-[400px] shadow-inner overflow-hidden">
          {showEndAnim ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
              <div className="text-center animate-in zoom-in duration-500">
                <p className="text-8xl md:text-9xl font-black tracking-widest text-slate-800 drop-shadow-sm">FIM</p>
                <p className="text-lg md:text-xl text-green-600 mt-6 font-black tracking-[0.4em] md:tracking-[0.5em] uppercase flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /> Voto Computado
                </p>
              </div>
              <div className="absolute bottom-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Protocolo Criptográfico</p>
                <div className="bg-slate-50 border border-slate-200 px-6 py-2.5 rounded-xl font-mono text-sm text-slate-600 font-black tracking-widest shadow-inner">
                  #{receiptHash}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Seu voto para</p>
                <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-tighter border-b-4 border-slate-800 pb-2 inline-block">
                  {currentElection.nome}
                </h2>
                {currentElection.tipo === 'turma' && <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Candidatos limitados à sua turma</p>}
              </div>
              <div className="flex-1 flex gap-6">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-600 uppercase w-20">Número:</span>
                    <div className="flex gap-2">
                      {displayBoxes.map((_, idx) => (
                        <div key={idx} className={`w-12 h-14 md:w-14 md:h-16 border-2 flex items-center justify-center text-3xl font-black shadow-inner transition-all ${digits[idx] ? 'bg-slate-50 border-slate-800 text-slate-800' : 'bg-slate-100 border-slate-300 text-transparent'}`}>
                          {digits[idx] || ""}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4 pt-4">
                    <div className="flex items-start gap-4 min-h-[3rem]">
                      <span className="text-sm font-bold text-slate-600 uppercase w-20 pt-1">Nome:</span>
                      <p className="text-xl md:text-2xl font-black text-slate-800 uppercase leading-none">
                        {digits.length > 0 ? (candidate ? candidate.name : "NÚMERO NÃO ENCONTRADO") : ""}
                      </p>
                    </div>
                    {candidate?.vice_name && (
                      <div className="flex items-start gap-4 animate-in fade-in"><span className="text-sm font-bold text-slate-600 uppercase w-20 pt-1">Vice:</span><p className="text-lg md:text-xl font-bold text-slate-700 uppercase leading-none">{candidate.vice_name}</p></div>
                    )}
                  </div>
                </div>
                <div className="w-32 h-40 border-2 border-slate-800 flex flex-col items-center justify-end bg-slate-50 p-2 shadow-inner">
                  <div className="w-20 h-24 bg-slate-300 rounded-t-full border-2 border-slate-400 mb-2"></div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase text-center w-full truncate border-t border-slate-300 pt-1.5">{digits.length > 0 && candidate ? "CANDIDATO" : "FOTO"}</p>
                </div>
              </div>
              <div className="mt-auto border-t-[3px] border-slate-800 pt-4">
                <p className="text-xs font-black text-slate-800 tracking-wide">Aperte a tecla:</p>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-xs font-bold text-slate-600"><strong className="text-green-600 font-black">VERDE</strong> para CONFIRMAR o seu voto</p>
                  <p className="text-xs font-bold text-slate-600"><strong className="text-orange-500 font-black">LARANJA</strong> para CORRIGIR o número</p>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="w-full md:w-[320px] bg-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl border-b-[12px] border-slate-900 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button key={num} onClick={() => handleNumber(num)} disabled={isLocked} className="bg-slate-900 text-white text-xl md:text-3xl font-black py-4 md:py-5 rounded-xl shadow-[0_6px_0_rgb(15,23,42)] active:translate-y-1.5 hover:bg-slate-700 transition-all border border-slate-700 disabled:opacity-50">{num}</button>
            ))}
            <div className="col-start-2">
              <button onClick={() => handleNumber(0)} disabled={isLocked} className="w-full bg-slate-900 text-white text-xl md:text-3xl font-black py-4 md:py-5 rounded-xl shadow-[0_6px_0_rgb(15,23,42)] active:translate-y-1.5 hover:bg-slate-700 transition-all border border-slate-700 disabled:opacity-50">0</button>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 mt-4 pt-6 border-t border-slate-700">
            <button onClick={handleBranco} disabled={isLocked} className="flex-1 bg-white text-slate-800 text-[10px] md:text-xs font-black uppercase py-4 rounded-lg shadow-[0_5px_0_rgb(203,213,225)] active:translate-y-1 transition-all hover:bg-slate-100 border border-slate-300 disabled:opacity-50">Branco</button>
            <button onClick={handleCorrige} disabled={isLocked} className="flex-1 bg-orange-500 text-slate-900 text-[10px] md:text-xs font-black uppercase py-4 rounded-lg shadow-[0_5px_0_rgb(194,65,12)] active:translate-y-1 transition-all hover:bg-orange-400 border border-orange-600 disabled:opacity-50">Corrige</button>
            <button onClick={handleConfirma} disabled={isLocked} className="flex-1 bg-green-500 text-slate-900 text-[10px] md:text-xs font-black uppercase py-4 rounded-lg shadow-[0_5px_0_rgb(21,128,61)] active:translate-y-1 transition-all hover:bg-green-400 border border-green-600 disabled:opacity-50">Confirma</button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Urna;
