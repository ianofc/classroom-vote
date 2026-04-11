import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ShieldCheck, Trophy, CheckCircle2, AlertTriangle } from "lucide-react";

const Telao = () => {
  const [escolaNome, setEscolaNome] = useState("Carregando...");
  const [escolaLogo, setEscolaLogo] = useState<string | null>(null);
  const [activeElections, setActiveElections] = useState<any[]>([]);
  const [allVotes, setAllVotes] = useState<any[]>([]);
  const [allCandidates, setAllCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    // Atualização em tempo real (a cada 5 segundos)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: adminData } = await supabase.from('admins').select('escolas(id, nome, logo_url)').eq('auth_id', session.user.id).single();
    let idDaEscola = null;
    if (adminData?.escolas) {
      const escolaData = Array.isArray(adminData.escolas) ? adminData.escolas[0] : adminData.escolas;
      idDaEscola = escolaData?.id;
      setEscolaNome(escolaData?.nome || "Escola");
      setEscolaLogo(escolaData?.logo_url || null);
    }

    if (idDaEscola) {
      // ⚠️ CORREÇÃO CRÍTICA: O TELÃO AGORA SÓ PUXA ELEIÇÕES ATIVAS
      const { data: eleicoes } = await supabase.from('eleicoes')
        .select('*').eq('escola_id', idDaEscola).eq('status', 'ativa').order('created_at', { ascending: false });
      
      if (eleicoes && eleicoes.length > 0) {
        setActiveElections(eleicoes);
        const idsAtivas = eleicoes.map(e => e.id);
        
        const [votesRes, candidatesRes] = await Promise.all([
          supabase.from('votes').select('*').in('eleicao_id', idsAtivas),
          supabase.from('students').select('*').eq('is_candidate', true)
        ]);

        if (votesRes.data) setAllVotes(votesRes.data);
        if (candidatesRes.data) setAllCandidates(candidatesRes.data);
      } else {
        setActiveElections([]);
        setAllVotes([]);
      }
    }
    setLoading(false);
  };

  const getResultsForElection = (eleicaoId: string, cargosString: string, eleicaoNome: string) => {
    const eleicaoVotes = allVotes.filter(v => v.eleicao_id === eleicaoId);
    const cargosArray = cargosString ? cargosString.split(',').map(c => c.trim()) : [eleicaoNome];

    return cargosArray.map(cargo => {
      const votesForRole = eleicaoVotes.filter(v => v.candidate_role === cargo || (!v.candidate_role && cargo === "Líder Geral"));
      const total = votesForRole.length;

      const candidates = allCandidates
        .filter(c => c.candidate_role?.includes(cargo) || (!c.candidate_role && cargo === "Líder Geral"))
        .map(c => {
          const vCount = votesForRole.filter(v => v.vote_type === 'candidate' && v.candidate_number === c.candidate_number).length;
          return { ...c, votes: vCount, percentage: total > 0 ? (vCount / total) * 100 : 0 };
        })
        .sort((a, b) => b.votes - a.votes)
        .slice(0, 3); // Mostra só o TOP 3 no telão

      return { cargo, total, candidates };
    });
  };

  if (loading && activeElections.length === 0) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-12 h-12 text-blue-500 animate-spin" /></div>;
  }

  if (activeElections.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
        <AlertTriangle className="w-20 h-20 text-slate-700 mb-6" />
        <h1 className="text-4xl font-black text-slate-500 uppercase tracking-widest">Nenhuma Eleição Ativa</h1>
        <p className="text-slate-600 mt-4 text-xl">O painel de resultados ao vivo está em pausa.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 overflow-hidden relative">
      <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <header className="relative z-10 flex items-center justify-between mb-12 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          {escolaLogo ? <img src={escolaLogo} className="h-16 object-contain" alt="Logo" /> : <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center"><ShieldCheck className="w-8 h-8 text-white" /></div>}
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-slate-100">{escolaNome}</h1>
            <p className="text-blue-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> APURAÇÃO AO VIVO
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black text-white">{allVotes.length}</p>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mt-1">Votos Computados</p>
        </div>
      </header>

      <div className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-8">
        {activeElections.map(eleicao => (
          <div key={eleicao.id} className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest border-b border-slate-800 pb-4">{eleicao.nome}</h2>
            
            <div className="space-y-8">
              {getResultsForElection(eleicao.id, eleicao.cargos, eleicao.nome).map((res, i) => (
                <div key={i} className="bg-slate-800/50 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-blue-400 uppercase tracking-widest flex items-center gap-2"><Trophy className="w-5 h-5"/> {res.cargo}</h3>
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full">{res.total} votos</span>
                  </div>

                  <div className="space-y-4">
                    {res.candidates.length === 0 ? <p className="text-slate-500 text-sm">Sem dados.</p> : res.candidates.map((cand, idx) => (
                      <div key={cand.id} className="relative">
                        <div className="flex justify-between items-end mb-2">
                          <p className="font-black text-slate-200 text-lg flex items-center gap-2">
                            {idx === 0 && res.total > 0 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                            {cand.name} <span className="text-slate-500 font-medium text-sm">(Nº {cand.candidate_number})</span>
                          </p>
                          <div className="text-right">
                            <p className="font-black text-white text-xl leading-none">{cand.votes}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{cand.percentage.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-1000 ${idx === 0 && cand.votes > 0 ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${cand.percentage}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Telao;
