import { Turma } from "./turmas";
import { supabase } from "@/lib/supabase";

export interface VoteRecord {
  number: number;
  type: "candidate" | "branco" | "nulo";
  voterIndex: number;
}

export interface VoteReport {
  totalsByCandidate: Record<number, number>;
  blanks: number;
  nulls: number;
  totalVotes: number;
}

export async function createVoteSession(turma: Turma, totalVoters: number): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("vote_sessions")
    .insert({
      turma_id: turma.id,
      turma_name: turma.name,
      total_voters: totalVoters,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar sessão de votação:", error.message);
    return null;
  }

  return data.id as string;
}

export async function saveVoteToSession(
  sessionId: string | null, 
  turmaId: string, 
  vote: VoteRecord,
  voterData: { name: string; document: string; contact: string } // Novos dados
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("votes").insert({
    session_id: sessionId,
    turma_id: turmaId,
    voter_name: voterData.name,
    voter_document: voterData.document,
    voter_contact: voterData.contact,
    candidate_number: vote.type === "candidate" ? vote.number : null,
    vote_type: vote.type,
  });

  if (error) {
    // Aqui o erro de "Unique Constraint" indicará se o aluno já votou
    console.error("Erro ao salvar voto:", error.message);
    throw new Error(error.message);
  }
}

export async function getSessionVoteReport(sessionId: string): Promise<VoteReport | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("votes")
    .select("candidate_number, vote_type")
    .eq("session_id", sessionId);

  if (error) {
    console.error("Erro ao buscar relatório:", error.message);
    return null;
  }

  const report: VoteReport = { totalsByCandidate: {}, blanks: 0, nulls: 0, totalVotes: data.length };

  for (const vote of data) {
    if (vote.vote_type === "candidate" && typeof vote.candidate_number === "number") {
      report.totalsByCandidate[vote.candidate_number] = (report.totalsByCandidate[vote.candidate_number] ?? 0) + 1;
    } else if (vote.vote_type === "branco") {
      report.blanks += 1;
    } else if (vote.vote_type === "nulo") {
      report.nulls += 1;
    }
  }

  return report;
}
