import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import ExercisePanel, { Exercise } from "@/components/ExercisePanel";
import CodeEditor from "@/components/CodeEditor";
import Terminal from "@/components/Terminal";
import ActionButtons from "@/components/ActionButtons";
import AiAssistantPanel from "@/components/AiAssistantPanel";
import { useQuery } from "@tanstack/react-query";
import { fetchExerciseDetail, fetchExerciseList, ExerciseSourceKey } from "@/lib/exerciseSources";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";

const placeholderCode = `package main

func main() {
\t// Select an exercise on the left to start solving it.
}
`;

const Index = () => {
  const params = useParams<{ source: ExerciseSourceKey; slug: string }>();
  const navigate = useNavigate();

  const selectedSlug = params.slug;
  const selectedSource = params.source;
  const [code, setCode] = useState(placeholderCode);
  const [userCodeCache, setUserCodeCache] = useState<Record<string, string>>({});
  const [solutionApplied, setSolutionApplied] = useState(false);
  const [aiCollapsed, setAiCollapsed] = useState(false);
  const [terminalLines, setTerminalLines] = useState<
    { type: "info" | "error" | "success" | "output"; content: string }[]
  >([]);

  const exerciseListQuery = useQuery({
    queryKey: ["exercise-list", selectedSource],
    queryFn: () => fetchExerciseList(selectedSource ?? "bregman"),
    enabled: Boolean(selectedSource),
  });

  const exerciseDetailQuery = useQuery({
    queryKey: ["exercise", selectedSource, selectedSlug],
    queryFn: () => fetchExerciseDetail(selectedSource as ExerciseSourceKey, selectedSlug as string),
    enabled: Boolean(selectedSlug && selectedSource),
  });

  useEffect(() => {
    if (exerciseDetailQuery.data) {
      const cacheKey = `${exerciseDetailQuery.data.sourceKey}:${exerciseDetailQuery.data.slug}`;
      const cached = userCodeCache[cacheKey];
      setCode(cached ?? exerciseDetailQuery.data.starterCode);
      setSolutionApplied(false);
      setTerminalLines([
        {
          type: "info",
          content: `Loaded "${exerciseDetailQuery.data.title}" from ${exerciseDetailQuery.data.source}`,
        },
      ]);
    } else if (!exerciseDetailQuery.isLoading && (!selectedSlug || !selectedSource)) {
      navigate("/");
    }
  }, [exerciseDetailQuery.data, exerciseDetailQuery.isLoading, userCodeCache, navigate, selectedSlug, selectedSource]);

  const persistCode = (slug: string | undefined, value: string) => {
    if (!slug || !selectedSource) return;
    setUserCodeCache((prev) => {
      const key = `${selectedSource}:${slug}`;
      const next = { ...prev, [key]: value };
      localStorage.setItem("codelab-code-cache", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    const raw = localStorage.getItem("codelab-code-cache");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setUserCodeCache(parsed);
      } catch {
        // ignore malformed cache
      }
    }
  }, []);

  const handleRun = async () => {
    setTerminalLines([{ type: "info", content: "Running code..." }]);

    try {
      const res = await fetch("http://localhost:8787/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Runner error (${res.status})`);
      }

      const data = (await res.json()) as {
        status: string;
        stdout: string;
        stderr: string;
        durationMs: number;
      };

      const lines = [
        { type: "info" as const, content: `Finished in ${data.durationMs} ms` },
      ];

      if (data.stdout) {
        data.stdout
          .split("\n")
          .filter(Boolean)
          .forEach((line) => lines.push({ type: "output", content: line }));
      }
      if (data.stderr) {
        data.stderr
          .split("\n")
          .filter(Boolean)
          .forEach((line) => lines.push({ type: "error", content: line }));
      }

      setTerminalLines(lines);
    } catch (err) {
      setTerminalLines([
        { type: "error", content: (err as Error).message },
        {
          type: "info",
          content: "Ensure `npm run go:runner` is running and Go is installed locally.",
        },
      ]);
    }
  };

  const handleSubmit = () => {
    setTerminalLines([
      {
        type: "info",
        content:
          "Submission checks are not wired yet. Add a Go backend to compile and test solutions.",
      },
    ]);
  };

  const handleSolutionToggle = () => {
    if (!exerciseDetailQuery.data) return;

    if (solutionApplied) {
      const cacheKey = `${exerciseDetailQuery.data.sourceKey}:${exerciseDetailQuery.data.slug}`;
      const cached = userCodeCache[cacheKey];
      setCode(cached ?? exerciseDetailQuery.data.starterCode);
      setSolutionApplied(false);
      setTerminalLines([{ type: "info", content: "Reverted to your code." }]);
    } else {
      // Save current user code
      persistCode(exerciseDetailQuery.data.slug, code);
      setCode(exerciseDetailQuery.data.solutionCode);
      setSolutionApplied(true);
      setTerminalLines([
        {
          type: "success",
          content: `Solution loaded for "${exerciseDetailQuery.data.title}". Click again to revert.`,
        },
      ]);
    }
  };

  const currentExercise: Exercise | undefined = useMemo(() => {
    if (!exerciseDetailQuery.data) return undefined;

    return {
      title: exerciseDetailQuery.data.title,
      description: exerciseDetailQuery.data.description,
      source: exerciseDetailQuery.data.source,
    };
  }, [exerciseDetailQuery.data]);

  const exerciseList = exerciseListQuery.data ?? [];
  const currentIndex = exerciseList.findIndex((ex) => ex.slug === selectedSlug);
  const prev = currentIndex > 0 ? exerciseList[currentIndex - 1] : undefined;
  const next =
    currentIndex >= 0 && currentIndex < exerciseList.length - 1
      ? exerciseList[currentIndex + 1]
      : undefined;

  const handlePrev = prev
    ? () => navigate(`/exercise/${prev.source}/${prev.slug}`)
    : undefined;
  const handleNext = next
    ? () => navigate(`/exercise/${next.source}/${next.slug}`)
    : undefined;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header
        chapter="Go Exercises"
        lesson={currentExercise?.title ?? "Pick an exercise"}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Exercise */}
        <div className="w-1/2 border-r border-border bg-card overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted/40 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide">
                  Source
                </p>
                <p className="text-sm font-semibold text-foreground">
                  go-exercises (GitHub, MIT)
                </p>
              </div>

              <div className="w-64">
                <Select
                  value={selectedSlug ?? ""}
                  onValueChange={setSelectedSlug}
                  disabled={exerciseListQuery.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        exerciseListQuery.isLoading
                          ? "Loading exercises..."
                          : "Choose an exercise"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseListQuery.data?.map((exercise) => (
                      <SelectItem key={exercise.slug} value={exercise.slug}>
                        {exercise.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {exerciseListQuery.error ? (
              <Alert variant="destructive">
                <AlertTitle>Could not load exercises</AlertTitle>
                <AlertDescription>
                  {(exerciseListQuery.error as Error).message}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>

          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {exerciseDetailQuery.error ? (
                <div className="h-full flex items-center justify-center p-6">
                  <Alert variant="destructive" className="w-full max-w-xl">
                    <AlertTitle>Could not load this exercise</AlertTitle>
                    <AlertDescription>
                      {(exerciseDetailQuery.error as Error).message}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : exerciseDetailQuery.isLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Fetching problem statement...
                </div>
              ) : currentExercise ? (
                <ExercisePanel exercise={currentExercise} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Pick an exercise to get started.
                </div>
              )}
            </div>

            <div className="border-t border-border bg-card/60">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="text-sm font-semibold text-foreground">AI Guide</div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                  onClick={() => setAiCollapsed((v) => !v)}
                >
                  {aiCollapsed ? (
                    <>
                      <ChevronDown className="h-4 w-4" /> Expand
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-4 w-4" /> Collapse
                    </>
                  )}
                </button>
              </div>

              {!aiCollapsed ? (
                <div className="p-4">
                  <AiAssistantPanel
                    problemTitle={currentExercise?.title}
                    problemDescription={currentExercise?.description}
                    currentCode={code}
                    onApplySolution={setCode}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Right Panel - Code Editor + Terminal */}
        <div className="w-1/2 flex flex-col">
          {/* Code Editor */}
          <div className="flex-1 p-4 min-h-0">
            <CodeEditor
              initialCode={code}
              onChange={(val) => {
                setCode(val);
                persistCode(selectedSlug, val);
              }}
            />
          </div>

          {/* Action Buttons */}
          <ActionButtons
            onSubmit={handleSubmit}
            onRun={handleRun}
            onSolution={handleSolutionToggle}
          />

          {/* Terminal */}
          <div className="h-40 p-4 pt-0">
            <Terminal lines={terminalLines} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
