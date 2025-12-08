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
  fs.writeFileSync(file, code, "utf8");

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

app.listen(PORT, () => {
  console.log(`Go runner listening on http://localhost:${PORT}`);
});

