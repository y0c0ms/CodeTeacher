import express from "express";
import cors from "cors";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_PORT = process.env.API_PORT || 3001;
const GO_TIMEOUT_MS = Number(process.env.GO_RUNNER_TIMEOUT_MS || 6000);
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgres://codelab:codelab@localhost:5432/codelab?sslmode=disable";

const GITHUB_TOKEN = process.env.VITE_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const githubHeaders = GITHUB_TOKEN
  ? { Authorization: `Bearer ${GITHUB_TOKEN}` }
  : {};

const app = express();
app.use(cors());
app.use(express.json({ limit: "500kb" }));

const pool = new Pool({ connectionString: DATABASE_URL });

const ensureTables = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exercises (
      source TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT,
      description TEXT,
      solution_code TEXT,
      starter_code TEXT,
      source_label TEXT,
      path TEXT,
      has_solution BOOLEAN DEFAULT FALSE,
      has_tests BOOLEAN DEFAULT FALSE,
      PRIMARY KEY(source, slug)
    );
  `);
  await pool.query(
    `ALTER TABLE exercises ADD COLUMN IF NOT EXISTS path TEXT; ALTER TABLE exercises ADD COLUMN IF NOT EXISTS has_solution BOOLEAN DEFAULT FALSE; ALTER TABLE exercises ADD COLUMN IF NOT EXISTS has_tests BOOLEAN DEFAULT FALSE;`,
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_code (
      source TEXT NOT NULL,
      slug TEXT NOT NULL,
      code TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY(source, slug)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS runs (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL,
      slug TEXT NOT NULL,
      code TEXT NOT NULL,
      stdout TEXT,
      stderr TEXT,
      status TEXT,
      duration_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id UUID PRIMARY KEY,
      source TEXT NOT NULL,
      slug TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
};

const formatTitle = (slug) =>
  slug
    .split(/[_-]/)
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase() + p.slice(1))
    .join(" ");

const fetchJson = async (url) => {
  const res = await fetch(url, { headers: githubHeaders });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub request failed (${res.status}): ${text || "unknown error"}`);
  }
  return res.json();
};

const fetchText = async (url, fallback) => {
  const res = await fetch(url, { headers: githubHeaders });
  if (!res.ok) return fallback;
  return res.text();
};

// Source adapters
const BREGMAN_BASE = "https://api.github.com/repos/bregman-arie/go-exercises/contents/exercises";
const PLUTOV_BASE = "https://api.github.com/repos/plutov/practice-go/contents";

