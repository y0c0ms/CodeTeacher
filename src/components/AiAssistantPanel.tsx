import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MessageCircle, Wand2, Sparkles } from "lucide-react";
import { callGemini, getConfiguredModel } from "@/lib/gemini";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type AiAssistantPanelProps = {
  problemTitle?: string;
  problemDescription?: string;
  currentCode: string;
  onApplySolution: (code: string) => void;
};

const extractGoCode = (text: string) => {
  const match = text.match(/```(?:go)?\n([\s\S]*?)```/i);
  return match?.[1]?.trim() ?? null;
};

const AiAssistantPanel = ({
  problemTitle,
  problemDescription,
  currentCode,
  onApplySolution,
}: AiAssistantPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedCode, setSuggestedCode] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  const hasContext = Boolean(problemTitle && problemDescription);

  const baseContext = useMemo(() => {
    if (!hasContext) return "";

    return [
      "Role: You are a concise, encouraging Go mentor. Keep answers short, actionable, and beginner-friendly.",
      "Output format: plain text for guidance. When sharing code, wrap it in ```go fences. Keep code ready to paste into a single file.",
      `Problem Title: ${problemTitle}`,
      `Problem Statement:\n${problemDescription}`,
    ].join("\n\n");
  }, [hasContext, problemDescription, problemTitle]);

  useEffect(() => {
    // Reset conversation when the exercise changes
    setMessages([]);
    setSuggestedCode(null);
    setInput("");
    setError(null);
  }, [problemTitle, problemDescription]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, loading]);

  const sendPrompt = async (prompt: string, mode: "chat" | "help") => {
    if (!hasContext) return;
    setLoading(true);
    setError(null);

    const userMessage =
      mode === "help"
        ? `Help me out with a working Go solution. Here is my current code:\n\n${currentCode}\n\nProvide a corrected solution with a brief rationale.`
        : prompt;

    const fullPrompt = [
      baseContext,
      "When responding:",
      "- For guidance, be concise and actionable.",
      "- If providing a solution, include a single ```go code fence with the full solution.",
      "- Prefer standard library. Explain briefly.",
      "\nUser request:",
      userMessage,
    ].join("\n");

    const shownUserMessage =
      mode === "help"
        ? "Help me out (generate a solution based on my current code)."
        : prompt;

    setMessages((prev) => [...prev, { role: "user", content: shownUserMessage }]);

    try {
      const reply = await callGemini(fullPrompt);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

      const code = extractGoCode(reply);
      setSuggestedCode(code);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    void sendPrompt(input.trim(), "chat");
    setInput("");
  };

  const handleHelp = () => {
    if (loading) return;
    void sendPrompt("", "help");
  };

  const handleApplySolution = () => {
    if (suggestedCode) {
      onApplySolution(suggestedCode);
    }
  };

  if (!hasContext) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Select an exercise to ask the AI for help.
      </div>
    );
  }

  return (
    <div className="h-[380px] flex flex-col">
      <div className="flex items-center justify-between pb-3">
        <div>
          <p className="text-xs uppercase text-muted-foreground tracking-wide">
            AI Guide (Gemini)
          </p>
          <p className="text-sm text-muted-foreground">
            Model: {getConfiguredModel().replace("models/", "")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleHelp}
            disabled={loading}
            className="gap-2"
          >
            <Wand2 className="h-4 w-4" />
            Help me out
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleApplySolution}
            disabled={!suggestedCode}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Apply solution
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 rounded-md border border-border bg-muted/30 p-3 overflow-y-auto space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Ask a question about this problem or tap “Help me out” to get a suggested
            solution.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`rounded-md p-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary/10 text-foreground"
                  : "bg-background border border-border text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground mb-1">
                {msg.role === "user" ? <MessageCircle className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                {msg.role === "user" ? "You" : "Assistant"}
              </div>
              <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
            </div>
          ))
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-2">
          <Alert variant="destructive">
            <AlertTitle>Gemini error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        <Textarea
          placeholder="Ask a question about the problem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="min-h-[90px]"
        />
        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={loading || !input.trim()} className="gap-2">
            <MessageCircle className="h-4 w-4" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPanel;


