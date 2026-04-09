import { useState, useMemo, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface UrnaProps {
  turma: any; // Agora recebe o urnaPayload (Turma + Eleições Permitidas)
  onVoteConfirmed: (votes: any[]) => void;
  onBack: () => void;
}

const Urna = ({ turma, onVoteConfirmed, onBack }: UrnaProps) => {
  const [digits, setDigits] = useState("");
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [votesArray, setVotesArray] = useState<any[]>([]);
  const [showEndAnim, setShowEndAnim] = useState(false);
  const [receiptHash, setReceiptHash] = useState("");

  // A sequência mágica de votação agora vem do Index (baseada no perfil do aluno)
  const rolesSequence = useMemo(() => {
    if (turma.allowedRoles && turma.allowedRoles.length > 0) {
      return turma.allowedRoles as string[];
    }
    // Fallback de segurança
    const roles = Array.from(new Set(turma.candidates.map((c: any) => c.candidate_role || 'Líder Geral')));
    return (roles.length > 0 ? roles : ['Líder Geral']) as string[];
  }, [turma]);

  const currentRole = rolesSequence[currentRoleIndex];

  // Busca o candidato na lista global que bate com o número digitado e com o cargo da tela atual
  const candidate = useMemo(() => {
    if (digits.length === 0) return null;
    return turma.candidates.find((c: any) => 
      c.candidate_number === parseInt(digits) && 
      (c.candidate_role === currentRole || (!c.candidate_role && currentRole === 'Líder Geral'))
    );
  }, [digits, currentRole, turma.candidates]);

  // Efeitos Sonoros Oficiais da Urna
  const playUrnaSound = (type: 'key' | 'end') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === 'key') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'square';
        osc2.type = 'square';
        osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc2.frequency.setValueAtTime(554, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.5);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 1.5);
        osc2.stop(audioCtx.currentTime + 1.5);
      }
    } catch (e) {
      console.log("Audio not supported");
    }
  };

  const handleNumber = (num: number) => {
    if (digits.length < 2) {
      playUrnaSound('key');
      setDigits(prev => prev + num);
    }
  };

  const handleCorrige = () => {
    playUrnaSound('key');
    setDigits("");
  };

  const handleBranco = () => {
    playUrnaSound('key');
    processVote({ role: currentRole, number: null, type: 'branco' });
  };

  const handleConfirma = () => {
    if (digits.length === 0) return;
    
    const voteType = candidate ? 'candidate' : 'nulo';
    processVote({ 
      role: currentRole, 
      number: parseInt(digits), 
      type: voteType 
    });
  };

  const processVote = (voteData: any) => {
    const newVotes = [...votesArray, voteData];
    
    // Se ainda houver mais eleições para este eleitor votar...
    if (currentRoleIndex < rolesSequence.length - 1) {
      playUrnaSound('key');
      setVotesArray(newVotes);
      setCurrentRoleIndex(currentRoleIndex + 1);
      setDigits("");
    } else {
      // É o último voto! Toca o som de FIM e gera o recibo
      playUrnaSound('end');
      setReceiptHash(Math.random().toString(36).substring(2, 10).toUpperCase());
      setShowEndAnim(true);
      
      // O FIM agora dura 4 segundos para dar tempo de ler o protocolo
      setTimeout(() => {
        onVoteConfirmed(newVotes);
        // Reseta tudo silenciosamente após o FIM
        setVotesArray([]);
        setCurrentRoleIndex(0);
        setDigits("");
        setShowEndAnim(false);
      }, 4000); 
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 p-4">
      <div className="w-full max-w-4xl bg-slate-200 p-6 md:p-10 rounded-xl shadow-2xl flex flex-col md:flex-row gap-8 border-4 border-slate-300">
        
        {/* TELA DA URNA */}
        <div className="flex-1 bg-white border-4 border-slate-300 rounded-lg p-6 relative min-h-[400px] shadow-inner overflow-hidden">
          
          {showEndAnim ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
              <div className="text-center animate-in zoom-in duration-500">
                <p className="text-8xl font-black tracking-widest text-slate-800 drop-shadow-sm">FIM</p>
                <p className="text-xl text-green-600 mt-4 font-black tracking-[0.5em] uppercase flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6" /> Voto Computado
                </p>
              </div>
              
              {/* O Recibo Criptográfico Oficial */}
              <div className="absolute bottom-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  Protocolo Criptográfico de Segurança
                </p>
                <div className="bg-slate-100 border border-slate-200 px-6 py-2 rounded-lg font-mono text-sm text-slate-600 font-bold tracking-widest shadow-inner">
                  #{receiptHash}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="mb-6">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">Seu voto para</p>
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter border-b-2 border-slate-800 pb-2 inline-block">
                  {currentRole}
                </h2>
              </div>

              <div className="flex-1 flex gap-6">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-600 uppercase w-20">Número:</span>
                    <div className="flex gap-2">
                      <div className="w-12 h-14 border-2 border-slate-800 flex items-center justify-center text-3xl font-black shadow-inner bg-slate-50">
                        {digits[0] || ""}
                      </div>
                      <div className="w-12 h-14 border-2 border-slate-800 flex items-center justify-center text-3xl font-black shadow-inner bg-slate-50">
                        {digits[1] || ""}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-start gap-4 min-h-[3rem]">
                      <span className="text-sm font-bold text-slate-600 uppercase w-20 pt-1">Nome:</span>
                      <p className="text-xl font-black text-slate-800 uppercase leading-none">
                        {digits.length === 2 ? (candidate ? candidate.name : "VOTO NULO") : ""}
                      </p>
                    </div>
                    {candidate?.vice_name && (
                      <div className="flex items-start gap-4">
                        <span className="text-sm font-bold text-slate-600 uppercase w-20 pt-1">Vice:</span>
                        <p className="text-lg font-bold text-slate-700 uppercase leading-none">
                          {candidate.vice_name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Retrato do Candidato (Silhueta genérica) */}
                <div className="w-32 h-40 border-2 border-slate-800 flex flex-col items-center justify-end bg-slate-100 p-2 shadow-inner">
                  <div className="w-20 h-24 bg-slate-300 rounded-t-full border-2 border-slate-400 mb-2"></div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase text-center w-full truncate border-t border-slate-300 pt-1">
                    {digits.length === 2 && candidate ? "CANDIDATO" : "FOTO"}
                  </p>
                </div>
              </div>

              <div className="mt-auto border-t-2 border-slate-800 pt-3">
                <p className="text-xs font-bold text-slate-800">Aperte a tecla:</p>
                <div className="flex gap-4 mt-1">
                  <p className="text-xs font-bold text-slate-600"><strong className="text-green-600">VERDE</strong> para CONFIRMAR este voto</p>
                  <p className="text-xs font-bold text-slate-600"><strong className="text-orange-500">LARANJA</strong> para REINICIAR este voto</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TECLADO DA URNA */}
        <div className="w-full md:w-80 bg-slate-800 p-6 md:p-8 rounded-xl shadow-2xl border-b-8 border-slate-900 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumber(num)}
                className="bg-slate-900 text-white text-xl md:text-2xl font-black py-4 rounded-md shadow-[0_4px_0_rgb(15,23,42)] active:shadow-[0_0px_0_rgb(15,23,42)] active:translate-y-1 hover:bg-slate-700 transition-all border border-slate-700"
              >
                {num}
              </button>
            ))}
            <div className="col-start-2">
              <button
                onClick={() => handleNumber(0)}
                className="w-full bg-slate-900 text-white text-xl md:text-2xl font-black py-4 rounded-md shadow-[0_4px_0_rgb(15,23,42)] active:shadow-[0_0px_0_rgb(15,23,42)] active:translate-y-1 hover:bg-slate-700 transition-all border border-slate-700"
              >
                0
              </button>
            </div>
          </div>

          <div className="flex gap-2 md:gap-3 mt-4 pt-4 border-t border-slate-700">
            <button
              onClick={handleBranco}
              className="flex-1 bg-white text-slate-800 text-[10px] md:text-xs font-black uppercase py-4 rounded shadow-[0_4px_0_rgb(203,213,225)] active:shadow-[0_0px_0_rgb(203,213,225)] active:translate-y-1 transition-all hover:bg-slate-50 border border-slate-300"
            >
              Branco
            </button>
            <button
              onClick={handleCorrige}
              className="flex-1 bg-orange-500 text-slate-900 text-[10px] md:text-xs font-black uppercase py-4 rounded shadow-[0_4px_0_rgb(194,65,12)] active:shadow-[0_0px_0_rgb(194,65,12)] active:translate-y-1 transition-all hover:bg-orange-400 border border-orange-600"
            >
              Corrige
            </button>
            <button
              onClick={handleConfirma}
              className="flex-1 bg-green-500 text-slate-900 text-[10px] md:text-xs font-black uppercase py-4 rounded shadow-[0_4px_0_rgb(21,128,61)] active:shadow-[0_0px_0_rgb(21,128,61)] active:translate-y-1 transition-all hover:bg-green-400 border border-green-600"
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
