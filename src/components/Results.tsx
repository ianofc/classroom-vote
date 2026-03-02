import { useRef } from "react";
import { Turma, VoteResult } from "@/data/turmas";
import { BarChart3, Trophy, ArrowLeft, Printer } from "lucide-react";

interface ResultsProps {
  turma: Turma;
  results: VoteResult[];
  blanks: number;
  nulls: number;
  onBack: () => void;
}

const Results = ({ turma, results, blanks, nulls, onBack }: ResultsProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const totalVotes = results.reduce((s, r) => s + r.votes, 0) + blanks + nulls;
  const sorted = [...results].sort((a, b) => b.votes - a.votes);

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Resultado — ${turma.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a1a; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px 12px; text-align: left; font-size: 14px; }
            th { background: #f5f5f5; font-weight: 600; }
            .winner { font-weight: 700; }
            .footer { margin-top: 16px; font-size: 12px; color: #999; }
            .summary { display: flex; gap: 24px; margin-bottom: 20px; }
            .summary-item { text-align: center; }
            .summary-item .label { font-size: 11px; color: #666; text-transform: uppercase; }
            .summary-item .value { font-size: 20px; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Resultado da Eleição — ${turma.name}</h1>
          <p class="sub">${totalVotes} voto(s) computado(s)</p>
          <table>
            <thead><tr><th>Pos.</th><th>Candidato</th><th>Nº</th><th>Votos</th><th>%</th></tr></thead>
            <tbody>
              ${sorted
                .map(
                  (r, i) =>
                    `<tr class="${i === 0 && r.votes > 0 ? "winner" : ""}">
                      <td>${i + 1}</td>
                      <td>${r.candidateName}</td>
                      <td>${r.candidateNumber}</td>
                      <td>${r.votes}</td>
                      <td>${totalVotes > 0 ? ((r.votes / totalVotes) * 100).toFixed(1) : 0}%</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-item"><div class="label">Brancos</div><div class="value">${blanks}</div></div>
            <div class="summary-item"><div class="label">Nulos</div><div class="value">${nulls}</div></div>
            <div class="summary-item"><div class="label">Total</div><div class="value">${totalVotes}</div></div>
          </div>
          <p class="footer">Documento gerado automaticamente — Urna Eletrônica Escolar</p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div ref={printRef} className="flex flex-col items-center justify-center min-h-screen p-6 gap-8">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-extrabold">Resultado da Eleição</h1>
        </div>
        <p className="text-muted-foreground">{turma.name} — {totalVotes} voto(s) computado(s)</p>
      </div>

      <div className="w-full max-w-md space-y-3">
        {sorted.map((r, i) => {
          const pct = totalVotes > 0 ? (r.votes / totalVotes) * 100 : 0;
          const isWinner = i === 0 && r.votes > 0;
          return (
            <div
              key={r.candidateNumber}
              className={`relative bg-card border rounded-xl p-4 overflow-hidden transition-all ${
                isWinner ? "border-primary shadow-lg shadow-primary/20" : "border-border"
              }`}
            >
              <div className="absolute inset-0 bg-primary/10 origin-left transition-transform duration-700"
                style={{ transform: `scaleX(${pct / 100})` }}
              />
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {isWinner && <Trophy className="w-5 h-5 text-secondary" />}
                  <div>
                    <p className="font-bold">{r.candidateName}</p>
                    <p className="text-xs text-muted-foreground">Nº {r.candidateNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold font-mono-display">{r.votes}</p>
                  <p className="text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex gap-3 mt-2">
          <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Brancos</p>
            <p className="text-lg font-bold font-mono-display">{blanks}</p>
          </div>
          <div className="flex-1 bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Nulos</p>
            <p className="text-lg font-bold font-mono-display">{nulls}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Nova eleição
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
        >
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
      </div>
    </div>
  );
};

export default Results;
