const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "models/gemini-2.0-flash";

const modelPath = (() => {
  const raw = import.meta.env.VITE_GEMINI_MODEL?.toString().trim();
  if (!raw) return DEFAULT_MODEL;
  return raw.startsWith("models/") ? raw : `models/${raw}`;
})();

export const getConfiguredModel = () => modelPath;

export const callGemini = async (prompt: string): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.toString().trim();
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY");
  }

  const response = await fetch(
    `${API_BASE}/${modelPath}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Gemini request failed (${response.status}): ${text || "unknown error"}`,
    );
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text =
    data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join("\n") ?? "";

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
};


