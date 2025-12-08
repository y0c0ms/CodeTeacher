import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface CodeBlockProps {
  code: string;
  language?: string;
}

const CodeBlock = ({ code }: CodeBlockProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="relative group bg-[hsl(var(--editor-bg))] rounded-md p-4 font-mono text-sm">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        onClick={handleCopy}
      >
        <Copy className="h-4 w-4" />
      </Button>
      <pre className="text-[hsl(var(--code-keyword))]">{code}</pre>
    </div>
  );
};

export interface Exercise {
  title: string;
  description: string;
  codeExamples?: { code: string; explanation?: string }[];
  assignment?: {
    instruction?: string;
    hints?: string[];
  };
  source?: string;
}

interface ExercisePanelProps {
  exercise: Exercise;
}

const ExercisePanel = ({ exercise }: ExercisePanelProps) => {
  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{exercise.title}</h1>

      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{exercise.description}</ReactMarkdown>
      </div>

      {exercise.codeExamples?.length ? (
        exercise.codeExamples.map((example, idx) => (
          <div key={idx} className="space-y-2">
            <CodeBlock code={example.code} />
            {example.explanation && (
              <p className="text-muted-foreground text-sm">{example.explanation}</p>
            )}
          </div>
        ))
      ) : null}

      {exercise.assignment?.instruction || exercise.assignment?.hints?.length ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground font-serif">
            Assignment
          </h2>
          {exercise.assignment?.instruction ? (
            <p className="text-muted-foreground">{exercise.assignment.instruction}</p>
          ) : null}

          {exercise.assignment?.hints?.length ? (
            <ul className="list-disc list-inside space-y-2">
              {exercise.assignment.hints.map((hint, idx) => (
                <li key={idx} className="text-muted-foreground">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-accent-foreground text-sm">
                    {hint}
                  </code>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {exercise.source ? (
        <p className="text-xs text-muted-foreground">Source: {exercise.source}</p>
      ) : null}
    </div>
  );
};

export default ExercisePanel;
