import { useEffect, useState } from "react";

interface CodeEditorProps {
  initialCode: string;
  onChange?: (code: string) => void;
}

const CodeEditor = ({ initialCode, onChange }: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const lines = code.split("\n");

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    onChange?.(newCode);
  };

  return (
    <div className="h-full bg-[hsl(var(--editor-bg))] rounded-lg overflow-hidden flex">
      {/* Line numbers */}
      <div className="select-none py-4 px-3 text-right text-muted-foreground font-mono text-sm bg-[hsl(var(--editor-line))] border-r border-border">
        {lines.map((_, idx) => (
          <div key={idx} className="leading-6">
            {idx + 1}
          </div>
        ))}
      </div>

      {/* Code area */}
      <div className="flex-1 relative">
        <textarea
          value={code}
          onChange={handleChange}
          spellCheck={false}
          className="absolute inset-0 w-full h-full p-4 font-mono text-sm bg-transparent text-foreground resize-none outline-none leading-6"
          style={{ caretColor: "hsl(var(--primary))" }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
