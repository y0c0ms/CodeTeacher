const envBase = import.meta.env.VITE_API_BASE?.toString().trim();
const derivedBase =
  typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "http://localhost:3001";
const API_BASE = envBase || derivedBase;

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
};

export type ExerciseListItem = {
  slug: string;
  title: string;
  source: string;
  sourceLabel: string;
  path: string;
};

export type ExerciseDetail = {
  slug: string;
  title: string;
  description: string;
  solutionCode: string;
  starterCode: string;
  source: string;
  sourceKey: string;
  path?: string;
  hasSolution?: boolean;
  hasTests?: boolean;
};

export const getExerciseList = (source: string) =>
  request<ExerciseListItem[]>(`/api/exercises?source=${source}`);

export const getExerciseDetail = (source: string, slug: string) =>
  request<ExerciseDetail>(`/api/exercises/${source}/${slug}`);

export const getUserCode = (source: string, slug: string) =>
  request<{ code: string | null; updatedAt: string | null }>(`/api/code/${source}/${slug}`);

export const saveUserCode = (source: string, slug: string, code: string) =>
  request<{ ok: boolean }>(`/api/code/${source}/${slug}`, {
    method: "PUT",
    body: JSON.stringify({ code }),
  });

export const runCode = (source: string, slug: string, code: string) =>
  request<{ status: string; stdout: string; stderr: string; durationMs: number; runId: string }>(
    "/api/run",
    {
      method: "POST",
      body: JSON.stringify({ source, slug, code }),
    },
  );



