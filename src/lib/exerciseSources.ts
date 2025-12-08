import { fetchExerciseDetail as fetchBregmanDetail, fetchExerciseList as fetchBregmanList } from "@/lib/goExercises";

export type ExerciseSourceKey = "bregman" | "plutov";

export type ExerciseMeta = {
  slug: string;
  title: string;
  path: string;
  source: ExerciseSourceKey;
  sourceLabel: string;
};

export type ExerciseDetail = {
  slug: string;
  title: string;
  path: string;
  description: string;
  solutionCode: string;
  starterCode: string;
  source: string;
  sourceKey: ExerciseSourceKey;
};

const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.toString().trim();

const headers: HeadersInit = GITHUB_TOKEN
  ? {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    }
  : {};

const formatTitle = (slug: string) =>
  slug
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const fetchJson = async (url: string) => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub request failed (${response.status}): ${text || "unknown error"}`);
  }
  return response.json();
};

const fetchText = async (url: string, fallback: string) => {
  const response = await fetch(url, { headers });
  if (!response.ok) return fallback;
  return response.text();
};

// Plutov practice-go
const PLUTOV_BASE = "https://api.github.com/repos/plutov/practice-go/contents";

const fetchPlutovList = async (): Promise<ExerciseMeta[]> => {
  const data = (await fetchJson(PLUTOV_BASE)) as { name: string; type: string }[];
  return data
    .filter((item) => item.type === "dir")
    .filter((item) => !item.name.startsWith("."))
    .map((item) => ({
      slug: item.name,
      title: formatTitle(item.name),
      path: `${PLUTOV_BASE}/${item.name}`,
      source: "plutov" as const,
      sourceLabel: "practice-go",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

const fetchPlutovDetail = async (slug: string): Promise<ExerciseDetail> => {
  const readmeUrl = `${PLUTOV_BASE}/${slug}/README.md`;
  const files = (await fetchJson(`${PLUTOV_BASE}/${slug}`)) as { name: string; download_url?: string }[];

  const description = await fetchText(readmeUrl, "No README found for this exercise.");

  // Try to find a non-test go file as a "solution"
  const solutionFile = files.find(
    (f) => f.name.endsWith(".go") && !f.name.endsWith("_test.go"),
  );
  const solutionCode = solutionFile
    ? await fetchText(solutionFile.download_url ?? "", "// No solution provided in repository.")
    : "// No solution provided in repository.";

  const starterCode = `package main

func main() {
\t// Solve "${formatTitle(slug)}"
}
`;

  return {
    slug,
    title: formatTitle(slug),
    path: `${PLUTOV_BASE}/${slug}`,
    description,
    solutionCode,
    starterCode,
    source: "github.com/plutov/practice-go (MIT)",
    sourceKey: "plutov",
  };
};

export const fetchExerciseList = async (source: ExerciseSourceKey): Promise<ExerciseMeta[]> => {
  if (source === "plutov") return fetchPlutovList();
  const list = await fetchBregmanList();
  return list.map((item) => ({
    ...item,
    source: "bregman" as const,
    sourceLabel: "go-exercises",
  }));
};

export const fetchExerciseDetail = async (source: ExerciseSourceKey, slug: string): Promise<ExerciseDetail> => {
  if (source === "plutov") return fetchPlutovDetail(slug);
  const detail = await fetchBregmanDetail(slug);
  return {
    ...detail,
    sourceKey: "bregman",
    source: detail.source,
  };
};

