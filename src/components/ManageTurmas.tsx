import { useState, useEffect } from "react";
import { Turma, Student } from "@/data/turmas";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Edit2, Users, Loader2, Save, X, UserPlus, UploadCloud, Tag, Printer, Contact2, Zap, FileText, Contact, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Papa from 'papaparse';

interface ManageTurmasProps { onTurmasChanged: () => void; }

const ManageTurmas = ({ onTurmasChanged }: ManageTurmasProps) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [newTurmaName, setNewTurmaName] = useState("");
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [newStudent, setNewStudent] = useState({ name: "", document: "", is_candidate: false, candidate_number: "", vice_name: "" });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [escolaId, setEscolaId] = useState<string | null>(null);
  const [escolaNome, setEscolaNome] = useState("Instituição");
  const [escolaLogo, setEscolaLogo] = useState<string | null>(null);

  const [studentTags, setStudentTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPrintingCard, setIsPrintingCard] = useState(false);

  // ESTADOS DE BUSCA (INDEPENDENTES E GLOBAIS)
  const [turmaSearch, setTurmaSearch] = useState("");
  const [globalStudentSearch, setGlobalStudentSearch] = useState("");
  const [allGlobalStudents, setAllGlobalStudents] = useState<Student[]>([]);

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
        const { data: turmasData } = await supabase.from('turmas').select('*').eq('escola_id', eId).order('name');
        if (turmasData) {
          setTurmas(turmasData);
          await refreshGlobalStudents(turmasData);
        }
      }
    }
    setLoading(false);
  };

  // Função utilitária para manter a pesquisa global atualizada em cache
  const refreshGlobalStudents = async (currentTurmas: Turma[]) => {
    const tIds = currentTurmas.map(t => t.id);
    if (tIds.length > 0) {
      const { data } = await supabase.from('students').select('*').in('turma_id', tIds);
      setAllGlobalStudents(data || []);
    } else {
      setAllGlobalStudents([]);
    }
  };

  const handleAddTurma = async () => {
    if (!newTurmaName.trim() || !escolaId) return;
    const { data, error } = await supabase.from('turmas').insert([{ name: newTurmaName, escola_id: escolaId }]).select().single();
    if (!error && data) { 
      const novasTurmas = [...turmas, data];
      setTurmas(novasTurmas); 
      setNewTurmaName(""); 
      onTurmasChanged(); 
      toast({ title: "Sucesso", description: "Turma adicionada!" }); 
    }
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

  const handleDeleteTurma = async (id: string) => {
    if (!confirm("Atenção! Excluir esta turma apagará permanentemente todos os alunos E TODOS OS VOTOS vinculados a ela. Tem a certeza absoluta?")) return;
    setLoading(true);
    await supabase.from('votes').delete().eq('turma_id', id);
    await supabase.from('students').delete().eq('turma_id', id);
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    if (!error) {
      const novasTurmas = turmas.filter(t => t.id !== id);
      setTurmas(novasTurmas);
      await refreshGlobalStudents(novasTurmas);
      if (selectedTurma?.id === id) setSelectedTurma(null);
      onTurmasChanged(); toast({ title: "Sucesso", description: "Turma e registos removidos." });
    } else { toast({ title: "Erro", description: error.message, variant: "destructive" }); }
    setLoading(false);
  };

  const fetchStudents = async (turmaId: string) => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').eq('turma_id', turmaId).order('name');
    setStudents(data || []); setLoading(false);
  };

  const selectTurma = (t: Turma) => { setSelectedTurma(t); fetchStudents(t.id); resetForm(); };

  const resetForm = () => { setNewStudent({ name: "", document: "", is_candidate: false, candidate_number: "", vice_name: "" }); setStudentTags([]); setTagInput(""); setEditingStudentId(null); };

  const handleAddTag = () => { if (tagInput.trim() && !studentTags.includes(tagInput.trim())) { setStudentTags([...studentTags, tagInput.trim()]); setTagInput(""); } };
  const removeTag = (tagToRemove: string) => { setStudentTags(studentTags.filter(tag => tag !== tagToRemove)); };

  const handleSaveStudent = async () => {
    if (!newStudent.name?.trim() || !selectedTurma) {
      toast({ title: "Atenção", description: "O nome do aluno é obrigatório.", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      const cargosFinal = studentTags.join(', ');
      const numParsed = parseInt(newStudent.candidate_number);
      
      const payload = {
        turma_id: selectedTurma.id, 
        name: newStudent.name?.trim(), 
        document: newStudent.document?.trim() || null, 
        is_candidate: newStudent.is_candidate, 
        candidate_role: (newStudent.is_candidate && cargosFinal) ? cargosFinal : null,
        candidate_number: (newStudent.is_candidate && !isNaN(numParsed)) ? numParsed : null, 
        vice_name: newStudent.is_candidate ? (newStudent.vice_name?.trim() || null) : null
      };

      if (editingStudentId) {
        const { error } = await supabase.from('students').update(payload).eq('id', editingStudentId);
        if (error) throw error;
        toast({ title: "Atualizado", description: "Dados do aluno atualizados com sucesso." }); 
      } else {
        const { error } = await supabase.from('students').insert([payload]);
        if (error) throw error;
        toast({ title: "Adicionado", description: "Aluno adicionado com sucesso." }); 
      }
      
      fetchStudents(selectedTurma.id); 
      await refreshGlobalStudents(turmas);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro na Base de Dados", description: err.message || "Não foi possível guardar.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const startEditStudent = (s: Student) => {
    setNewStudent({ 
      name: s.name, 
      document: s.document || "", 
      is_candidate: s.is_candidate || false, 
      candidate_number: s.candidate_number ? s.candidate_number.toString() : "", 
      vice_name: s.vice_name || "" 
    });
    setStudentTags(s.candidate_role ? s.candidate_role.split(',').map(r => r.trim()) : []); 
    setEditingStudentId(s.id!);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Remover aluno permanentemente?")) return;
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
      setStudents(students.filter(s => s.id !== id)); 
      await refreshGlobalStudents(turmas);
      toast({ title: "Removido", description: "Aluno removido com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !selectedTurma) return;
    setLoading(true);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as any[];
        const formattedStudents = rows.map(row => ({ turma_id: selectedTurma.id, name: row.Nome || row.name || row.NOME, document: row.Matricula || row.document || row.MATRICULA || null, is_candidate: false })).filter(s => s.name);
        if (formattedStudents.length > 0) {
          const { error } = await supabase.from('students').insert(formattedStudents);
          if (error) toast({ title: "Erro no Upload", description: error.message, variant: "destructive" });
          else { 
            toast({ title: "Planilha Importada!", description: `${formattedStudents.length} alunos cadastrados.` }); 
            fetchStudents(selectedTurma.id); 
            await refreshGlobalStudents(turmas);
          }
        }
        setLoading(false);
      }
    });
  };

  // LOGICA DO CLIQUE NA BUSCA GLOBAL
  const handleSelectGlobalStudent = async (student: Student) => {
    const turma = turmas.find(t => t.id === student.turma_id);
    if (turma) {
      setSelectedTurma(turma);
      setGlobalStudentSearch(""); 
      setLoading(true);
      const { data } = await supabase.from('students').select('*').eq('turma_id', turma.id).order('name');
      setStudents(data || []);
      setLoading(false);
      startEditStudent(student);
    }
  };

  // HELPER DA TURMA
  const getTurmaName = (turmaId: string) => turmas.find(t => t.id === turmaId)?.name || "Turma Desconhecida";

  // IMPRESSÕES...
  const escapeHtml = (t: string) => t ? t.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)) : '';

  const generateCardHTML = (candidate: any, isBadge: boolean) => {
    const primaryRole = candidate.candidate_role ? escapeHtml(candidate.candidate_role.split(',')[0].trim()) : "Candidato";
    return `
      <div class="card ${isBadge ? 'badge-card' : 'santinho-card'}">
        ${isBadge ? '<div class="hole-punch"></div>' : ''}
        <div class="header">
          ${escolaLogo ? `<img src="${escolaLogo}" />` : `<span style="color:#fff; font-size: ${isBadge?'16px':'12px'};">🏛️</span>`}
          <span class="school-name">${escapeHtml(escolaNome)}</span>
        </div>
        ${isBadge ? '<div class="photo-area">3x4 FOTO</div>' : ''}
        <div class="info-area">
          <h1 class="name">${escapeHtml(candidate.name)}</h1>
          <h2 class="role">${primaryRole}</h2>
          <div class="details">
            <span>Turma: ${escapeHtml(getTurmaName(candidate.turma_id))}</span>
            ${!isBadge && candidate.vice_name ? `<span>Vice: ${escapeHtml(candidate.vice_name)}</span>` : ''}
            ${isBadge ? `<span>Ano Letivo: ${new Date().getFullYear()}</span>` : ''}
          </div>
          <div class="number-badge">
            ${!isBadge ? '<span class="vote-label">VOTE</span>' : ''}
            ${candidate.candidate_number}
          </div>
        </div>
      </div>
    `;
  };

  const printDocs = (candidates: any[], isBadge: boolean) => {
    setIsPrintingCard(true);
    const qtyPerPage = isBadge ? 4 : 8; 
    const itemsToPrint = candidates.length === 1 ? Array(qtyPerPage).fill(candidates[0]) : candidates;
    
    const pages = [];
    for (let i = 0; i < itemsToPrint.length; i += qtyPerPage) {
      const chunk = itemsToPrint.slice(i, i + qtyPerPage);
      const cardsHtml = chunk.map(c => generateCardHTML(c, isBadge)).join('');
      pages.push(`<div class="page">${cardsHtml}</div>`);
    }

    const html = `<html><head><title>Impressão Ecológica</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
      @page { size: A4 ${isBadge ? 'portrait' : 'landscape'}; margin: ${isBadge ? '5mm' : '6mm'}; }
      body { margin:0; padding:0; font-family:'Inter',sans-serif; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { display: grid; justify-content: center; align-content: center; width: 100%; height: 100vh; page-break-after: always;
        ${isBadge ? 'grid-template-columns: repeat(2, 100mm); grid-template-rows: repeat(2, 140mm); gap: 4mm;' : 'grid-template-columns: repeat(4, 70mm); grid-template-rows: repeat(2, 100mm); gap: 2mm;'}
      }
      .card { border-radius: 8px; border: 1px dashed #cbd5e1; position: relative; display: flex; flex-direction: column; overflow: hidden; align-items: center; }
      .badge-card { background: white; width: 100mm; height: 140mm; }
      .santinho-card { background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%); width: 70mm; height: 100mm; }
      .santinho-card::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #fbbf24, #f59e0b); }
      .hole-punch { width: 15mm; height: 4mm; border-radius: 6px; border: 1px solid #cbd5e1; position: absolute; top: 5mm; background: #f8fafc; z-index: 10; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1); }
      .header { width: 100%; position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; }
      .badge-card .header { height: 35mm; background: linear-gradient(135deg, #1e3a8a, #0f172a); justify-content: flex-end; padding-bottom: 4mm; }
      .santinho-card .header { padding: 6px; justify-content: center; border-bottom: 1px solid rgba(255,255,255,0.05); }
      .badge-card .header::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2mm; background: #fbbf24; }
      .header img { max-width: 100%; max-height: 100%; object-fit: contain; }
      .badge-card img { height: 10mm; margin-bottom: 1mm; }
      .santinho-card img { height: 25px; margin-bottom: 2px; }
      .school-name { font-weight: 900; text-transform: uppercase; }
      .badge-card .school-name { color: #f8fafc; font-size: 10px; letter-spacing: 1.5px; margin-top: 2mm; padding: 0 5mm; }
      .santinho-card .school-name { color: #94a3b8; font-size: 6px; letter-spacing: 1px; margin-bottom: 1px; }
      .photo-area { border: 2px dashed #cbd5e1; background: #f8fafc; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: bold; text-transform: uppercase; width: 35mm; height: 45mm; margin-top: 8mm; border-radius: 8px; font-size: 10px; }
      .info-area { text-align: center; flex: 1; display:flex; flex-direction:column; }
      .badge-card .info-area { margin-top: 4mm; padding: 0 6mm; width: 100%; box-sizing: border-box; }
      .santinho-card .info-area { padding: 8px; justify-content:center; }
      .name { font-weight: 900; text-transform: uppercase; margin: 0; line-height: 1.1; letter-spacing: -0.5px; }
      .badge-card .name { color: #0f172a; font-size: 20px; }
      .santinho-card .name { color: #f8fafc; font-size: 14px; }
      .role { font-weight: 900; text-transform: uppercase; line-height: 1; }
      .badge-card .role { color: #1e3a8a; font-size: 14px; margin: 2mm 0 4mm 0; }
      .santinho-card .role { color: #f8fafc; font-size: 11px; margin: 0; }
      .details { font-weight: bold; display: flex; flex-direction: column; }
      .badge-card .details { color: #64748b; font-size: 10px; gap: 2px; margin-bottom: 2mm; }
      .santinho-card .details { color: #fbbf24; font-size: 7px; background: rgba(251,191,36,0.1); padding: 2px 6px; border-radius: 10px; margin-top: 6px; }
      .number-badge { font-weight: 900; line-height: 1; text-align:center; }
      .badge-card .number-badge { background: #0f172a; color: #fbbf24; display: inline-block; padding: 2mm 8mm; border-radius: 8px; font-size: 28px; margin-top: auto; margin-bottom: 8mm; }
      .santinho-card .number-badge { background: rgba(0,0,0,0.3); color: #ffffff; border: 1.5px solid #fbbf24; border-radius: 8px; display: inline-block; padding: 4px 15px; margin: 0 auto 6px auto; font-size: 28px; }
      .vote-label { font-size: 6px; color: #fbbf24; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 1px; }
    </style></head><body>${pages.join('')}<script>window.onload=()=>window.print()</script></body></html>`;
    const printWindow = window.open("", "_blank");
    if (printWindow) { printWindow.document.write(html); printWindow.document.close(); setTimeout(() => setIsPrintingCard(false), 1000); }
  };

  // FILTROS
  const filteredTurmas = turmas.filter(t => t.name.toLowerCase().includes(turmaSearch.toLowerCase()));
  const filteredGlobalStudents = allGlobalStudents.filter(s => s.name.toLowerCase().includes(globalStudentSearch.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* COLUNA ESQUERDA - TURMAS E BUSCA GLOBAL */}
      <div className="w-full md:w-1/3 bg-slate-50 p-4 rounded-xl border border-slate-200 h-fit">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4"><Users className="w-4 h-4"/> Gestão Base</h3>
        
        <div className="flex gap-2 mb-4">
          <input type="text" placeholder="Nova Turma" className="w-full p-2 text-sm border rounded outline-none focus:border-blue-500" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"><Plus className="w-4 h-4" /></button>
        </div>

        <button onClick={handleCreateTestEnvironment} disabled={loading || !escolaId} className="w-full mb-6 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
          <Zap className="w-4 h-4" /> GERAR AMBIENTE DE TESTE RÁPIDO
        </button>

        <div className="space-y-3 mb-4">
          {/* Busca Turmas */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              type="text" 
              placeholder="Procurar turma..." 
              className="w-full pl-9 p-2.5 border border-slate-200 rounded-lg text-sm bg-white outline-none focus:border-blue-500 shadow-sm"
              value={turmaSearch}
              onChange={(e) => setTurmaSearch(e.target.value)}
            />
          </div>

          {/* Busca Alunos Global */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-indigo-400" />
            <input 
              type="text" 
              placeholder="Procurar aluno em toda a escola..." 
              className="w-full pl-9 p-2.5 border border-indigo-100 rounded-lg text-sm bg-indigo-50/50 text-indigo-900 outline-none focus:border-indigo-500 shadow-sm placeholder:text-indigo-300 font-bold transition-all"
              value={globalStudentSearch}
              onChange={(e) => setGlobalStudentSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 custom-scrollbar">
          {globalStudentSearch.trim().length > 0 ? (
            // RENDERIZA A BUSCA GLOBAL DE ALUNOS SE ESTIVER A DIGITAR
            filteredGlobalStudents.length === 0 ? (
              <p className="text-center text-xs text-slate-400 mt-4">Nenhum aluno encontrado na escola.</p>
            ) : (
              filteredGlobalStudents.map(s => (
                <div key={s.id} className="p-3 rounded-lg border bg-white cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition-colors shadow-sm" onClick={() => handleSelectGlobalStudent(s)}>
                  <p className="font-bold text-slate-800 text-sm">{s.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider flex items-center gap-1"><Users className="w-3 h-3"/> {getTurmaName(s.turma_id)}</p>
                </div>
              ))
            )
          ) : (
            // RENDERIZA A LISTA NORMAL DE TURMAS
            filteredTurmas.length === 0 ? (
              <p className="text-center text-xs text-slate-400 mt-4">Nenhuma turma encontrada.</p>
            ) : (
              filteredTurmas.map(t => (
                <div key={t.id} className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-colors ${selectedTurma?.id === t.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white hover:bg-slate-100'}`} onClick={() => selectTurma(t)}>
                  <span className="font-bold text-slate-700 text-sm">{t.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteTurma(t.id); }} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* COLUNA DIREITA - ALUNOS DA TURMA */}
      <div className="w-full md:w-2/3">
        {selectedTurma ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-md">
              <h2 className="text-xl font-black flex items-center gap-2">Turma: <span className="text-blue-400">{selectedTurma.name}</span></h2>
              <label className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-2 transition-colors shadow-sm">
                <UploadCloud className="w-4 h-4"/> Importar CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className={`bg-white border border-slate-200 p-5 rounded-xl shadow-sm transition-all ${editingStudentId ? 'ring-4 ring-blue-50 border-blue-300' : ''}`}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${editingStudentId ? 'text-blue-600' : 'text-slate-400'}`}>
                {editingStudentId ? "A Editar Perfil do Aluno" : "Cadastrar Manualmente"}
              </h3>
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
                  <button onClick={handleSaveStudent} disabled={loading} className="flex-1 bg-slate-900 text-white py-3 rounded-lg font-bold text-sm hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : (editingStudentId ? <Save className="w-4 h-4"/> : <UserPlus className="w-4 h-4"/>)} 
                    {editingStudentId ? "GUARDAR ALTERAÇÕES" : "CRIAR IDENTIDADE"}
                  </button>
                  {editingStudentId && (<button onClick={resetForm} className="bg-slate-200 text-slate-700 px-4 rounded-lg font-bold hover:bg-slate-300 transition-colors">Cancelar</button>)}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase text-slate-500">Cidadãos Registrados ({students.length})</h3>
              </div>

              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {loading ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
                ) : students.length === 0 ? (
                  <div className="text-center p-8 text-sm text-slate-400">Nenhum aluno encontrado nesta turma.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {students.map(s => (
                      <div key={s.id} className="p-4 hover:bg-slate-50 flex items-center justify-between group transition-colors">
                        <div>
                          <p className="font-bold text-slate-800 flex items-center gap-2">
                            {s.is_candidate && <Contact2 className="w-4 h-4 text-blue-500" />}
                            {s.name}
                          </p>
                          {s.is_candidate && s.candidate_role && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {s.candidate_role.split(',').map((tag, i) => (
                                <span key={i} className="bg-indigo-50 text-indigo-600 border border-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                                  {tag.trim()}
                                </span>
                              ))}
                              {s.candidate_number && (
                                <span className="bg-slate-800 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
                                  Nº {s.candidate_number}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {s.is_candidate && (
                            <button onClick={() => printDocs([s], false)} disabled={isPrintingCard} title="Imprimir Santinhos (A4)" className="p-2 text-indigo-600 hover:bg-indigo-100 rounded transition-colors"><FileText className="w-4 h-4"/></button>
                          )}
                          {s.is_candidate && (
                            <button onClick={() => printDocs([s], true)} disabled={isPrintingCard} title="Imprimir Crachás (A4)" className="p-2 text-indigo-600 hover:bg-indigo-100 rounded mr-2 transition-colors"><Contact className="w-4 h-4"/></button>
                          )}
                          <button onClick={() => startEditStudent(s)} className="p-2 text-blue-500 hover:bg-blue-50 rounded transition-colors"><Edit2 className="w-4 h-4"/></button>
                          <button onClick={() => handleDeleteStudent(s.id!)} className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl p-12 bg-slate-50/50 animate-in fade-in">
            <div className="w-20 h-20 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-6">
              <Users className="w-10 h-10" />
            </div>
            <p className="font-black text-xl text-slate-700 mb-2">Selecione ou Pesquise</p>
            <p className="text-sm font-medium text-slate-500 text-center max-w-sm">Para gerir alunos ou candidaturas, selecione uma turma na lista ou utilize a busca global para encontrar qualquer aluno na escola inteira.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageTurmas;
