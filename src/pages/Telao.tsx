import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Flame, TrendingUp, Trophy, CheckCircle2, Users, ShieldCheck } from 'lucide-react';

const Telao = () => {
  const [escolaNome, setEscolaNome] = useState("Carregando Sistema...");
  const [allVotes, setAllVotes] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allTurmas, setAllTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Função que busca dados (Será chamada a cada 5 segundos)
  const fetchLiveStats = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;

      const { data: adminData } = await supabase.from('admins').select(`escolas (id, nome)`).eq('auth_id', userData.user.id).single();
      
      let eId = null;
      if (adminData?.escolas) {
        const eData = Array.isArray(adminData.escolas) ? adminData.escolas[0] : adminData.escolas;
        eId = eData?.id;
        setEscolaNome(eData?.nome || "Escola");
      }

      if (eId) {
        // Busca votos
        const { data: vData } = await supabase.from('votes').select('voter_name, turma_id');
        if (vData) setAllVotes(vData);

        // Busca estudantes
        const { data: sData } = await supabase.from('students').select('id, turma_id');
        if (sData) setAllStudents(sData);

        // Busca turmas
        const { data: tData } = await supabase.from('turmas').select('id, name').eq('escola_id', eId);
        if (tData) setAllTurmas(tData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Busca inicial
    fetchLiveStats();
    
    // Polling a cada 5 segundos para o telão ser em "Tempo Real"
    const interval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // CÁLCULOS DO TELÃO
  const estatisticas = useMemo(() => {
    const totalEleitores = allStudents.length;
    const eleitoresUnicos = new Set(allVotes.map(v => v.voter_name)).size;
    const percent = totalEleitores > 0 ? (eleitoresUnicos / totalEleitores) * 100 : 0;
    return {
      total: totalEleitores,
      votaram: eleitoresUnicos,
      percent: percent.toFixed(1),
      isHot: percent >= 75
    };
  }, [allStudents, allVotes]);

  const ranking = useMemo(() => {
    const calc = allTurmas.map(turma => {
      const totalTurma = allStudents.filter(s => s.turma_id === turma.id).length;
      const votaramTurma = new Set(allVotes.filter(v => v.turma_id === turma.id).map(v => v.voter_name)).size;
      const eng = totalTurma > 0 ? (votaramTurma / totalTurma) * 100 : 0;
      return { id: turma.id, nome: turma.name, engajamento: parseFloat(eng.toFixed(1)) };
    });
    return calc.sort((a, b) => b.engajamento - a.engajamento).slice(0, 5); // Top 5
  }, [allTurmas, allStudents, allVotes]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="w-16 h-16 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col relative">
      
      {/* Efeitos de fundo Matrix/Cyber */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 mix-blend-overlay pointer-events-none"></div>
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full blur-[150px] opacity-20 pointer-events-none ${estatisticas.isHot ? 'bg-orange-600' : 'bg-blue-600'}`}></div>

      {/* HEADER */}
      <header className="p-8 flex justify-between items-center border-b border-white/10 z-10 bg-slate-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <ShieldCheck className="w-12 h-12 text-blue-500" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-slate-100">{escolaNome}</h1>
            <p className="text-blue-400 font-bold uppercase tracking-[0.3em] text-sm">Central de Apuração • Ao Vivo</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-6 py-3 rounded-full">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
          <span className="font-bold tracking-widest uppercase text-sm">Transmissão Ativa</span>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 z-10">
        
        {/* BLOCO ESQUERDO: Termômetro Gigante */}
        <div className="lg:col-span-2 flex flex-col justify-center space-y-12">
          
          <div className="text-center">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-slate-400 mb-2">Engajamento Eleitoral</h2>
            <div className="text-[12rem] font-black leading-none tracking-tighter flex items-center justify-center gap-4">
              {estatisticas.percent}<span className="text-6xl text-slate-500">%</span>
            </div>
            {estatisticas.isHot && <p className="text-orange-500 font-black uppercase tracking-[0.5em] mt-4 flex items-center justify-center gap-2 animate-pulse"><Flame className="w-6 h-6"/> Quórum Elevado!</p>}
          </div>

          <div className="w-full bg-slate-900 rounded-full h-8 border-2 border-slate-800 overflow-hidden relative shadow-inner">
            <div 
              className={`h-full transition-all duration-1000 ${estatisticas.isHot ? 'bg-gradient-to-r from-orange-600 to-yellow-400' : 'bg-gradient-to-r from-blue-800 to-blue-400'}`} 
              style={{ width: `${estatisticas.percent}%` }}
            ></div>
          </div>

          <div className="grid grid-cols-2 gap-8 px-12">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm">
              <Users className="w-10 h-10 mx-auto text-slate-500 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Eleitores Aptos</p>
              <p className="text-5xl font-black">{estatisticas.total}</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center backdrop-blur-sm">
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">Já Votaram</p>
              <p className="text-5xl font-black text-green-400">{estatisticas.votaram}</p>
            </div>
          </div>

        </div>

        {/* BLOCO DIREITO: Pódio das Turmas */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col">
          <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-800">
            <div className="p-4 bg-yellow-500/10 rounded-2xl border border-yellow-500/20">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest">Top 5 Turmas</h2>
              <p className="text-sm text-slate-400 uppercase font-bold">Maior Adesão à Urna</p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            {ranking.length === 0 ? (
              <p className="text-center text-slate-500 py-10 font-bold uppercase tracking-widest">Aguardando Votos...</p>
            ) : (
              ranking.map((turma, idx) => (
                <div key={turma.id} className="bg-white/5 border border-white/10 p-5 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-black ${
                      idx === 0 ? 'bg-yellow-500 text-slate-900 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 
                      idx === 1 ? 'bg-slate-300 text-slate-800' : 
                      idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}º
                    </div>
                    <p className="text-xl font-bold text-slate-200">{turma.nome}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-black ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>{turma.engajamento}%</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
};

export default Telao;
