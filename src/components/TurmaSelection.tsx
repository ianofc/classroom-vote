import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, ShieldCheck, Loader2, Code2 } from "lucide-react";

export default function TurmaSelection({ onSelect, onAdmin }: { onSelect: (t: any) => void, onAdmin: () => void }) {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTurmas = async () => {
      const { data } = await supabase.from('turmas').select('*').order('name');
      if (data) setTurmas(data);
      setLoading(false);
    };
    fetchTurmas();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-6 w-full max-w-md mx-auto min-h-screen">
      <div className="glass-panel w-full p-8 rounded-3xl space-y-8 shadow-2xl relative overflow-hidden">
        
        <div className="text-center space-y-2 relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-500/30">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Selecione a Turma</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Toque na sua turma para prosseguir</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-10 text-blue-600 dark:text-blue-400 relative z-10">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-bold animate-pulse">Sincronizando banco de dados...</p>
          </div>
        ) : (
          <div className="grid gap-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar relative z-10">
            {turmas.map((t) => (
              <button 
                key={t.id} 
                onClick={() => onSelect(t)} 
                className="w-full bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-white/60 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-lg transition-all text-left group flex justify-between items-center"
              >
                <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">{t.name}</span>
                <span className="text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">Iniciar →</span>
              </button>
            ))}
            {turmas.length === 0 && (
              <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">Nenhuma turma configurada ainda.</p>
            )}
          </div>
        )}

        <div className="mt-4 pt-6 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center gap-5 relative z-10">
          <button 
            onClick={onAdmin} 
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ShieldCheck className="w-4 h-4" /> Acesso da Comissão Eleitoral
          </button>
          
          {/* CRÉDITOS DO DESENVOLVEDOR */}
          <div className="flex flex-col items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
            <Code2 className="w-4 h-4 text-blue-500 mb-1" />
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Desenvolvido por</p>
            <p className="text-xs font-black bg-gradient-to-r from-blue-600 to-red-500 bg-clip-text text-transparent uppercase tracking-wider">
              Ian Santos
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
