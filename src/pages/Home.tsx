import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchExerciseList, ExerciseMeta, ExerciseSourceKey } from "@/lib/exerciseSources";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const sources: { key: ExerciseSourceKey; label: string; description: string }[] = [
  { key: "bregman", label: "go-exercises", description: "Beginner-friendly exercises with solutions." },
  { key: "plutov", label: "practice-go", description: "Algorithmic challenges with tests; bring your own solution." },
];

const Home = () => {
  const navigate = useNavigate();

  const queries = sources.map((src) =>
    useQuery({
      queryKey: ["exercise-list", src.key],
      queryFn: () => fetchExerciseList(src.key),
    }),
  );

  const isLoading = queries.some((q) => q.isLoading);
  const anyError = queries.find((q) => q.error);

  const grouped = useMemo(() => {
    const result: Record<ExerciseSourceKey, ExerciseMeta[]> = {
      bregman: [],
      plutov: [],
    };
    queries.forEach((q, idx) => {
      if (q.data) {
        result[sources[idx].key] = q.data;
      }
    });
    return result;
  }, [queries]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">CodeLab</p>
          <h1 className="text-3xl font-bold text-foreground mt-1">Pick a Go exercise</h1>
          <p className="text-muted-foreground mt-2">
            Choose a source below. Your code and runs will stay tied to the exercise.
          </p>
          <div className="mt-3">
            <Button variant="secondary" onClick={() => navigate("/learn")}>
              Explore learning path (learngo)
            </Button>
          </div>
        </div>

        {anyError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load exercises</AlertTitle>
            <AlertDescription>{(anyError.error as Error).message}</AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading exercises...
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {sources.map((src) => (
            <Card key={src.key} className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{src.label}</span>
                  <span className="text-xs text-muted-foreground uppercase">{src.key}</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">{src.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
                  {grouped[src.key].map((ex) => (
                    <button
                      key={ex.slug}
                      onClick={() => navigate(`/exercise/${ex.source}/${ex.slug}`)}
                      className="text-left border border-border rounded-md px-3 py-2 hover:bg-muted transition"
                    >
                      <div className="font-semibold text-foreground">{ex.title}</div>
                      <div className="text-xs text-muted-foreground">{ex.slug}</div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;

