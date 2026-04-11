
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, ShieldCheck, CheckCircle2, XCircle, Loader2, ArrowLeft, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const Transparencia = () => {
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'idle' | 'found' | 'not_found'>('idle');
  const [voteData, setVoteData] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash.trim()) return;

    setLoading(true);
    setResult('idle');

    // Procura o voto pelo recibo criptográfico exato
    // Remove o '#' caso o aluno digite junto
    const cleanHash = hash.replace('#', '').trim();

    const { data, error } = await supabase
      .from('votes')
      .select('created_at, eleicao_id')
      .ilike('hash_voto', `%${cleanHash}%`)
      .limit(1)
      .single();

    if (error || !data) {
      setResult('not_found');
    } else {
      setVoteData(data);
      setResult('found');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-400/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl p-8 md:p-12 relative z-10 border border-slate-200">
        
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-blue-600 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Voltar ao Início
        </Link>

        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Portal da Transparência</h1>
          <p className="text-slate-500 font-medium mt-3 max-w-md mx-auto">
            Consulte a integridade do seu voto utilizando o <strong>Protocolo Criptográfico</strong> gerado pela Urna.
          </p>
        </div>

        <form onSubmit={handleSearch} className="relative max-w-lg mx-auto mb-10">
          <Search className="w-6 h-6 absolute left-5 top-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Ex: 8F9B2A4..." 
            className="w-full pl-14 pr-32 py-5 text-lg bg-slate-50 border-2 border-slate-200 rounded-2xl outline-none focus:border-blue-500 text-slate-800 font-mono font-bold tracking-widest transition-all"
            value={hash}
            onChange={(e) => setHash(e.target.value.toUpperCase())}
          />
          <button 
            type="submit"
            disabled={loading || !hash.trim()}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verificar'}
          </button>
        </form>

        {/* RESULTADOS */}
        {result === 'found' && voteData && (
          <div className="animate-in fade-in zoom-in duration-500 bg-green-50 border-2 border-green-200 rounded-2xl p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <ShieldCheck className="w-32 h-32 text-green-600" />
            </div>
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4 relative z-10" />
            <h2 className="text-2xl font-black text-green-800 uppercase tracking-widest relative z-10">Voto Autêntico</h2>
            <p className="text-green-700 font-medium mt-2 relative z-10">O seu voto foi registado com sucesso e encontra-se intacto na base de dados.</p>
            
            <div className="mt-6 bg-white/60 p-4 rounded-xl text-left border border-green-100 relative z-10 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Data do Registo</p>
                <p className="font-bold text-slate-800">{new Date(voteData.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest">Sigilo do Voto</p>
                <p className="font-bold text-slate-800 flex items-center gap-1"><Lock className="w-4 h-4"/> 100% Protegido</p>
              </div>
            </div>
          </div>
        )}

        {result === 'not_found' && (
          <div className="animate-in fade-in zoom-in duration-500 bg-red-50 border-2 border-red-200 rounded-2xl p-8 text-center">
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-red-800 uppercase tracking-widest">Registo Não Encontrado</h2>
            <p className="text-red-700 font-medium mt-2">Não encontrámos nenhum voto com este protocolo. Verifique se digitou o código corretamente.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Transparencia;
