import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Users, ShieldCheck, Loader2, Code2, Search } from "lucide-react";

export default function TurmaSelection({ onSelect, onAdmin }: { onSelect: (t: any) => void, onAdmin: () => void }) {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchTurmas = async () => {
      const { data } = await supabase.from('turmas').select('*');
      if (data) setTurmas(data);
      setLoading(false);
    };
    fetchTurmas();
  }, []);

  // Algoritmo de Busca e Ordenação Inteligente
  const filteredAndSortedTurmas = useMemo(() => {
    let filtered = turmas;

    // Filtra pela busca (se o utilizador digitou algo)
    if (searchTerm.trim()) {
      const termo = searchTerm.toLowerCase();
      filtered = filtered.filter(t => t.name.toLowerCase().includes(termo));
    }

    // Ordena pela hierarquia da escola (Ano -> Turno -> Reg/Téc -> Alfabético)
    return filtered.sort((a, b) => {
      const getYear = (name: string) => {
        const match = name.trim().match(/^(\d+)/);
        return match ? parseInt(match[1], 10) : 999;
      };
      
      const getShift = (name: string) => {
        const u = name.toUpperCase().trim();
        if (u.endsWith('M')) return 1; // Matutino
        if (u.endsWith('V')) return 2; // Vespertino
        if (u.endsWith('N')) return 3; // Noturno
        return 4; // Outros
      };

      const yearA = getYear(a.name);
      const yearB = getYear(b.name);
      if (yearA !== yearB) return yearA - yearB;

      const shiftA = getShift(a.name);
      const shiftB = getShift(b.name);
      if (shiftA !== shiftB) return shiftA - shiftB;

      if (a.name.length !== b.name.length) return a.name.length - b.name.length;

      return a.name.localeCompare(b.name);
    });
  }, [turmas, searchTerm]);

  return (
    // Janela alargada (max-w-5xl) para acomodar os 5 cards perfeitamente
    <div className="flex flex-col items-center justify-center p-4 w-full max-w-5xl mx-auto min-h-screen">
      <div className="glass-panel w-full p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl relative overflow-hidden">
        
        <div className="text-center space-y-2 relative z-10">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center mx-auto mb-2 shadow-xl shadow-blue-500/30">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Mesa Receptora</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Selecione a turma para abrir a urna</p>
        </div>

        {/* BARRA DE PESQUISA */}
        {!loading && turmas.length > 0 && (
          <div className="relative z-10 w-full max-w-md mx-auto mb-4">
            <Search className="w-5 h-5 absolute left-4 top-3.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Pesquisar turma... (Ex: 1º ADM)" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-slate-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-white font-bold backdrop-blur-sm transition-all shadow-sm placeholder:text-slate-400 placeholder:font-medium"
            />
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-10 text-blue-600 dark:text-blue-400 relative z-10">
            <Loader2 className="w-8 h-8 animate-spin mb-3" />
            <p className="text-sm font-bold animate-pulse">Sincronizando turmas...</p>
          </div>
        ) : (
          // GRID RESPONSIVO: 2 colunas telemóvel, 3 tablet pequeno, 4 médio, 5 PC
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[55vh] overflow-y-auto p-2 custom-scrollbar relative z-10">
            {filteredAndSortedTurmas.map((t) => (
              <button 
                key={t.id} 
                onClick={() => onSelect(t)} 
                className="group flex flex-col items-center justify-center bg-white/70 dark:bg-slate-800/70 p-4 rounded-xl border border-white/60 dark:border-slate-700 hover:bg-blue-600 dark:hover:bg-blue-600 transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 min-h-[90px]"
              >
                <span className="font-bold text-slate-700 dark:text-slate-200 group-hover:text-white text-center text-sm md:text-base leading-tight">
                  {t.name}
                </span>
                <span className="text-[10px] uppercase font-black tracking-wider text-blue-400 opacity-0 group-hover:text-blue-200 group-hover:opacity-100 transition-opacity mt-1">
                  Selecionar
                </span>
              </button>
            ))}
            
            {filteredAndSortedTurmas.length === 0 && turmas.length > 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                Nenhuma turma encontrada com esse nome.
              </div>
            )}
            {turmas.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 dark:text-slate-500 font-medium">
                Nenhuma turma configurada ainda no sistema.
              </div>
            )}
          </div>
        )}

        <div className="mt-2 pt-6 border-t border-slate-200/60 dark:border-slate-700/50 flex flex-col items-center gap-5 relative z-10">
          <button 
            onClick={onAdmin} 
            className="flex items-center justify-center gap-2 py-2 px-6 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ShieldCheck className="w-4 h-4" /> Acesso da Comissão Eleitoral
          </button>
          
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
