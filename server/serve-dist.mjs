import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const distPath = path.join(__dirname, "..", "dist");

// Serve static assets
app.use(express.static(distPath));

// Fallback to index.html for SPA routes (catch-all)
app.use((_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

const port = process.env.PORT || 4173;
app.listen(port, () => {
  console.log(`Serving dist on http://0.0.0.0:${port}`);
});

