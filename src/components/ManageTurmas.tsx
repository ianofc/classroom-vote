import { useState } from "react";
import { Turma, Candidate } from "@/data/turmas";
import { getTurmas, saveTurmas, generateId } from "@/data/store";
import { Plus, Pencil, Trash2, X, Check, GraduationCap, ImagePlus } from "lucide-react";

interface ManageTurmasProps {
  onTurmasChanged: () => void;
}

const ManageTurmas = ({ onTurmasChanged }: ManageTurmasProps) => {
  const [turmas, setTurmas] = useState<Turma[]>(getTurmas());
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [isNew, setIsNew] = useState(false);

  const [formName, setFormName] = useState("");
  const [formCandidates, setFormCandidates] = useState<Candidate[]>([]);

  const refresh = () => {
    const updated = getTurmas();
    setTurmas(updated);
    onTurmasChanged();
  };

  const startNew = () => {
    setIsNew(true);
    setFormName("");
    setFormCandidates([]);
    setEditingTurma({ id: generateId(), name: "", candidates: [] });
  };

  const startEdit = (turma: Turma) => {
    setIsNew(false);
    setFormName(turma.name);
    setFormCandidates(turma.candidates.map((candidate) => ({ ...candidate })));
    setEditingTurma(turma);
  };

  const cancelEdit = () => {
    setEditingTurma(null);
    setIsNew(false);
  };

  const addCandidate = () => {
    setFormCandidates([
      ...formCandidates,
      {
        number: (formCandidates.length + 1) * 10,
        name: "",
        turma: formName,
        photo: "",
      },
    ]);
  };

  const removeCandidate = (idx: number) => {
    setFormCandidates(formCandidates.filter((_, i) => i !== idx));
  };

  const updateCandidate = (idx: number, field: keyof Candidate, value: string | number) => {
    const updated = [...formCandidates];
    updated[idx] = { ...updated[idx], [field]: value };
    setFormCandidates(updated);
  };

  const handlePhotoUpload = (idx: number, file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateCandidate(idx, "photo", String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const saveTurma = () => {
    if (!editingTurma || !formName.trim() || formCandidates.length === 0) return;

    const candidates = formCandidates.map((c) => ({
      ...c,
      turma: c.turma?.trim() ? c.turma.trim() : formName.trim(),
      name: c.name.trim(),
    }));
    const all = getTurmas();

    if (isNew) {
      all.push({ id: editingTurma.id, name: formName.trim(), candidates });
    } else {
      const idx = all.findIndex((t) => t.id === editingTurma.id);
      if (idx !== -1) all[idx] = { ...all[idx], name: formName.trim(), candidates };
    }

    saveTurmas(all);
    cancelEdit();
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!confirm("Deseja realmente excluir esta turma?")) return;
    const all = getTurmas().filter((t) => t.id !== id);
    saveTurmas(all);
    refresh();
  };

  if (editingTurma) {
    return (
      <div className="space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          {isNew ? "Nova Turma" : "Editar Turma"}
        </h3>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">Nome da turma</label>
          <input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Ex: 6º Ano B"
            maxLength={50}
            className="w-full h-10 rounded-lg bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-muted-foreground">Candidatos</label>
            <button
              onClick={addCandidate}
              className="text-xs flex items-center gap-1 text-primary hover:underline"
            >
              <Plus className="w-3 h-3" /> Adicionar
            </button>
          </div>

          <div className="space-y-3">
            {formCandidates.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={c.number}
                    onChange={(e) => updateCandidate(i, "number", parseInt(e.target.value) || 0)}
                    className="w-20 h-9 rounded-lg bg-muted border border-border px-2 text-sm text-center font-mono-display font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Nº"
                  />
                  <input
                    value={c.name}
                    onChange={(e) => updateCandidate(i, "name", e.target.value)}
                    maxLength={60}
                    className="flex-1 h-9 rounded-lg bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Nome do candidato"
                  />
                  <button
                    onClick={() => removeCandidate(i)}
                    className="w-9 h-9 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  value={c.turma || ""}
                  onChange={(e) => updateCandidate(i, "turma", e.target.value)}
                  maxLength={50}
                  className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Turma do candidato"
                />

                <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                  <input
                    value={c.photo || ""}
                    onChange={(e) => updateCandidate(i, "photo", e.target.value)}
                    className="w-full h-9 rounded-lg bg-muted border border-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="URL da imagem (opcional)"
                  />
                  <label className="h-9 px-3 rounded-lg border border-border bg-muted text-xs font-medium cursor-pointer flex items-center gap-1">
                    <ImagePlus className="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoUpload(i, e.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>
            ))}
            {formCandidates.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum candidato adicionado.</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={cancelEdit}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={saveTurma}
            disabled={!formName.trim() || formCandidates.length === 0 || formCandidates.some((c) => !c.name.trim() || !c.turma?.trim())}
            className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:brightness-110 transition-all disabled:opacity-40"
          >
            <Check className="w-4 h-4 inline mr-1" /> Salvar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-muted-foreground" />
          Turmas e Candidatos
        </h3>
        <button
          onClick={startNew}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:brightness-110 transition-all"
        >
          <Plus className="w-3 h-3" /> Nova Turma
        </button>
      </div>

      {turmas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma turma cadastrada.</p>
      ) : (
        <div className="space-y-2">
          {turmas.map((turma) => (
            <div key={turma.id} className="bg-muted/50 border border-border rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-sm">{turma.name}</p>
                  <p className="text-xs text-muted-foreground">{turma.candidates.length} candidato(s)</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(turma)}
                    className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(turma.id)}
                    className="w-8 h-8 rounded-lg hover:bg-destructive/10 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              </div>
              <div className="space-y-0.5">
                {turma.candidates.map((c) => (
                  <div key={c.number} className="flex items-center gap-2 text-xs">
                    <span className="font-mono-display font-bold text-primary w-6">{c.number}</span>
                    <span className="text-muted-foreground">{c.name}</span>
                    <span className="text-muted-foreground/70">({c.turma})</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageTurmas;
