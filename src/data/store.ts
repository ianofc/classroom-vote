import { Turma, TURMAS as DEFAULT_TURMAS } from "./turmas";

export interface AdminUser {
  id: string;
  username: string;
  password: string;
}

const TURMAS_KEY = "urna_turmas";
const ADMINS_KEY = "urna_admins";

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

// --- Admins ---

export function getAdmins(): AdminUser[] {
  const stored = readLocal<AdminUser[]>(ADMINS_KEY);
  if (stored) return stored;

  const initial = getDefaultAdmins();
  writeLocal(ADMINS_KEY, initial);
  return initial;
}

function getDefaultAdmins(): AdminUser[] {
  return [{ id: "default", username: "admin", password: "admin123" }];
}

export function saveAdmins(admins: AdminUser[]) {
  writeLocal(ADMINS_KEY, admins);
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
