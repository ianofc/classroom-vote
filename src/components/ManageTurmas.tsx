import { useState, useEffect } from "react";
import { Turma, Student } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Users, Loader2, Save, X, UserPlus, UploadCloud, Tag, Printer, Contact2, Zap, FileText, Contact } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Papa from 'papaparse';

interface ManageTurmasProps { onTurmasChanged: () => void; }

const ManageTurmas = ({ onTurmasChanged }: ManageTurmasProps) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [newTurmaName, setNewTurmaName] = useState("");
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", document: "", contact: "", is_candidate: false, candidate_number: "", vice_name: "" });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [escolaId, setEscolaId] = useState<string | null>(null);
  const [escolaNome, setEscolaNome] = useState("Instituição");
  const [escolaLogo, setEscolaLogo] = useState<string | null>(null);

  const [studentTags, setStudentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPrintingCard, setIsPrintingCard] = useState(false);

  useEffect(() => { fetchTurmas(); }, []);

  const fetchTurmas = async () => {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const { data: adminData } = await supabase.from('admins').select('escolas(id, nome, logo_url)').eq('auth_id', userData.user.id).single();
      let eId = null; let eNome = "Instituição"; let eLogo = null;
      if (adminData?.escolas) {
        const escolaData = Array.isArray(adminData.escolas) ? adminData.escolas[0] : adminData.escolas;
        eId = escolaData?.id; eNome = escolaData?.nome || "Instituição"; eLogo = escolaData?.logo_url || null;
      }
      if (eId) {
        setEscolaId(eId); setEscolaNome(eNome); setEscolaLogo(eLogo);
        const { data } = await supabase.from('turmas').select('*').eq('escola_id', eId).order('name');
        setTurmas(data || []);
      }
    }
    setLoading(false);
  };

  const handleAddTurma = async () => {
    if (!newTurmaName.trim() || !escolaId) return;
    const { data, error } = await supabase.from('turmas').insert([{ name: newTurmaName, escola_id: escolaId }]).select().single();
    if (!error && data) { setTurmas([...turmas, data]); setNewTurmaName(""); onTurmasChanged(); toast({ title: "Sucesso", description: "Turma adicionada!" }); }
  };

  const handleCreateTestEnvironment = async () => {
    if (!escolaId) return;
    setLoading(true);
    try {
      const { data: turmaData, error: turmaError } = await supabase.from('turmas').insert([{ name: "Turma de Teste 🧪", escola_id: escolaId }]).select().single();
      if (turmaError) throw turmaError;
      const mockStudents = [
        { turma_id: turmaData.id, name: "Eleitor de Teste", document: "000000", is_candidate: false },
        { turma_id: turmaData.id, name: "Candidato Alfa", document: "111111", is_candidate: true, candidate_number: 10, candidate_role: "Candidato Teste", vice_name: "Vice Beta" },
        { turma_id: turmaData.id, name: "Candidato Ômega", document: "222222", is_candidate: true, candidate_number: 20, candidate_role: "Candidato Teste", vice_name: "Vice Delta" }
      ];
      const { error: stdError } = await supabase.from('students').insert(mockStudents);
      if (stdError) throw stdError;
      toast({ title: "Ambiente de Teste Criado!", description: "A Turma de Teste e os alunos foram gerados com sucesso." });
      fetchTurmas();
    } catch(e: any) { toast({ title: "Erro ao gerar teste", description: e.message, variant: "destructive" }); }
    setLoading(false);
  };

  // EXCLUSÃO EM CASCATA DA TURMA E SEUS VOTOS
  const handleDeleteTurma = async (id: string) => {
    if (!confirm("Atenção! Excluir esta turma apagará permanentemente todos os alunos E TODOS OS VOTOS vinculados a ela. Tem a certeza absoluta?")) return;
    setLoading(true);
    await supabase.from('votes').delete().eq('turma_id', id);
    await supabase.from('students').delete().eq('turma_id', id);
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    
    if (!error) {
      setTurmas(turmas.filter(t => t.id !== id));
      if (selectedTurma?.id === id) setSelectedTurma(null);
      onTurmasChanged();
      toast({ title: "Sucesso", description: "Turma e registos removidos." });
    } else {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const fetchStudents = async (turmaId: string) => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').eq('turma_id', turmaId).order('name');
    setStudents(data || []);
    setLoading(false);
  };

  const selectTurma = (t: Turma) => { setSelectedTurma(t); fetchStudents(t.id); resetForm(); };

  const resetForm = () => {
    setNewStudent({ name: "", document: "", contact: "", is_candidate: false, candidate_number: "", vice_name: "" });
    setStudentTags([]); setTagInput(""); setEditingStudentId(null);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !studentTags.includes(tagInput.trim())) { setStudentTags([...studentTags, tagInput.trim()]); setTagInput(""); }
  };
  const removeTag = (tagToRemove: string) => { setStudentTags(studentTags.filter(tag => tag !== tagToRemove)); };

  const handleSaveStudent = async () => {
    if (!newStudent.name.trim() || !selectedTurma) return;
    const cargosFinal = studentTags.join(', ');
    const payload = {
      turma_id: selectedTurma.id, name: newStudent.name, document: newStudent.document, contact: newStudent.contact,
      is_candidate: newStudent.is_candidate, candidate_role: cargosFinal,
      candidate_number: newStudent.candidate_number ? parseInt(newStudent.candidate_number) : null, vice_name: newStudent.vice_name
    };

    if (editingStudentId) {
      const { error } = await supabase.from('students').update(payload).eq('id', editingStudentId);
      if (!error) { toast({ title: "Atualizado", description: "Dados do aluno atualizados." }); fetchStudents(selectedTurma.id); resetForm(); }
    } else {
      const { error } = await supabase.from('students').insert([payload]);
      if (!error) { toast({ title: "Adicionado", description: "Aluno adicionado com sucesso." }); fetchStudents(selectedTurma.id); resetForm(); }
    }
  };

  const startEditStudent = (s: Student) => {
    setNewStudent({ name: s.name, document: s.document || "", contact: s.contact || "", is_candidate: s.is_candidate || false, candidate_number: s.candidate_number?.toString() || "", vice_name: s.vice_name || "" });
    setStudentTags(s.candidate_role ? s.candidate_role.split(',').map(r => r.trim()) : []); setEditingStudentId(s.id!);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Remover aluno? Os votos dados a ele continuarão no sistema, mas a identidade será apagada.")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) { setStudents(students.filter(s => s.id !== id)); toast({ title: "Removido", description: "Aluno removido." }); }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTurma) return;
    setLoading(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const formattedStudents = rows.map(row => ({ turma_id: selectedTurma.id, name: row.Nome || row.name || row.NOME, document: row.Matricula || row.document || row.MATRICULA || null, is_candidate: false })).filter(s => s.name);
        if (formattedStudents.length > 0) {
          const { error } = await supabase.from('students').insert(formattedStudents);
          if (error) toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
          else { toast({ title: "Planilha Importada!", description: `${formattedStudents.length} alunos cadastrados.` }); fetchStudents(selectedTurma.id); }
        }
        setLoading(false);
      }
    });
  };

  // ========================================================================
  // AS MESMAS FUNÇÕES DE MÍDIA DA ABA ADMIN PARA MANTER A CONSISTÊNCIA
  // ========================================================================
  const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';

  const generateSantinhoHTML = (candidate: any) => {
    const primaryRole = candidate.candidate_role ? escapeHtml(candidate.candidate_role.split(',')[0].trim()) : "Candidato";
    return `
      <div class="card">
        <div class="header">
          <div class="logo-placeholder">${escolaLogo ? `<img src="${escolaLogo}" />` : `<span style="color:#fff; font-size: 20px;">🏛️</span>`}</div>
          <div class="school">${escapeHtml(escolaNome)}</div>
          <h1 class="role">${primaryRole}</h1>
          <div class="turma">Turma: ${escapeHtml(selectedTurma?.name || '')}</div>
        </div>
        <div class="body">
          <div class="number-box"><span class="number-label">Vote Certo</span><p class="number">${candidate.candidate_number}</p></div>
          <h2 class="name">${escapeHtml(candidate.name)}</h2>
          ${candidate.vice_name ? `<p class="vice">Vice: ${escapeHtml(candidate.vice_name)}</p>` : ''}
        </div>
        <div class="footer">Credencial Oficial</div>
      </div>
    `;
  };

  const printSantinhos = (candidates: any[]) => {
    setIsPrintingCard(true);
    const pages = candidates.map(cand => {
      let cards = ''; for(let i=0; i<8; i++) { cards += generateSantinhoHTML(cand); }
      return `<div class="page">${cards}</div>`;
    }).join('');

    const html = `<html><head><title>Impressão Ecológica - Santinhos</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      @page { size: A4 portrait; margin: 8mm; }
      body { margin:0; padding:0; font-family:'Inter',sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: repeat(4, 1fr); gap: 4mm; height: 280mm; width: 194mm; page-break-after: always; }
      .card { background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; overflow: hidden; border: 1px solid #334155; position: relative; display: flex; flex-direction: column; }
      .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #fbbf24, #f59e0b); }
      .header { padding: 10px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .logo-placeholder { width: 35px; height: 35px; margin: 0 auto 5px auto; display: flex; align-items: center; justify-content: center; }
      .logo-placeholder img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .school { font-size: 7px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #94a3b8; margin-bottom: 2px; }
      .role { font-size: 14px; font-weight: 900; text-transform: uppercase; color: #f8fafc; margin: 0; line-height: 1.1; }
      .turma { font-size: 8px; font-weight: bold; color: #fbbf24; background: rgba(251,191,36,0.1); display: inline-block; padding: 2px 8px; border-radius: 10px; margin-top: 5px; }
      .body { padding: 10px; text-align: center; flex: 1; display:flex; flex-direction:column; justify-content:center; }
      .number-box { background: rgba(0,0,0,0.3); border: 1.5px solid #fbbf24; border-radius: 10px; display: inline-block; padding: 5px 20px; margin: 0 auto 10px auto; }
      .number-label { font-size: 7px; color: #fbbf24; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 2px; }
      .number { font-size: 36px; font-weight: 900; color: #ffffff; margin: 0; line-height: 1; }
      .name { font-size: 18px; font-weight: 900; color: #f8fafc; text-transform: uppercase; margin: 0; line-height: 1.1; letter-spacing: -0.5px; }
      .vice { font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; margin-top: 4px; }
      .footer { background: #020617; color: #475569; text-align: center; padding: 8px; font-size: 6px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
    </style></head><body>${pages}<script>window.onload=()=>window.print()</script></body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); setTimeout(() => setIsPrintingCard(false), 1000); }
  };

  const generateBadgeHTML = (candidate: any) => {
    const primaryRole = candidate.candidate_role ? escapeHtml(candidate.candidate_role.split(',')[0].trim()) : "Candidato";
    return `
      <div class="badge">
        <div class="hole-punch"></div>
        <div class="header">
          ${escolaLogo ? `<img src="${escolaLogo}" style="height:8mm; margin-bottom:1mm; object-fit:contain;" />` : ''}
          <span class="school-name">${escapeHtml(escolaNome)}</span>
        </div>
        <div class="photo-area">3x4 FOTO</div>
        <div class="info-area">
          <h1 class="name">${escapeHtml(candidate.name)}</h1>
          <h2 class="role">${primaryRole}</h2>
          <div class="details"><span>Turma: ${escapeHtml(selectedTurma?.name || '')}</span><span>Ano Letivo: ${new Date().getFullYear()}</span></div>
          <div class="number-badge">${candidate.candidate_number}</div>
        </div>
      </div>
    `;
  };

  const printBadges = (candidates: any[]) => {
    setIsPrintingCard(true);
    const badges = candidates.map(c => generateBadgeHTML(c)).join('');
    const html = `<html><head><title>Impressão Ecológica - Crachás</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      @page { size: A4 portrait; margin: 10mm; }
      body { margin:0; padding:0; font-family:'Inter',sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-container { display: flex; flex-wrap: wrap; gap: 5mm; justify-content: flex-start; }
      .badge { width: 54mm; height: 86mm; background: white; border-radius: 8px; border: 1px solid #cbd5e1; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; }
      .hole-punch { width: 14mm; height: 3mm; border-radius: 5px; border: 1px solid #cbd5e1; position: absolute; top: 4mm; background: #f8fafc; z-index: 10; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
      .header { width: 100%; height: 28mm; background: linear-gradient(135deg, #1e3a8a, #0f172a); position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 3mm; }
      .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 1.5mm; background: #fbbf24; }
      .school-name { color: #f8fafc; font-size: 7px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; text-align: center; margin-top: 5mm; padding: 0 5mm; }
      .photo-area { width: 28mm; height: 35mm; border: 2px solid #cbd5e1; background: #f1f5f9; margin-top: 4mm; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 8px; font-weight: bold; text-transform: uppercase; }
      .info-area { text-align: center; margin-top: 2mm; padding: 0 4mm; width: 100%; box-sizing: border-box; flex: 1; display:flex; flex-direction:column; }
      .name { font-size: 13px; font-weight: 900; color: #0f172a; text-transform: uppercase; line-height: 1; margin: 0; letter-spacing: -0.5px;}
      .role { font-size: 9px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; margin: 1mm 0 2mm 0; }
      .details { font-size: 7px; color: #64748b; font-weight: bold; margin-bottom: 2mm; display: flex; flex-direction: column; gap: 1px;}
      .number-badge { margin-top: auto; background: #0f172a; color: #fbbf24; display: inline-block; padding: 1.5mm 5mm; border-radius: 6px; font-size: 18px; font-weight: 900; margin-bottom: 4mm;}
    </style></head><body><div class="badge-container">${badges}</div><script>window.onload=()=>window.print()</script></body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); setTimeout(() => setIsPrintingCard(false), 1000); }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 h-fit">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><Users className="w-4 h-4"/> Turmas Cadastradas</h3>
        
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="Nova Turma" className="w-full p-2 text-sm border rounded outline-none focus:border-blue-500" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
        </div>

        <button onClick={handleCreateTestEnvironment} disabled={loading || !escolaId} className="w-full mb-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          <Zap className="w-4 h-4" /> GERAR AMBIENTE DE TESTE RÁPIDO
        </button>

        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {turmas.map(t => (
            <div key={t.id} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedTurma?.id === t.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-slate-100'}`} onClick={() => selectTurma(t)}>
              <span className="font-bold text-slate-700 text-sm">{t.name}</span>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteTurma(t.id); }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full md:w-2/3">
        {selectedTurma ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl">
              <h2 className="text-xl font-black flex items-center gap-2">Turma: <span className="text-blue-400">{selectedTurma.name}</span></h2>
              <label className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-2 transition-colors"><UploadCloud className="w-4 h-4"/> Importar CSV<input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} /></label>
            </div>

            <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-4">{editingStudentId ? "Editar Identidade Digital" : "Cadastrar Manualmente"}</h3>
              <div className="space-y-4">
                <input type="text" placeholder="Nome Completo" className="w-full p-3 border border-slate-200 rounded bg-slate-50 text-sm font-bold" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                
                <label className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-blue-600" checked={newStudent.is_candidate} onChange={e => setNewStudent({...newStudent, is_candidate: e.target.checked})} />
                  <span className="text-sm font-black text-blue-900 uppercase">ESTE ALUNO TEM CARGO / É CANDIDATO</span>
                </label>

                {newStudent.is_candidate && (
                  <div className="bg-white p-4 border-2 border-blue-100 rounded-xl space-y-4 animate-in fade-in">
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Nº de Urna (Ex: 10)" className="p-3 border rounded bg-slate-50 text-sm font-bold" value={newStudent.candidate_number} onChange={e => setNewStudent({...newStudent, candidate_number: e.target.value})} />
                      <input type="text" placeholder="Nome do Vice (Opcional)" className="p-3 border rounded bg-slate-50 text-sm" value={newStudent.vice_name} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Perfis Vinculados (Tags)</p>
                      <div className="flex gap-2 mb-3">
                        <input type="text" placeholder="Ex: Jovem Ouvidor LGBT" className="flex-1 p-2 border rounded text-sm outline-none focus:border-blue-500" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleAddTag() }} />
                        <button onClick={handleAddTag} className="bg-slate-800 text-white px-3 py-2 rounded text-xs font-bold hover:bg-slate-700">Adicionar</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {studentTags.length === 0 && <span className="text-xs text-slate-400 italic">Nenhum cargo adicionado.</span>}
                        {studentTags.map((tag, i) => (
                          <div key={i} className="flex items-center gap-1 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-lg text-xs font-bold border border-indigo-200">
                            <Tag className="w-3 h-3"/> {tag}
                            <button onClick={() => removeTag(tag)} className="ml-1 text-indigo-400 hover:text-red-500"><X className="w-3 h-3"/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button onClick={handleSaveStudent} className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 flex items-center justify-center gap-2">
                    {editingStudentId ? <Save className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>} 
                    {editingStudentId ? "ATUALIZAR PERFIL" : "CRIAR IDENTIDADE"}
                  </button>
                  {editingStudentId && (<button onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 rounded-lg font-bold hover:bg-slate-300">Cancelar</button>)}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-3 border-b border-slate-200"><h3 className="text-xs font-bold uppercase text-slate-500">Cidadãos Registrados ({students.length})</h3></div>
              <div className="max-h-[400px] overflow-y-auto">
                {loading ? <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div> : students.length === 0 ? <div className="text-center p-8 text-sm text-slate-400">Nenhum perfil criado nesta turma.</div> : (
                  <div className="divide-y divide-slate-100">
                    {students.map(s => (
                      <div key={s.id} className="p-4 hover:bg-slate-50 flex items-center justify-between group">
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">{s.is_candidate && <Contact2 className="w-4 h-4 text-blue-500" />}{s.name}</p>
                          {s.is_candidate && s.candidate_role && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.candidate_role.split(',').map((tag, i) => (<span key={i} className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">{tag.trim()}</span>))}
                              {s.candidate_number && <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md">Nº {s.candidate_number}</span>}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {s.is_candidate && <button onClick={() => printSantinhos([s])} disabled={isPrintingCard} title="Imprimir Santinho (Página Cheia)" className="p-2 text-indigo-600 hover:bg-indigo-100 rounded mr-1 transition-colors"><FileText className="w-4 h-4"/></button>}
                          {s.is_candidate && <button onClick={() => printBadges([s])} disabled={isPrintingCard} title="Imprimir Crachá Oficial" className="p-2 text-indigo-600 hover:bg-indigo-100 rounded mr-2 transition-colors"><Contact className="w-4 h-4"/></button>}
                          <button onClick={() => startEditStudent(s)} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteStudent(s.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50">
            <Users className="w-12 h-12 mb-4 opacity-50" />
            <p className="font-medium text-lg">Selecione uma turma ao lado</p>
            <p className="text-sm">para gerir as Identidades Digitais.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default ManageTurmas;
