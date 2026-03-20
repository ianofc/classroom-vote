import { Turma, TURMAS as DEFAULT_TURMAS } from "./turmas";
import { supabase } from "@/lib/supabase";

const TURMAS_KEY = "urna_turmas";

function readLocal<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
}

function writeLocal<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// --- Turmas ---

export function getTurmas(): Turma[] {
  const stored = readLocal<Turma[]>(TURMAS_KEY);
  if (stored) return stored;

  const initial = [...DEFAULT_TURMAS];
  writeLocal(TURMAS_KEY, initial);
  return initial;
}

export function saveTurmas(turmas: Turma[]) {
  writeLocal(TURMAS_KEY, turmas);
}

export function addTurma(turma: Turma) {
  const turmas = getTurmas();
  turmas.push(turma);
  saveTurmas(turmas);
  return turmas;
}

export function updateTurma(id: string, updated: Partial<Turma>) {
  const turmas = getTurmas();
  const idx = turmas.findIndex((t) => t.id === id);
  if (idx !== -1) {
    turmas[idx] = { ...turmas[idx], ...updated };
    saveTurmas(turmas);
  }
  return turmas;
}

export function deleteTurma(id: string) {
  const turmas = getTurmas().filter((t) => t.id !== id);
  saveTurmas(turmas);
  return turmas;
}

// --- Admins (Autenticação via Supabase) ---

export async function validateAdmin(username: string, password: string): Promise<boolean> {
  if (!supabase) return false;
  
  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !data) {
    return false;
  }
  return true;
}

// Utilitário global
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
