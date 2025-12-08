interface TerminalLine {
  type: "info" | "error" | "success" | "output";
  content: string;
}

interface TerminalProps {
  lines: TerminalLine[];
}

const Terminal = ({ lines }: TerminalProps) => {
  const getLineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "error":
        return "text-[hsl(var(--code-error))]";
      case "success":
        return "text-primary";
      case "info":
        return "text-muted-foreground";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="h-full bg-[hsl(var(--terminal-bg))] rounded-lg overflow-hidden flex flex-col">
      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <div className="w-3 h-3 rounded-full bg-[hsl(45_80%_50%)]" />
        <div className="w-3 h-3 rounded-full bg-primary" />
        <span className="ml-2 text-xs text-muted-foreground font-mono">Terminal</span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
        {lines.length === 0 ? (
          <div className="text-muted-foreground">
            <span className="text-primary">$</span> Ready to run...
          </div>
        ) : (
          lines.map((line, idx) => (
            <div key={idx} className={getLineColor(line.type)}>
              {line.type === "error" && <span className="text-destructive mr-2">#</span>}
              {line.content}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Terminal;
