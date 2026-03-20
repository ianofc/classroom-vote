import { useState } from "react";
import TurmaSelection from "@/components/TurmaSelection";
import Urna from "@/components/Urna";
import AdminPanel from "@/components/AdminPanel";
import { validateAdmin } from "@/data/store";
import { supabase } from "@/lib/supabase";
import { Users, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Phase = "select" | "setup" | "voting" | "admin";

const Index = () => {
  const [phase, setPhase] = useState<Phase>("select");
  const [turma, setTurma] = useState<any | null>(null);
  const [totalVoters, setTotalVoters] = useState(10);
  const [currentVoter, setCurrentVoter] = useState(1);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const handleSelectTurma = async (t: any) => {
    setLoadingCandidates(true);
    setPhase("setup");
    // Busca apenas os candidatos desta turma
    const { data } = await supabase.from('students').select('*').eq('turma_id', t.id).eq('is_candidate', true);
    setTurma({ ...t, candidates: data || [] });
    setLoadingCandidates(false);
  };

  const handleStartVoting = () => {
    setCurrentVoter(1);
    setCurrentSessionId(crypto.randomUUID()); // Gera ID da sessão de urna
    setPhase("voting");
  };

  const handleVote = async (votesArray: any[], voterData: any) => {
    // Salva a sequência de votos de uma vez só no banco
    const rowsToInsert = votesArray.map(vote => ({
      session_id: currentSessionId,
      turma_id: turma.id,
      voter_name: voterData.name,
      voter_document: voterData.document,
      voter_contact: voterData.contact,
      candidate_role: vote.role,
      candidate_number: vote.number,
      vote_type: vote.type
    }));
    
    await supabase.from('votes').insert(rowsToInsert);

    if (currentVoter >= totalVoters) {
      toast({ title: "Fim", description: "Todos os eleitores desta sessão votaram." });
      setPhase("select");
    } else {
      setCurrentVoter((v) => v + 1);
    }
  };

  const handleOpenAdmin = async () => {
    const username = prompt("Usuário administrador:");
    if (!username) return;
    const password = prompt("Senha:");
    if (!password) return;
    
    const isValid = await validateAdmin(username, password);
    if (isValid) setPhase("admin");
    else alert("Credenciais incorretas!");
  };

  if (phase === "select") return <TurmaSelection onSelect={handleSelectTurma} onAdmin={handleOpenAdmin} />;

  if (phase === "setup" && turma) {
    if (loadingCandidates) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8 bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-xl p-8 w-full max-w-sm space-y-6 shadow-xl text-center">
          <h1 className="text-2xl font-black uppercase text-blue-600 border-b pb-4">{turma.name}</h1>
          <div className="text-left space-y-2">
            <p className="text-sm font-bold text-slate-500 uppercase">Cargos em Disputa:</p>
            {Array.from(new Set(turma.candidates.map((c: any) => c.candidate_role))).map((role: any) => (
              <span key={role} className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded mr-2">{role}</span>
            ))}
          </div>
          <div>
            <label className="text-sm font-bold text-slate-500 uppercase block mb-2">Qtd. de Eleitores</label>
            <input type="number" min={1} value={totalVoters} onChange={(e) => setTotalVoters(Math.max(1, parseInt(e.target.value) || 1))} className="w-full h-12 rounded-lg bg-slate-100 border-2 border-slate-200 px-4 text-xl font-black text-center focus:outline-none focus:border-blue-500" />
          </div>
          <button onClick={handleStartVoting} className="w-full py-4 rounded-lg bg-green-600 text-white font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-md">Iniciar Urna</button>
          <button onClick={() => setPhase("select")} className="w-full py-2 text-sm font-bold text-slate-400 hover:text-slate-600">Cancelar</button>
        </div>
      </div>
    );
  }

  if (phase === "voting" && turma) {
    return (
      <div className="relative">
        <Urna turma={turma} onVoteConfirmed={handleVote} onBack={() => setPhase("select")} voterNumber={currentVoter} totalVoters={totalVoters} />
        <button onClick={handleOpenAdmin} className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all"><ShieldCheck className="w-4 h-4 text-white" /></button>
      </div>
    );
  }

  if (phase === "admin") return <AdminPanel turma={turma} totalVoters={totalVoters} currentVoter={currentVoter} votingComplete={false} onBack={() => setPhase("select")} onTurmasChanged={() => {}} sessionId={currentSessionId} />;

  return null;
};

export default Index;
