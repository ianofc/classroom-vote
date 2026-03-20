import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, ShieldCheck, Loader2 } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Eleições CEEPS</h1>
          <p className="text-slate-500 font-medium">Selecione sua turma para iniciar</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-10 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" /> Carregando turmas...
          </div>
        ) : (
          <div className="grid gap-3">
            {turmas.map((t) => (
              <button key={t.id} onClick={() => onSelect(t)} className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-500 hover:shadow-md transition-all text-left group flex justify-between items-center">
                <span className="font-bold text-slate-700 group-hover:text-blue-700">{t.name}</span>
                <span className="text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm">Selecionar →</span>
              </button>
            ))}
            {turmas.length === 0 && <p className="text-center text-slate-400">Nenhuma turma cadastrada.</p>}
          </div>
        )}

        <button onClick={onAdmin} className="w-full flex items-center justify-center gap-2 py-4 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors mt-8 border-t border-slate-200">
          <ShieldCheck className="w-4 h-4" /> Acesso da Gestão
        </button>
      </div>
    </div>
  );
}
