
export interface Candidate {
  number: number;
  name: string;
  turma: string;
  photo?: string;
  vice_name?: string; // NOVO: Nome do Vice
  document?: string;  // NOVO: RG/CPF do candidato
  contact?: string;   // NOVO: Telefone/Email
}

// ... restante do arquivo (Turma, VoteResult, TURMAS)
export interface Turma {
  id: string;
  name: string;
  candidates: Candidate[];
}

export interface VoteResult {
  candidateNumber: number;
  candidateName: string;
  votes: number;
}

export const TURMAS: Turma[] = [
  {
    id: "6a",
    name: "6º Ano A",
    candidates: [
      { number: 10, name: "Ana Clara Silva", turma: "6º Ano A" },
      { number: 20, name: "Pedro Henrique Lima", turma: "6º Ano A" },
      { number: 30, name: "Maria Eduarda Santos", turma: "6º Ano A" },
    ],
  },
  {
    id: "7a",
    name: "7º Ano A",
    candidates: [
      { number: 10, name: "Lucas Gabriel Oliveira", turma: "7º Ano A" },
      { number: 20, name: "Beatriz Costa Ferreira", turma: "7º Ano A" },
      { number: 30, name: "João Miguel Souza", turma: "7º Ano A" },
    ],
  },
  {
    id: "8a",
    name: "8º Ano A",
    candidates: [
      { number: 10, name: "Sophia Almeida Rocha", turma: "8º Ano A" },
      { number: 20, name: "Enzo Gabriel Martins", turma: "8º Ano A" },
      { number: 30, name: "Valentina Ribeiro Dias", turma: "8º Ano A" },
    ],
  },
  {
    id: "9a",
    name: "9º Ano A",
    candidates: [
      { number: 10, name: "Arthur Nascimento Pereira", turma: "9º Ano A" },
      { number: 20, name: "Helena Cardoso Gomes", turma: "9º Ano A" },
      { number: 30, name: "Gabriel Teixeira Barbosa", turma: "9º Ano A" },
    ],
  },
];
