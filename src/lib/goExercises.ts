const BASE_URL =
  "https://api.github.com/repos/bregman-arie/go-exercises/contents/exercises";
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.toString().trim();

type GitHubContent = {
  name: string;
  path: string;
  type: string;
  url: string;
  download_url?: string;
};

export type ExerciseMeta = {
  slug: string;
  title: string;
  path: string;
};

export type ExerciseDetail = ExerciseMeta & {
  description: string;
  solutionCode: string;
  starterCode: string;
  source: string;
};

const formatTitle = (slug: string) =>
  slug
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

const fetchJson = async (url: string) => {
  const headers: HeadersInit = {};
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub request failed (${response.status}): ${errorText || "unknown error"}`,
    );
  }

  return response.json();
};

const fetchText = async (url: string, fallback: string) => {
  if (!url) return fallback;

  const headers: HeadersInit = {};
  if (GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    return fallback;
  }

  return response.text();
};

export const fetchExerciseList = async (): Promise<ExerciseMeta[]> => {
  const data = (await fetchJson(BASE_URL)) as GitHubContent[];

  return data
    .filter((item) => item.type === "dir")
    .map((item) => ({
      slug: item.name,
      title: formatTitle(item.name),
      path: item.path,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

export const fetchExerciseDetail = async (
  slug: string,
): Promise<ExerciseDetail> => {
  const files = (await fetchJson(`${BASE_URL}/${slug}`)) as GitHubContent[];

  const exerciseFile = files.find((file) => file.name === "exercise.md");
  const solutionFile = files.find((file) => file.name.endsWith(".go"));

  const [description, solutionCode] = await Promise.all([
    fetchText(
      exerciseFile?.download_url ?? "",
      "No description found for this exercise.",
    ),
    fetchText(
      solutionFile?.download_url ?? "",
      "// Solution not available in the source repository yet.",
    ),
  ]);

  const title = formatTitle(slug);

  const starterCode = `package main

func main() {
\t// TODO: Solve "${title}"
}
`;

  return {
    slug,
    title,
    path: `${BASE_URL}/${slug}`,
    description,
    solutionCode,
    starterCode,
    source: "github.com/bregman-arie/go-exercises (MIT)",
  };
};

