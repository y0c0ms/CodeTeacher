#!/usr/bin/env node
/* Simple local Go runner for dev/prod container use only. */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const PORT = process.env.GO_RUNNER_PORT || 8787;
const TIMEOUT_MS = Number(process.env.GO_RUNNER_TIMEOUT_MS || 6000);
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.VITE_GITHUB_TOKEN;
const GITHUB_HEADERS = {
  "User-Agent": "CodeTeacher/runner",
  ...(GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}` } : {}),
};

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const ensureGo = () =>
  new Promise((resolve, reject) => {
    execFile("go", ["version"], { timeout: 3000 }, (err, stdout) => {
      if (err) return reject(new Error("Go is not installed or not in PATH"));
      resolve(stdout.trim());
    });
  });

const fetchJson = async (url) => {
  const res = await fetch(url, { headers: GITHUB_HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub request failed (${res.status}): ${text || "unknown error"}`);
  }
  return res.json();
};

const fetchText = async (url) => {
  const res = await fetch(url, { headers: GITHUB_HEADERS });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub request failed (${res.status}): ${text || "unknown error"}`);
  }
  return res.text();
};

const downloadFiles = async (items, predicate) =>
  Promise.all(
    items
      .filter(predicate)
      .map(async (file) => ({
        name: file.name,
        content: await fetchText(file.download_url),
      })),
  );

const SOURCE_CONFIG = {
  bregman: {
    base: "https://api.github.com/repos/bregman-arie/go-exercises/contents/exercises",
    getTests: async (slug) => {
      const items = await fetchJson(`${SOURCE_CONFIG.bregman.base}/${slug}`);
      const tests = await downloadFiles(items, (f) => f.name.endsWith("_test.go"));
      const assets = await downloadFiles(
        items,
        (f) =>
          !f.name.endsWith(".go") && f.type === "file" && !f.name.toLowerCase().endsWith(".md"),
      );
      return { tests, assets };
    },
  },
  plutov: {
    base: "https://api.github.com/repos/plutov/practice-go/contents",
    getTests: async (slug) => {
      const items = await fetchJson(`${SOURCE_CONFIG.plutov.base}/${slug}`);
      const tests = await downloadFiles(items, (f) => f.name.endsWith("_test.go"));
      const assets = await downloadFiles(
        items,
        (f) =>
          !f.name.endsWith(".go") && f.type === "file" && !f.name.toLowerCase().endsWith(".md"),
      );
      return { tests, assets };
    },
  },
};

const extractExpectation = (outputLines) => {
  const text = outputLines.join(" ");
  const regexes = [
    /(expected|want)[^:]*[:=]\s*([^\n]+?)[;,.]?\s*(got|actual)[^:]*[:=]\s*([^\n]+)/i,
    /want\s+([^\n]+)\s+got\s+([^\n]+)/i,
    /expected\s+([^\n]+)\s+but\s+got\s+([^\n]+)/i,
  ];

  for (const re of regexes) {
    const match = text.match(re);
    if (match) {
      const expected = match[2] || match[1];
      const actual = match[4] || match[2];
      return {
        expected: (expected || "").trim(),
        actual: (actual || "").trim(),
      };
    }
  }
  return undefined;
};

const parseGoTestJson = (stdout) => {
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const tests = {};
  let packageOutput = [];

  for (const line of lines) {
    try {
      const evt = JSON.parse(line);

      if (evt.Test) {
        if (!tests[evt.Test]) {
          tests[evt.Test] = { name: evt.Test, output: [] };
        }
        if (evt.Output) tests[evt.Test].output.push(evt.Output.trim());
        if (evt.Action === "pass") tests[evt.Test].passed = true;
        if (evt.Action === "fail") tests[evt.Test].passed = false;
      } else if (evt.Output) {
        packageOutput.push(evt.Output.trim());
      }
    } catch {
      // ignore malformed lines
      packageOutput.push(line.trim());
    }
  }

  const testList = Object.values(tests).map((t) => {
    const expectations = extractExpectation(t.output);
    return {
      ...t,
      expected: expectations?.expected,
      actual: expectations?.actual,
    };
  });

  const summary = {
    total: testList.length,
    passed: testList.filter((t) => t.passed).length,
  };
  summary.failed = summary.total - summary.passed;

  return { tests: testList, summary, packageOutput };
};

const writeGoModule = (dir, moduleName = "code-teacher") => {
  const goMod = `module ${moduleName}\n\ngo 1.22\n`;
  fs.writeFileSync(path.join(dir, "go.mod"), goMod, "utf8");
};

const detectPackageName = (tests) => {
  for (const t of tests) {
    const match = t.content.match(/^\s*package\s+([a-zA-Z0-9_]+)/m);
    if (match) return match[1].trim();
  }
  return "main";
};

const forcePackageMain = (code) => {
  if (/^\s*package\s+main/m.test(code)) return code;
  if (/^\s*package\s+\w+/m.test(code)) {
    return code.replace(/^\s*package\s+\w+/m, "package main");
  }
  return `package main\n\n${code}`;
};

const ensureMainFunc = (code) => {
  if (/\bfunc\s+main\s*\(\s*\)/m.test(code)) return code;
  return `${code.trim()}\n\nfunc main() {}\n`;
};

const runGoTests = (code, tests, assets = []) =>
  new Promise((resolve) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "go-test-"));
    const pkgName = detectPackageName(tests);

    // Rewrite package line of user code to match tests, if present.
    let rewritten = code;
    if (/^\s*package\s+\w+/m.test(code)) {
      rewritten = code.replace(/^\s*package\s+\w+/m, `package ${pkgName}`);
    } else {
      rewritten = `package ${pkgName}\n\n${code}`;
    }

    fs.writeFileSync(path.join(dir, "main.go"), rewritten, "utf8");
    writeGoModule(dir, `code-teacher/${pkgName}`);
    tests.forEach((t, idx) => {
      const name = t.name || `exercise_test_${idx}.go`;
      fs.writeFileSync(path.join(dir, name), t.content, "utf8");
    });
    assets.forEach((a) => {
      fs.writeFileSync(path.join(dir, a.name), a.content, "utf8");
    });

    const started = Date.now();
    execFile(
      "go",
      ["test", "-json", "./..."],
      { cwd: dir, timeout: TIMEOUT_MS, env: { ...process.env } },
      (err, stdout, stderr) => {
        const durationMs = Date.now() - started;
        const parsed = parseGoTestJson(stdout || "");
        const status =
          parsed.summary.total === 0
            ? err
              ? "error"
              : "missing_tests"
            : parsed.summary.failed > 0
              ? "fail"
              : "pass";

        resolve({
          status,
          durationMs,
          stdout,
          stderr,
          tests: parsed.tests,
          summary: parsed.summary,
          packageOutput: parsed.packageOutput,
          error: err ? err.message : undefined,
        });

        fs.rmSync(dir, { recursive: true, force: true });
      },
    );
  });

app.post("/run", async (req, res) => {
  const code = (req.body && req.body.code) || "";
  if (!code.trim()) {
    return res.status(400).json({ error: "Missing code" });
  }

  try {
    await ensureGo();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "go-run-"));
  const file = path.join(dir, "main.go");
  const prepared = ensureMainFunc(forcePackageMain(code));
  fs.writeFileSync(file, prepared, "utf8");

  const started = Date.now();
  const child = execFile(
    "go",
    ["run", file],
    { cwd: dir, timeout: TIMEOUT_MS, env: { ...process.env } },
    (err, stdout, stderr) => {
      const durationMs = Date.now() - started;
      if (err) {
        return res.status(200).json({
          status: "error",
          stdout,
          stderr: stderr || err.message,
          durationMs,
        });
      }
      return res.status(200).json({
        status: "ok",
        stdout,
        stderr,
        durationMs,
      });
    },
  );

  child.on("error", () => {
    res.status(500).json({ error: "Failed to execute go run" });
  });
});

app.post("/test", async (req, res) => {
  const { code, source, slug } = req.body || {};
  if (!code?.trim()) {
    return res.status(400).json({ error: "Missing code" });
  }
  if (!source || !slug) {
    return res.status(400).json({ error: "Missing source or slug" });
  }

  try {
    await ensureGo();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const sourceConfig = SOURCE_CONFIG[source];
  if (!sourceConfig) {
    return res.status(400).json({ error: `Unknown source "${source}"` });
  }

  try {
    const testFiles = await sourceConfig.getTests(slug);
    if (!testFiles || testFiles.length === 0) {
      return res.status(200).json({
        status: "missing_tests",
        message: "No tests found for this exercise.",
        tests: [],
        summary: { total: 0, passed: 0, failed: 0 },
      });
    }

    const { tests, assets } = await sourceConfig.getTests(slug);
    if (!tests || tests.length === 0) {
      return res.status(200).json({
        status: "missing_tests",
        message: "No tests found for this exercise.",
        tests: [],
        summary: { total: 0, passed: 0, failed: 0 },
      });
    }

    const result = await runGoTests(code, tests, assets);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      status: "error",
      error: err.message || "Failed to run tests",
      tests: [],
      summary: { total: 0, passed: 0, failed: 0 },
    });
  }
});

app.listen(PORT, () => {
  console.log(`Go runner listening on http://localhost:${PORT}`);
});

