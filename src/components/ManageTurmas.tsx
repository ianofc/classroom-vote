import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Users, Loader2, CheckSquare, Square, FileUp, UserCheck, Pencil, X, Save, Printer } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Turma { id: string; name: string; }
interface Student {
  id: string; turma_id: string; name: string;
  is_candidate: boolean; candidate_role?: string; candidate_number?: number; vice_name?: string;
}

// Lista de Cargos Atualizada
const ROLES = [
  "Líder Geral", 
  "Líder Quilombola", 
  "Líder do Campo", 
  "Líder LGBTQIA+", 
  "Líder Indígena",
  "Líder PCD"
];

const ManageTurmas = ({ onTurmasChanged }: { onTurmasChanged: () => void }) => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState<Turma | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados de Edição de Turma
  const [newTurmaName, setNewTurmaName] = useState("");
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [editTurmaName, setEditTurmaName] = useState("");

  // Estados de Formulário de Aluno (Apenas Nome)
  const [newStudent, setNewStudent] = useState<Partial<Student>>({ 
    name: "", is_candidate: false, candidate_role: ROLES[0] 
  });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isImportingCSV, setIsImportingCSV] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => { fetchTurmas(); }, []);
  useEffect(() => { if (selectedTurma) fetchStudents(selectedTurma.id); }, [selectedTurma]);

  const fetchTurmas = async () => {
    setLoading(true);
    const { data } = await supabase.from('turmas').select('*').order('name');
    if (data) setTurmas(data);
    setLoading(false);
  };

  const fetchStudents = async (turmaId: string) => {
    setLoading(true);
    const { data } = await supabase.from('students').select('*').eq('turma_id', turmaId).order('name');
    if (data) setStudents(data);
    setLoading(false);
  };

  // ==================== GESTÃO DE TURMAS ====================
  const handleAddTurma = async () => {
    if (!newTurmaName.trim()) return;
    const { data, error } = await supabase.from('turmas').insert({ name: newTurmaName.trim() }).select().single();
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else {
      setTurmas([...turmas, data]);
      setNewTurmaName("");
      toast({ title: "Sucesso", description: "Turma criada!" });
      onTurmasChanged();
    }
  };

  const saveEditTurma = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTurmaName.trim()) return;
    const { error } = await supabase.from('turmas').update({ name: editTurmaName.trim() }).eq('id', id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setTurmas(turmas.map(t => t.id === id ? { ...t, name: editTurmaName.trim() } : t));
      if (selectedTurma?.id === id) setSelectedTurma({ ...selectedTurma, name: editTurmaName.trim() });
      setEditingTurmaId(null);
      onTurmasChanged();
      toast({ title: "Sucesso", description: "Turma atualizada!" });
    }
  };

  const handleDeleteTurma = async (id: string) => {
    if (!confirm("Atenção! Isso apagará a turma, TODOS os alunos e TODOS OS VOTOS vinculados a ela. Continuar?")) return;
    await supabase.from('votes').delete().eq('turma_id', id);
    await supabase.from('students').delete().eq('turma_id', id);
    const { error } = await supabase.from('turmas').delete().eq('id', id);
    if (!error) {
      setTurmas(turmas.filter(t => t.id !== id));
      if (selectedTurma?.id === id) setSelectedTurma(null);
      onTurmasChanged();
      toast({ title: "Sucesso", description: "Turma excluída." });
    }
  };

  // ==================== GESTÃO DE ALUNOS E CANDIDATOS ====================
  const startEditStudent = (s: Student) => {
    setNewStudent({
      name: s.name,
      is_candidate: s.is_candidate,
      candidate_role: s.candidate_role || ROLES[0],
      candidate_number: s.candidate_number || undefined,
      vice_name: s.vice_name || ""
    });
    setEditingStudentId(s.id);
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const cancelEditStudent = () => {
    setNewStudent({ name: "", is_candidate: false, candidate_role: ROLES[0] });
    setEditingStudentId(null);
  };

  const handleSaveStudent = async () => {
    if (!selectedTurma || !newStudent.name) {
      toast({ title: "Atenção", description: "O Nome do aluno é obrigatório.", variant: "destructive" });
      return;
    }
    if (newStudent.is_candidate && !newStudent.candidate_number) {
      toast({ title: "Atenção", description: "Candidatos precisam de um número de chapa.", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    const payload: any = {
      turma_id: selectedTurma.id, 
      name: newStudent.name.trim(), 
      is_candidate: newStudent.is_candidate, 
      candidate_role: newStudent.is_candidate ? newStudent.candidate_role : null,
      candidate_number: newStudent.is_candidate ? newStudent.candidate_number : null, 
      vice_name: newStudent.is_candidate ? newStudent.vice_name : null, 
    };

    let error, data;

    if (editingStudentId) {
      const res = await supabase.from('students').update(payload).eq('id', editingStudentId).select().single();
      error = res.error; data = res.data;
    } else {
      const res = await supabase.from('students').insert(payload).select().single();
      error = res.error; data = res.data;
    }

    setIsUploading(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      if (editingStudentId) {
        setStudents(students.map(s => s.id === editingStudentId ? data : s));
        toast({ title: "Sucesso", description: "Dados atualizados com sucesso!" });
      } else {
        setStudents([...students, data]);
        toast({ title: "Sucesso", description: "Aluno cadastrado!" });
      }
      cancelEditStudent();
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Apagar aluno/candidato permanentemente?")) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) setStudents(students.filter(s => s.id !== id));
  };

  // ==================== IMPORTAÇÃO E IMPRESSÃO (CARTAZ GERAL) ====================
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTurma) return;

    setIsImportingCSV(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const rows = text.split('\n').map(row => row.split(','));
        
        const newStudents = rows.slice(1).map(row => ({
          turma_id: selectedTurma.id,
          name: row[0]?.trim(),
          is_candidate: false
        })).filter(s => s.name); 

        if (newStudents.length === 0) throw new Error("Nenhum nome válido encontrado na primeira coluna.");

        const { data, error } = await supabase.from('students').insert(newStudents).select();
        if (error) throw error;
        
        setStudents([...students, ...(data as Student[])]);
        toast({ title: "Sucesso", description: `${data.length} alunos importados!` });
      } catch (err: any) {
        toast({ title: "Erro", description: err.message, variant: "destructive" });
      }
      setIsImportingCSV(false);
      e.target.value = "";
    };
    reader.readAsText(file, 'UTF-8');
  };

  // IMPRESSÃO DE CARTAZ PARA UMA ÚNICA TURMA (COMPACTO)
  const printCandidatesList = () => {
    const candidates = students.filter(s => s.is_candidate);
    if (candidates.length === 0) {
      toast({ title: "Atenção", description: "Não há candidatos cadastrados para imprimir.", variant: "destructive" });
      return;
    }

    const grouped: Record<string, Student[]> = {};
    candidates.forEach(c => {
      const role = c.candidate_role || "Líder Geral";
      if (!grouped[role]) grouped[role] = [];
      grouped[role].push(c);
    });

    let htmlContent = "";
    Object.keys(grouped).sort().forEach(role => {
      htmlContent += `<div class="role-title">${role}</div>`;
      htmlContent += `<table><tr><th width="80">Nº Chapa</th><th>Candidato (Titular)</th><th>Vice (Se houver)</th></tr>`;
      
      grouped[role].sort((a, b) => (a.candidate_number || 0) - (b.candidate_number || 0)).forEach(c => {
        htmlContent += `
          <tr>
            <td style="text-align: center; font-size: 18px; font-weight: 900; color: #202683;">${c.candidate_number}</td>
            <td style="font-size: 16px; font-weight: bold; text-transform: uppercase;">${c.name}</td>
            <td style="font-size: 14px; color: #555; text-transform: uppercase;">${c.vice_name || '-'}</td>
          </tr>
        `;
      });
      htmlContent += `</table>`;
    });

    const printHtml = `
      <html>
        <head>
          <title>Candidatos - ${selectedTurma?.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #222; }
            .cabecalho { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #202683; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 20px; text-transform: uppercase; color: #202683; }
            h2 { margin: 5px 0 0 0; font-size: 16px; color: #444; }
            .role-title { background-color: #f1f5f9; padding: 6px 10px; font-size: 14px; font-weight: bold; text-transform: uppercase; border-left: 4px solid #202683; margin-top: 15px; margin-bottom: 5px;}
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
            th { background-color: #e2e8f0; font-size: 12px; text-transform: uppercase; color: #555; }
            .rodape { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { @page { margin: 1cm; size: A4 portrait; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <h1>Eleições CEEPS 2026</h1>
            <h2>Candidatos - ${selectedTurma?.name}</h2>
          </div>
          ${htmlContent}
          <div class="rodape">Documento Oficial - Cole na porta da sala de votação.</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  // IMPRESSÃO DE CARTAZ GERAL IGNORANDO A TURMA "TESTE" E ORDENANDO CORRETAMENTE
  const printAllCandidatesList = async () => {
    setIsPrinting(true);
    
    const { data: allCandidates, error } = await supabase
      .from('students')
      .select('*')
      .eq('is_candidate', true)
      .order('candidate_number');

    setIsPrinting(false);

    if (error || !allCandidates || allCandidates.length === 0) {
      toast({ title: "Atenção", description: "Não há candidatos cadastrados no sistema.", variant: "destructive" });
      return;
    }

    const groupedByTurma: Record<string, Student[]> = {};
    allCandidates.forEach(c => {
      if (!groupedByTurma[c.turma_id]) groupedByTurma[c.turma_id] = [];
      groupedByTurma[c.turma_id].push(c);
    });

    let htmlContent = "";
    
    // Algoritmo Inteligente de Ordenação Escolar (Ano -> Turno -> Regular/Técnico -> Alfabético)
    const sortedTurmas = [...turmas]
      .filter(t => !t.name.toLowerCase().includes('teste')) 
      .sort((a, b) => {
        // 1. Extrai o Ano (se não tiver número no início, vai para o final = 999)
        const getYear = (name: string) => {
          const match = name.trim().match(/^(\d+)/);
          return match ? parseInt(match[1], 10) : 999;
        };
        
        // 2. Extrai o Turno verificando a última letra (M = 1, V = 2, N = 3)
        const getShift = (name: string) => {
          const u = name.toUpperCase().trim();
          if (u.endsWith('M')) return 1; // Matutino
          if (u.endsWith('V')) return 2; // Vespertino
          if (u.endsWith('N')) return 3; // Noturno
          return 4; // Outros/Indefinido
        };

        const yearA = getYear(a.name);
        const yearB = getYear(b.name);
        if (yearA !== yearB) return yearA - yearB;

        const shiftA = getShift(a.name);
        const shiftB = getShift(b.name);
        if (shiftA !== shiftB) return shiftA - shiftB;

        // 3. Regulares (mais curtos) antes de Técnicos (mais longos)
        if (a.name.length !== b.name.length) return a.name.length - b.name.length;

        // 4. Ordem Alfabética Padrão
        return a.name.localeCompare(b.name);
      });
    
    if (sortedTurmas.length === 0) {
      toast({ title: "Atenção", description: "Só existem turmas de teste. Nada para imprimir no cartaz geral.", variant: "destructive" });
      return;
    }

    sortedTurmas.forEach(turma => {
      const candidatesInTurma = groupedByTurma[turma.id];
      if (!candidatesInTurma || candidatesInTurma.length === 0) return; 

      htmlContent += `<div class="turma-section">`;
      htmlContent += `<div class="turma-title">TURMA: ${turma.name}</div>`;

      const groupedByRole: Record<string, Student[]> = {};
      candidatesInTurma.forEach(c => {
        const role = c.candidate_role || "Líder Geral";
        if (!groupedByRole[role]) groupedByRole[role] = [];
        groupedByRole[role].push(c);
      });

      Object.keys(groupedByRole).sort().forEach(role => {
        htmlContent += `<div class="role-title">${role}</div>`;
        htmlContent += `<table><tr><th width="80">Nº Chapa</th><th>Candidato (Titular)</th><th>Vice (Se houver)</th></tr>`;
        
        groupedByRole[role].sort((a, b) => (a.candidate_number || 0) - (b.candidate_number || 0)).forEach(c => {
          htmlContent += `
            <tr>
              <td style="text-align: center; font-size: 18px; font-weight: 900; color: #202683;">${c.candidate_number}</td>
              <td style="font-size: 16px; font-weight: bold; text-transform: uppercase; color: #111;">${c.name}</td>
              <td style="font-size: 14px; color: #555; text-transform: uppercase;">${c.vice_name || '-'}</td>
            </tr>
          `;
        });
        htmlContent += `</table>`;
      });
      htmlContent += `</div>`;
    });

    const printHtml = `
      <html>
        <head>
          <title>Cartaz Geral de Candidatos - CEEPS</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; color: #222; }
            .cabecalho { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; text-transform: uppercase; color: #202683; }
            h2 { margin: 5px 0 0 0; font-size: 16px; color: #444; font-weight: bold; text-transform: uppercase;}
            .turma-section { margin-bottom: 25px; page-break-inside: avoid; }
            .turma-title { background-color: #202683; color: white; padding: 6px 12px; font-size: 16px; font-weight: bold; text-transform: uppercase; border-radius: 4px 4px 0 0; }
            .role-title { background-color: #f1f5f9; padding: 6px 12px; font-size: 14px; font-weight: bold; text-transform: uppercase; border-left: 4px solid #dc2626; margin-top: 10px; margin-bottom: 5px;}
            table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; }
            th { background-color: #e2e8f0; font-size: 12px; text-transform: uppercase; color: #333; }
            .rodape { text-align: center; font-size: 10px; color: #888; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { 
              @page { margin: 1cm; size: A4 portrait; } 
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="cabecalho">
            <h1>Eleições CEEPS 2026</h1>
            <h2>Relação Oficial de Todas as Chapas e Candidatos</h2>
          </div>
          ${htmlContent}
          <div class="rodape">
            Documento Oficial - Cole nos murais da escola e portas das salas.<br/>
            <strong>Sistema Desenvolvido por Ian Santos</strong>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ======================= COLUNA ESQUERDA: TURMAS ======================= */}
      <div className="lg:col-span-1 space-y-4 border-r border-slate-200 pr-4">
        <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-blue-600" /> Turmas Cadastradas</h3>
        
        <button onClick={printAllCandidatesList} disabled={isPrinting} className="w-full bg-slate-800 text-white p-3 rounded-lg hover:bg-slate-900 transition-colors flex justify-center items-center gap-2 text-sm font-bold shadow-md mb-2 disabled:opacity-50">
          {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} 
          {isPrinting ? "Gerando PDF..." : "Imprimir Cartaz Geral"}
        </button>

        <div className="flex gap-2">
          <input type="text" placeholder="Nova Turma" className="flex-1 p-2 border rounded-md text-sm outline-none focus:border-blue-500" value={newTurmaName} onChange={e => setNewTurmaName(e.target.value)} />
          <button onClick={handleAddTurma} className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" /></button>
        </div>
        <div className="space-y-2 mt-4 max-h-[500px] overflow-y-auto custom-scrollbar">
          {turmas.map(t => (
            <div key={t.id} onClick={() => { setSelectedTurma(t); cancelEditStudent(); }} className={`p-3 border rounded-lg flex justify-between items-center cursor-pointer transition-all ${selectedTurma?.id === t.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'hover:bg-slate-50'}`}>
              
              {/* MODO DE EDIÇÃO DE NOME DA TURMA */}
              {editingTurmaId === t.id ? (
                <div className="flex w-full gap-2 items-center" onClick={e => e.stopPropagation()}>
                  <input autoFocus type="text" className="flex-1 p-1 border rounded text-sm font-bold text-slate-800" value={editTurmaName} onChange={e => setEditTurmaName(e.target.value)} />
                  <button onClick={(e) => saveEditTurma(t.id, e)} className="text-green-600 hover:bg-green-100 p-1 rounded"><Save className="w-4 h-4" /></button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingTurmaId(null); }} className="text-slate-400 hover:bg-slate-200 p-1 rounded"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <span className="font-bold text-sm text-slate-700">{t.name}</span>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditingTurmaId(t.id); setEditTurmaName(t.name); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-colors"><Pencil className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteTurma(t.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ======================= COLUNA DIREITA: ALUNOS E CANDIDATOS ======================= */}
      <div className="lg:col-span-2 space-y-6">
        {!selectedTurma ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl p-10 bg-slate-50/50">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium text-center">Selecione uma turma ao lado para gerenciar <br/>alunos, editar chapas ou importar listas.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-4">
              <h2 className="text-2xl font-black text-slate-800">Turma: <span className="text-blue-600">{selectedTurma.name}</span></h2>
              
              <div className="flex items-center gap-2">
                <button onClick={printCandidatesList} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors bg-slate-800 text-white hover:bg-slate-900 shadow-sm">
                  <Printer className="w-4 h-4" /> Imprimir Turma
                </button>

                <label className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm ${isImportingCSV ? 'bg-slate-200 text-slate-500' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                  {isImportingCSV ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                  {isImportingCSV ? "Lendo..." : "Importar Planilha CSV"}
                  <input type="file" accept=".csv" className="hidden" onChange={handleCSVImport} disabled={isImportingCSV} />
                </label>
              </div>
            </div>

            {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
            <div className={`p-5 rounded-xl border-2 transition-colors ${editingStudentId ? 'bg-blue-50/50 border-blue-300' : 'bg-slate-50 border-slate-200'} space-y-4 shadow-sm`}>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  {editingStudentId ? <><Pencil className="w-4 h-4 text-blue-600"/> Editando Cadastro</> : "Cadastrar Manualmente"}
                </h4>
                {editingStudentId && (
                  <button onClick={cancelEditStudent} className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"><X className="w-3 h-3"/> Cancelar Edição</button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nome do Aluno *</label>
                  <input type="text" placeholder="Nome Completo" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                </div>
              </div>
              
              <div className="pt-2 border-t border-slate-200/50">
                <button onClick={() => setNewStudent({...newStudent, is_candidate: !newStudent.is_candidate})} className={`flex items-center gap-2 text-sm font-bold p-3 rounded-lg w-full transition-colors ${newStudent.is_candidate ? 'text-blue-800 bg-blue-100 border border-blue-200' : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-100'}`}>
                  {newStudent.is_candidate ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />} 
                  ESTE ALUNO É CANDIDATO (CHAPA)
                </button>
              </div>

              {newStudent.is_candidate && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">A qual cargo esta chapa concorre?</label>
                    <select className="w-full p-2.5 border border-slate-300 rounded-lg text-sm font-bold text-slate-800 bg-slate-50 outline-none focus:border-blue-500" value={newStudent.candidate_role} onChange={e => setNewStudent({...newStudent, candidate_role: e.target.value})}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase text-blue-600">Número da Urna *</label>
                    <input type="number" placeholder="Ex: 10" className="w-full p-2.5 border-2 border-blue-200 rounded-lg text-lg font-black text-center text-blue-800 outline-none focus:border-blue-500" value={newStudent.candidate_number || ''} onChange={e => setNewStudent({...newStudent, candidate_number: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">Nome do Vice (Opcional)</label>
                    <input type="text" placeholder="Nome do companheiro de chapa" className="w-full p-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500 mt-0.5" value={newStudent.vice_name || ''} onChange={e => setNewStudent({...newStudent, vice_name: e.target.value})} />
                  </div>
                </div>
              )}
              <button onClick={handleSaveStudent} className={`w-full text-white font-black uppercase tracking-widest py-3.5 rounded-xl flex justify-center gap-2 transition-all shadow-md ${editingStudentId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-800 hover:bg-slate-900'}`}>
                {editingStudentId ? <Save className="w-5 h-5" /> : <Plus className="w-5 h-5" />} 
                {editingStudentId ? "Atualizar Cadastro" : "Salvar Aluno"}
              </button>
            </div>

            {/* LISTA DE ALUNOS CADASTRADOS */}
            <div className="space-y-2 mt-8 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Lista da Turma ({students.length})</h3>
              {students.map(s => (
                <div key={s.id} className="p-4 border border-slate-200 rounded-xl flex justify-between items-center bg-white shadow-sm hover:border-slate-300 transition-colors">
                  <div>
                    <p className="font-bold text-slate-800 text-sm md:text-base leading-tight">{s.name}</p>
                    {s.is_candidate && (
                      <span className="inline-flex items-center bg-blue-100/80 border border-blue-200 text-blue-800 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-md uppercase mt-1">
                        <UserCheck className="w-3 h-3 mr-1.5" /> {s.candidate_role} (Nº {s.candidate_number})
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEditStudent(s)} className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar Cadastro">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteStudent(s.id)} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir Aluno">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && <p className="text-sm text-slate-400 text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum aluno nesta turma. Adicione ou importe um CSV.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ManageTurmas;
