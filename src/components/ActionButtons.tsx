import { Play, Send, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  onSubmit: () => void;
  onRun: () => void;
  onSolution: () => void;
}

const ActionButtons = ({ onSubmit, onRun, onSolution }: ActionButtonsProps) => {
  return (
    <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
      <Button onClick={onSubmit} className="gap-2">
        <Send className="h-4 w-4" />
        Submit
      </Button>
      
      <Button variant="secondary" onClick={onRun} className="gap-2">
        <Play className="h-4 w-4" />
        Run
      </Button>
      
      <Button variant="outline" onClick={onSolution} className="gap-2">
        <Eye className="h-4 w-4" />
        Solution
      </Button>
    </div>
  );
};

export default ActionButtons;
