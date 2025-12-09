import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExerciseMeta, ExerciseSourceKey } from "@/lib/exerciseSources";
import { getExerciseList } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Search, Sparkles, BookOpen, Library } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const sources: { key: ExerciseSourceKey; label: string; description: string }[] = [
  { key: "bregman", label: "go-exercises", description: "Beginner-friendly exercises with solutions." },
  { key: "plutov", label: "practice-go", description: "Algorithmic challenges with tests; bring your own solution." },
];

const Home = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const queries = sources.map((src) =>
    useQuery({
      queryKey: ["exercise-list", src.key],
      queryFn: () => getExerciseList(src.key),
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

  const filterList = (list: ExerciseMeta[]) => {
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (ex) =>
        ex.title.toLowerCase().includes(term) ||
        ex.slug.toLowerCase().includes(term) ||
        ex.sourceLabel?.toLowerCase().includes(term),
    );
  };

  const combined = useMemo(
    () => [...grouped.bregman, ...grouped.plutov].sort((a, b) => a.title.localeCompare(b.title)),
    [grouped],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">CodeLab</p>
            <h1 className="text-4xl font-bold text-foreground">Practice Go with curated paths</h1>
            <p className="text-muted-foreground text-lg">
              Pick a learning path, then drill with exercises from multiple open-source repos. Your code
              and runs stay saved per exercise.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild className="gap-2">
                <Link to="/learn">
                  <Sparkles className="h-4 w-4" />
                  Learning path
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2">
                <Link to="/learn">
                  <BookOpen className="h-4 w-4" />
                  Start with variables
                </Link>
              </Button>
            </div>
            <div className="mt-4 max-w-md relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
              <Input
                className="pl-9"
                placeholder="Search exercises by title or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Card className="border-border">
            <CardHeader className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Library className="h-4 w-4" />
                Sources
              </CardTitle>
              <Badge variant="secondary">{combined.length || "—"} exercises</Badge>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We aggregate multiple open-source exercise sets. Your progress (code/runs) is tied to each
                exercise.
              </p>
              <ul className="space-y-2">
                {sources.map((src) => (
                  <li key={src.key} className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">{src.label}</div>
                      <div className="text-xs text-muted-foreground">{src.description}</div>
                    </div>
                    <Badge variant="outline">
                      {grouped[src.key].length ? `${grouped[src.key].length} items` : "Loading"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
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
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Available</span>
                  <Badge variant="outline">
                    {grouped[src.key].length ? `${grouped[src.key].length} exercises` : "Loading"}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
                  {filterList(grouped[src.key]).slice(0, 8).map((ex) => (
                    <button
                      key={ex.slug}
                      onClick={() => navigate(`/exercise/${ex.source}/${ex.slug}`)}
                      className="text-left border border-border rounded-md px-3 py-2 hover:bg-muted transition"
                    >
                      <div className="font-semibold text-foreground">{ex.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{ex.slug}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {ex.sourceLabel ?? ex.source}
                        </Badge>
                      </div>
                    </button>
                  ))}
                  {filterList(grouped[src.key]).length > 8 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/exercise/${src.key}/${filterList(grouped[src.key])[0].slug}`)}
                    >
                      View all
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>All exercises</CardTitle>
          </CardHeader>
          <CardContent>
            {combined.length === 0 ? (
              <div className="text-sm text-muted-foreground">Loading exercises...</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filterList(combined).slice(0, 12).map((ex) => (
                  <button
                    key={`${ex.source}-${ex.slug}`}
                    onClick={() => navigate(`/exercise/${ex.source}/${ex.slug}`)}
                    className="text-left border border-border rounded-md px-3 py-2 hover:bg-muted transition"
                  >
                    <div className="font-semibold text-foreground">{ex.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{ex.slug}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {ex.sourceLabel ?? ex.source}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;