const fetchBregmanList = async () => {
  const data = (await fetchJson(BREGMAN_BASE)) ?? [];
  return data
    .filter((item) => item.type === "dir")
    .map((item) => ({
      slug: item.name,
      title: formatTitle(item.name),
      path: item.path,
      source: "bregman",
      sourceLabel: "go-exercises",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

const fetchBregmanDetail = async (slug) => {
  const files = (await fetchJson(`${BREGMAN_BASE}/${slug}`)) ?? [];
  const exerciseFile = files.find((f) => f.name === "exercise.md");
  const solutionFile = files.find((f) => f.name.endsWith(".go"));
  const hasTests = files.some((f) => f.name.endsWith("_test.go"));

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
    path: `${BREGMAN_BASE}/${slug}`,
    description,
    solutionCode,
    starterCode,
    source: "github.com/bregman-arie/go-exercises (MIT)",
    sourceKey: "bregman",
    sourceLabel: "go-exercises",
    hasSolution: Boolean(solutionFile),
    hasTests,
  };
};

const fetchPlutovList = async () => {
  const data = (await fetchJson(PLUTOV_BASE)) ?? [];
  return data
    .filter((item) => item.type === "dir")
    .filter((item) => !item.name.startsWith("."))
    .map((item) => ({
      slug: item.name,
      title: formatTitle(item.name),
      path: `${PLUTOV_BASE}/${item.name}`,
      source: "plutov",
      sourceLabel: "practice-go",
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

const fetchPlutovDetail = async (slug) => {
  const readmeUrl = `${PLUTOV_BASE}/${slug}/README.md`;
  const files = (await fetchJson(`${PLUTOV_BASE}/${slug}`)) ?? [];

  const description = await fetchText(readmeUrl, "No README found for this exercise.");

  const solutionFile = files.find(
    (f) => f.name.endsWith(".go") && !f.name.endsWith("_test.go"),
  );
  const hasTests = files.some((f) => f.name.endsWith("_test.go"));
  const solutionCode = solutionFile
    ? await fetchText(solutionFile.download_url ?? "", "// No solution provided.")
    : "// No solution provided.";

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
    source: "github.com/plutov/practice-go",
    sourceKey: "plutov",
    sourceLabel: "practice-go",
    hasSolution: Boolean(solutionFile),
    hasTests,
  };
};

const fetchSourceList = async (source) => {
  if (source === "plutov") return fetchPlutovList();
  return fetchBregmanList();
};

const fetchSourceDetail = async (source, slug) => {
  if (source === "plutov") return fetchPlutovDetail(slug);
  return fetchBregmanDetail(slug);
};

const upsertExercise = async (detail) => {
  await pool.query(
    `
    INSERT INTO exercises (source, slug, title, description, solution_code, starter_code, source_label, path, has_solution, has_tests)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (source, slug)
    DO UPDATE SET
      title=EXCLUDED.title,
      description=EXCLUDED.description,
      solution_code=EXCLUDED.solution_code,
      starter_code=EXCLUDED.starter_code,
      source_label=EXCLUDED.source_label,
      path=EXCLUDED.path,
      has_solution=EXCLUDED.has_solution,
      has_tests=EXCLUDED.has_tests
  `,
    [
      detail.sourceKey,
      detail.slug,
      detail.title,
      detail.description,
      detail.solutionCode,
      detail.starterCode,
      detail.sourceLabel,
      detail.path ?? null,
      detail.hasSolution ?? false,
      detail.hasTests ?? false,
    ],
  );
};

app.get("/api/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/exercises", async (req, res) => {
  try {
    const source = req.query.source || "bregman";
    if (!["bregman", "plutov"].includes(source)) {
      return res.status(400).json({ error: "Invalid source" });
    }
    const list = await fetchSourceList(source);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/exercises/:source/:slug", async (req, res) => {
  const { source, slug } = req.params;
  if (!["bregman", "plutov"].includes(source)) {
    return res.status(400).json({ error: "Invalid source" });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM exercises WHERE source=$1 AND slug=$2",
      [source, slug],
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      return res.json({
        slug,
        title: row.title,
        path: row.path,
        description: row.description,
        solutionCode: row.solution_code,
        starterCode: row.starter_code,
        source: row.source_label || row.source,
        sourceKey: row.source,
        hasSolution: row.has_solution,
        hasTests: row.has_tests,
      });
    }

    const detail = await fetchSourceDetail(source, slug);
    await upsertExercise(detail);
    res.json(detail);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/code/:source/:slug", async (req, res) => {
  const { source, slug } = req.params;
  try {
    const result = await pool.query(
      "SELECT code, updated_at FROM user_code WHERE source=$1 AND slug=$2",
      [source, slug],
    );
    if (!result.rowCount) {
      return res.json({ code: null, updatedAt: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/code/:source/:slug", async (req, res) => {
  const { source, slug } = req.params;
  const code = req.body?.code ?? "";
  try {
    await pool.query(
      `
      INSERT INTO user_code (source, slug, code)
      VALUES ($1,$2,$3)
      ON CONFLICT (source, slug)
      DO UPDATE SET code=EXCLUDED.code, updated_at=NOW()
    `,
      [source, slug, code],
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/run", async (req, res) => {
  const { code, source, slug } = req.body || {};
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Missing code" });
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "go-run-"));
  const file = path.join(dir, "main.go");
  fs.writeFileSync(file, code, "utf8");

  const started = Date.now();
  execFile(
    "go",
    ["run", file],
    { cwd: dir, timeout: GO_TIMEOUT_MS, env: { ...process.env } },
    async (err, stdout, stderr) => {
      const durationMs = Date.now() - started;
      const status = err ? "error" : "ok";
      const runId = uuidv4();

      try {
        await pool.query(
          `
          INSERT INTO runs (id, source, slug, code, stdout, stderr, status, duration_ms)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
          [runId, source || null, slug || null, code, stdout, stderr, status, durationMs],
        );
      } catch {
        // ignore persistence errors for run response
      }

      res.json({
        status,
        stdout,
        stderr,
        durationMs,
        runId,
      });
    },
  ).on("error", (e) => {
    res.status(500).json({ error: `Failed to execute go run: ${e.message}` });
  });
});

const start = async () => {
  await ensureTables();
  app.listen(API_PORT, () => {
    console.log(`API listening on http://localhost:${API_PORT}`);
  });
};

start().catch((err) => {
  console.error("Failed to start API", err);
  process.exit(1);
});

