import { useEffect, useState, useMemo } from "react";
import Editor from "@monaco-editor/react";

interface CodeEditorProps {
  initialCode: string;
  onChange?: (code: string) => void;
}

const CodeEditor = ({ initialCode, onChange }: CodeEditorProps) => {
  const [code, setCode] = useState(initialCode);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const editorOptions = useMemo(
    () => ({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      wordWrap: "on",
    }),
    [],
  );

  return (
    <div className="h-full bg-[hsl(var(--editor-bg))] rounded-lg overflow-hidden border border-border">
      <Editor
        height="100%"
        defaultLanguage="go"
        theme="vs-dark"
        value={code}
        options={editorOptions}
        onChange={(val) => {
          const next = val ?? "";
          setCode(next);
          onChange?.(next);
        }}
      />
    </div>
  );
};

export default CodeEditor;
