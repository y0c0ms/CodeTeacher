import { Play, Send, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  onSubmit: () => void;
  onRun: () => void;
  onSolution: () => void;
  submitting?: boolean;
  running?: boolean;
}

const ActionButtons = ({ onSubmit, onRun, onSolution, submitting, running }: ActionButtonsProps) => {
  return (
    <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
      <Button onClick={onSubmit} className="gap-2" disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {submitting ? "Submitting..." : "Submit"}
      </Button>
      
      <Button variant="secondary" onClick={onRun} className="gap-2" disabled={running || submitting}>
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {running ? "Running..." : "Run"}
      </Button>
      
      <Button variant="outline" onClick={onSolution} className="gap-2">
        <Eye className="h-4 w-4" />
        Solution
      </Button>
    </div>
  );
};

export default ActionButtons;
