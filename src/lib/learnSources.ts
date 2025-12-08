const LEARN_BASE = "https://api.github.com/repos/inancgumus/learngo/contents";
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN?.toString().trim();

export type LearnModuleMeta = {
  slug: string;
  title: string;
  path: string;
};

export type LearnLessonMeta = {
  name: string;
  path: string;
  downloadUrl?: string;
  isCode: boolean;
};

export type LearnModuleDetail = LearnModuleMeta & {
  description: string;
  lessons: LearnLessonMeta[];
};

const headers: HeadersInit = GITHUB_TOKEN
  ? {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
    }
  : {};

const fetchJson = async (url: string) => {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub request failed (${res.status}): ${text || "unknown error"}`);
  }
  return res.json();
};

const decodeBase64 = (b64: string) => {
  try {
    const cleaned = b64.replace(/\s+/g, "");
    if (typeof TextDecoder !== "undefined") {
      const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
    }
    return Buffer.from(cleaned, "base64").toString("utf8");
  } catch {
    return "";
  }
};

const fetchText = async (url: string, fallback = "") => {
  const rawMatch = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (rawMatch) {
    const [, owner, repo, ref, path] = rawMatch;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    const res = await fetch(apiUrl, { headers });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { content?: string };
    if (data.content) {
      const decoded = decodeBase64(data.content);
      return decoded || fallback;
    }
    return fallback;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) return fallback;
  return res.text();
};

const humanize = (slug: string) =>
  slug
    .replace(/^[0-9]+-/, "")
    .split(/[-_]/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");

export const fetchLearnModules = async (): Promise<LearnModuleMeta[]> => {
  const data = (await fetchJson(LEARN_BASE)) as { name: string; path: string; type: string }[];
  return data
    .filter((item) => item.type === "dir")
    .filter((item) => /^[0-9]{2}-/.test(item.name))
    .map((item) => ({
      slug: item.name,
      title: humanize(item.name),
      path: item.path,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
};

export const fetchLearnModuleDetail = async (slug: string): Promise<LearnModuleDetail> => {
  const items = (await fetchJson(`${LEARN_BASE}/${slug}`)) as {
    name: string;
    path: string;
    download_url?: string;
    type: string;
    url?: string;
  }[];

  const readme = items.find((f) => /^readme/i.test(f.name));
  const description = readme
    ? await fetchText(readme.download_url ?? "", "No description available.")
    : "No description available.";

  // files directly under the module
  const rootFiles: LearnLessonMeta[] = items
    .filter((f) => f.type === "file")
    .filter((f) => !/^readme/i.test(f.name))
    .map((f) => ({
      name: f.name,
      path: f.path,
      downloadUrl: f.download_url,
      isCode: f.name.endsWith(".go"),
    }));

  // files in immediate subdirectories (flattened as dir/file)
  const dirItems = items.filter((f) => f.type === "dir");
  const nestedFilesLists = await Promise.all(
    dirItems.map(async (dir) => {
      const dirPath = dir.path.replace(/^\/?/, "");
      const dirEntries = (await fetchJson(`${LEARN_BASE}/${dirPath}`)) as {
        name: string;
        path: string;
        download_url?: string;
        type: string;
      }[];
      return dirEntries
        .filter((f) => f.type === "file")
        .map<LearnLessonMeta>((f) => ({
          name: `${dir.name}/${f.name}`,
          path: f.path,
          downloadUrl: f.download_url,
          isCode: f.name.endsWith(".go"),
        }));
    }),
  );

  const lessons: LearnLessonMeta[] = [...rootFiles, ...nestedFilesLists.flat()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return {
    slug,
    title: humanize(slug),
    path: `${LEARN_BASE}/${slug}`,
    description,
    lessons,
  };
};

export const fetchLessonContent = async (downloadUrl: string | undefined) => {
  if (!downloadUrl) return "";
  return fetchText(downloadUrl, "");
};

const fetchBase64Content = async (url: string) => {
  const rawMatch = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/);
  if (rawMatch) {
    const [, owner, repo, ref, path] = rawMatch;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`;
    const res = await fetch(apiUrl, { headers });
    if (!res.ok) return "";
    const data = (await res.json()) as { content?: string };
    return data.content ?? "";
  }
  const res = await fetch(url, { headers });
  if (!res.ok) return "";
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("base64");
};

export const fetchLessonDataUrl = async (downloadUrl: string | undefined, mime = "application/pdf") => {
  if (!downloadUrl) return "";
  const b64 = await fetchBase64Content(downloadUrl);
  if (!b64) return "";
  return `data:${mime};base64,${b64.replace(/\s+/g, "")}`;
};

