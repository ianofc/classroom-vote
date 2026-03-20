import { useState, useCallback } from "react";
import TurmaSelection from "@/components/TurmaSelection";
import Urna from "@/components/Urna";
import AdminPanel from "@/components/AdminPanel";
import { validateAdmin } from "@/data/store";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Users } from "lucide-react";

export default function Index() {
  const [phase, setPhase] = useState<"select" | "setup" | "voting" | "admin">("select");
  const [turma, setTurma] = useState<any>(null);
  const [totalVoters, setTotalVoters] = useState(30);
  const [currentVoter, setCurrentVoter] = useState(1);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const handleStartVoting = () => {
    setCurrentVoter(1);
    setCurrentSessionId(Math.random().toString(36).substring(2, 10)); // ID único da sessão
    setPhase("voting");
  };

  const handleVote = useCallback(
    async (votesArray: any[], voterData: any) => {
      if (!turma || !currentSessionId) return;

      // Salva a sequência de votos de uma vez no banco
      const votesToInsert = votesArray.map(v => ({
        session_id: currentSessionId,
        turma_id: turma.id,
        voter_name: voterData.name,
        voter_document: voterData.document,
        voter_contact: voterData.contact,
        candidate_number: v.type === "candidate" ? v.number : null,
        vote_type: v.type,
        category: v.category
      }));

      await supabase.from("votes").insert(votesToInsert);

      setCurrentVoter(v => v + 1);
    },
    [currentSessionId, turma]
  );

  const handleOpenAdmin = async () => {
    const username = prompt("Usuário administrador:");
    if (!username) return;
    const password = prompt("Senha:");
    if (!password) return;
    if (await validateAdmin(username, password)) setPhase("admin");
    else alert("Credenciais incorretas!");
  };

  if (phase === "select") return <TurmaSelection onSelect={(t: any) => { setTurma(t); setPhase("setup"); }} onAdmin={handleOpenAdmin} />;

  if (phase === "setup" && turma) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50 gap-8">
        <div className="text-center"><h1 className="text-3xl font-extrabold">{turma.name}</h1><p className="text-slate-500">Configure a urna desta turma</p></div>
        <div className="bg-white border rounded-xl p-6 w-full max-w-sm shadow-sm space-y-6">
          <div>
            <label className="text-sm font-bold text-slate-600 block mb-2"><Users className="w-4 h-4 inline mr-1" /> Alunos esperados</label>
            <input type="number" min={1} value={totalVoters} onChange={e => setTotalVoters(Math.max(1, parseInt(e.target.value) || 1))} className="w-full h-12 rounded-lg bg-slate-100 border px-4 text-xl font-bold text-center" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPhase("select")} className="flex-1 py-3 rounded-lg border font-bold hover:bg-slate-50">Voltar</button>
            <button onClick={handleStartVoting} className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">Iniciar Urna</button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "voting" && turma) {
    return (
      <div className="relative">
        <Urna turma={turma} onVoteConfirmed={handleVote} onBack={() => setPhase("select")} voterNumber={currentVoter} totalVoters={totalVoters} />
        <button onClick={handleOpenAdmin} className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center opacity-30 hover:opacity-100"><ShieldCheck className="w-4 h-4" /></button>
      </div>
    );
  }

  if (phase === "admin") return <AdminPanel turma={turma} totalVoters={totalVoters} currentVoter={currentVoter} votingComplete={false} onBack={() => setPhase("select")} onTurmasChanged={() => {}} sessionId={currentSessionId} />;

  return null;
}
