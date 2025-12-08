import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  chapter: string;
  lesson: string;
  onPrev?: () => void;
  onNext?: () => void;
}

const Header = ({ chapter, lesson, onPrev, onNext }: HeaderProps) => {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-primary font-mono">CodeLab</h1>
        
        {/* Progress dots placeholder */}
        <div className="hidden md:flex items-center gap-1">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < 5 ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{chapter}</span>
          <span className="text-foreground font-medium">{lesson}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onPrev} disabled={!onPrev}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} disabled={!onNext}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
