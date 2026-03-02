import { useState } from "react";
import { TURMAS, Turma } from "@/data/turmas";
import { Vote } from "lucide-react";

interface TurmaSelectionProps {
  onSelect: (turma: Turma) => void;
}

const TurmaSelection = ({ onSelect }: TurmaSelectionProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Vote className="w-10 h-10 text-primary" />
          <h1 className="text-4xl font-extrabold tracking-tight">Urna Eletrônica</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Eleição de Líder de Turma — Selecione a turma
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {TURMAS.map((turma) => (
          <button
            key={turma.id}
            onClick={() => onSelect(turma)}
            className="group relative overflow-hidden rounded-xl bg-card border border-border p-6 text-left transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="relative z-10">
              <p className="text-xs font-semibold tracking-widest uppercase text-primary mb-1">
                Turma
              </p>
              <p className="text-2xl font-bold">{turma.name}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {turma.candidates.length} candidatos
              </p>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TurmaSelection;
