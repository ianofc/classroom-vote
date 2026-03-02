import { Turma, Candidate, TURMAS as DEFAULT_TURMAS } from "./turmas";

export interface AdminUser {
  id: string;
  username: string;
  password: string;
}

const TURMAS_KEY = "urna_turmas";
const ADMINS_KEY = "urna_admins";

// --- Turmas ---

export function getTurmas(): Turma[] {
  const stored = localStorage.getItem(TURMAS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [...DEFAULT_TURMAS];
    }
  }
  // Initialize with defaults
  const initial = [...DEFAULT_TURMAS];
  localStorage.setItem(TURMAS_KEY, JSON.stringify(initial));
  return initial;
}

export function saveTurmas(turmas: Turma[]) {
  localStorage.setItem(TURMAS_KEY, JSON.stringify(turmas));
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

// --- Admins ---

export function getAdmins(): AdminUser[] {
  const stored = localStorage.getItem(ADMINS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultAdmins();
    }
  }
  const initial = getDefaultAdmins();
  localStorage.setItem(ADMINS_KEY, JSON.stringify(initial));
  return initial;
}

function getDefaultAdmins(): AdminUser[] {
  return [{ id: "default", username: "admin", password: "admin123" }];
}

export function saveAdmins(admins: AdminUser[]) {
  localStorage.setItem(ADMINS_KEY, JSON.stringify(admins));
}

export function addAdmin(admin: AdminUser) {
  const admins = getAdmins();
  admins.push(admin);
  saveAdmins(admins);
  return admins;
}

export function updateAdmin(id: string, updated: Partial<AdminUser>) {
  const admins = getAdmins();
  const idx = admins.findIndex((a) => a.id === id);
  if (idx !== -1) {
    admins[idx] = { ...admins[idx], ...updated };
    saveAdmins(admins);
  }
  return admins;
}

export function deleteAdmin(id: string) {
  const admins = getAdmins().filter((a) => a.id !== id);
  saveAdmins(admins);
  return admins;
}

export function validateAdmin(username: string, password: string): boolean {
  const admins = getAdmins();
  return admins.some((a) => a.username === username && a.password === password);
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}
