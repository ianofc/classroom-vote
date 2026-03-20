import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Loader2, Users } from "lucide-react";

export default function TurmaSelection({ onSelect, onAdmin }: any) {
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: tData } = await supabase.from("turmas").select("*").order("name");
      const { data: cData } = await supabase.from("students").select("*").eq("is_candidate", true);
      
      if (tData && cData) {
        const formatted = tData.map(t => ({
          id: t.id,
          name: t.name,
          candidates: cData.filter(c => c.turma_id === t.id).map(c => ({
            number: c.candidate_number,
            name: c.name,
            photo: c.photo_url,
            vice_name: c.vice_name,
            vice_photo: c.vice_photo_url,
            category: c.category || 'Líder Geral'
          }))
        }));
        setTurmas(formatted);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-50">
      <div className="w-full max-w-2xl text-center space-y-4 mb-10">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
          <Users className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">Eleições CEEPS</h1>
        <p className="text-slate-500 font-medium">Selecione a turma para iniciar a sessão de votação</p>
      </div>

      <div className="w-full max-w-3xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {turmas.map((t) => (
          <button key={t.id} onClick={() => onSelect(t)} className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-500 transition-all group text-left">
            <h2 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{t.name}</h2>
            <p className="text-xs text-slate-400 mt-2">{t.candidates.length} candidatos registrados</p>
          </button>
        ))}
        {turmas.length === 0 && <p className="col-span-full text-center text-slate-400">Nenhuma turma cadastrada no sistema.</p>}
      </div>

      <button onClick={onAdmin} className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 transition-all">
        <ShieldCheck className="w-5 h-5" />
      </button>
    </div>
  );
}
