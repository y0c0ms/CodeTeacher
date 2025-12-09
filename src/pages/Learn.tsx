import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  fetchLearnModules,
  fetchLearnModuleDetail,
  fetchLessonContent,
  fetchLessonDataUrl,
  LearnLessonMeta,
} from "@/lib/learnSources";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  BookOpen,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  Copy,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CodeFence = ({
  inline,
  className,
  children,
}: {
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
}) => {
  if (inline) {
    return <code className="bg-muted px-1.5 py-0.5 rounded text-sm">{children}</code>;
  }

  const code = String(children ?? "").replace(/\n$/, "");
  const lines = code.split("\n");

  const handleCopy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
  };

  return (
    <div className={`relative group border border-border rounded-md bg-[hsl(var(--editor-bg))] ${className ?? ""}`}>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
        onClick={handleCopy}
        aria-label="Copy code"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <div className="flex text-sm font-mono overflow-x-auto">
        <div className="select-none py-3 px-3 text-right text-muted-foreground bg-[hsl(var(--editor-line))] border-r border-border min-w-[3rem]">
          {lines.map((_, idx) => (
            <div key={idx} className="leading-6">
              {idx + 1}
            </div>
          ))}
        </div>
        <pre className="flex-1 p-3 leading-6 whitespace-pre">{code}</pre>
      </div>
    </div>
  );
};

const markdownComponents = {
  code: CodeFence,
};

const Learn = () => {
  const modulesQuery = useQuery({
    queryKey: ["learn-modules"],
    queryFn: fetchLearnModules,
  });

  const [selectedSlug, setSelectedSlug] = useState<string | undefined>(undefined);
  const [selectedLesson, setSelectedLesson] = useState<LearnLessonMeta | null>(null);
  const [showModules, setShowModules] = useState(true);
  const [showDescription, setShowDescription] = useState(true);

  const moduleDetailQuery = useQuery({
    queryKey: ["learn-module", selectedSlug],
    queryFn: () => fetchLearnModuleDetail(selectedSlug as string),
    enabled: Boolean(selectedSlug),
  });

  const lessonContentQuery = useQuery({
    queryKey: ["learn-lesson", selectedLesson?.downloadUrl],
    queryFn: () => fetchLessonContent(selectedLesson?.downloadUrl),
    enabled: Boolean(selectedLesson?.downloadUrl) && !selectedLesson?.name.toLowerCase().endsWith(".pdf"),
  });

  const pdfContentQuery = useQuery({
    queryKey: ["learn-lesson-pdf", selectedLesson?.downloadUrl],
    queryFn: () => fetchLessonDataUrl(selectedLesson?.downloadUrl, "application/pdf"),
    enabled: Boolean(selectedLesson?.downloadUrl && selectedLesson?.name.toLowerCase().endsWith(".pdf")),
  });

  const modules = modulesQuery.data ?? [];
  const activeModule = moduleDetailQuery.data;

  useEffect(() => {
    if (!selectedSlug && modules.length) {
      setSelectedSlug(modules[0].slug);
    }
  }, [modules, selectedSlug]);

  useEffect(() => {
    if (activeModule && activeModule.lessons.length > 0 && !selectedLesson) {
      setSelectedLesson(activeModule.lessons[0]);
    }
  }, [activeModule, selectedLesson]);

  const lessonIndex = useMemo(() => {
    if (!activeModule || !selectedLesson) return -1;
    return activeModule.lessons.findIndex((l) => l.path === selectedLesson.path);
  }, [activeModule, selectedLesson]);

  const handlePrev = () => {
    if (!activeModule || lessonIndex <= 0) return;
    setSelectedLesson(activeModule.lessons[lessonIndex - 1]);
  };

  const handleNext = () => {
    if (!activeModule || lessonIndex < 0 || lessonIndex >= activeModule.lessons.length - 1) return;
    setSelectedLesson(activeModule.lessons[lessonIndex + 1]);
  };

  const renderLessonContent = () => {
    if (!selectedLesson) return null;
    const name = selectedLesson.name.toLowerCase();
    const content = lessonContentQuery.data ?? "";

    if (name.endsWith(".md")) {
      return (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>
      );
    }

    if (name.endsWith(".pdf")) {
      if (pdfContentQuery.isLoading) {
        return (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading PDF...
          </div>
        );
      }

      if (!pdfContentQuery.data) {
        return (
          <div className="p-4 text-sm text-destructive bg-muted/40 border border-border rounded-md">
            Could not load this PDF.
          </div>
        );
      }

      return (
        <div className="border border-border rounded-md overflow-hidden h-[640px]">
          <iframe src={pdfContentQuery.data} title={selectedLesson.name} className="w-full h-full" />
        </div>
      );
    }

    return (
      <pre className="bg-[hsl(var(--editor-bg))] rounded-md p-4 text-sm font-mono whitespace-pre-wrap border border-border">
        {content || "// No content"}
      </pre>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Learning path</p>
            <h1 className="text-3xl font-bold text-foreground">Go essentials</h1>
            <p className="text-muted-foreground max-w-2xl">
              Browse the learngo modules (markdown, PDFs, code) and pair them with practice exercises. Use AI
              for hints and the runner for quick tests.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/">Back to exercises</Link>
              </Button>
              {modules.length ? (
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={() => {
                    setShowModules(true);
                    setSelectedSlug(modules[0].slug);
                    setSelectedLesson(null);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  Start with modules
                </Button>
              ) : null}
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            Beta
          </Badge>
        </div>

        {modulesQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load learning modules</AlertTitle>
            <AlertDescription>{(modulesQuery.error as Error).message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid md:grid-cols-3 gap-4">
          {showModules ? (
            <Card className="border-border shadow-sm md:col-span-1">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Modules
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowModules(false)}
                  aria-label="Hide modules"
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {modulesQuery.isLoading ? (
                  <div className="p-4 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading modules...
                  </div>
                ) : (
                  <ScrollArea className="h-[520px]">
                    <div className="p-2 space-y-1">
                      {modules.map((mod) => (
                        <Button
                          key={mod.slug}
                          variant={selectedSlug === mod.slug ? "default" : "ghost"}
                          className="w-full justify-start text-left"
                          onClick={() => {
                            setSelectedSlug(mod.slug);
                            setSelectedLesson(null);
                          }}
                        >
                          <span className="font-medium">{mod.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{mod.slug}</span>
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full md:w-auto flex items-center gap-2"
              onClick={() => setShowModules(true)}
            >
              <Eye className="h-4 w-4" />
              Show modules
            </Button>
          )}

          <Card className={`${showModules ? "md:col-span-2" : "md:col-span-3"} border-border shadow-sm`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4" />
                {activeModule?.title ?? "Pick a module"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {moduleDetailQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading module...
                </div>
              ) : activeModule ? (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{activeModule.slug}</Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDescription((v) => !v)}
                        aria-label={showDescription ? "Hide description" : "Show description"}
                      >
                        {showDescription ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                    {showDescription ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {activeModule.description}
                        </ReactMarkdown>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">Lessons / files</p>
                    {activeModule.lessons.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No files found in this module.</p>
                    ) : (
                      <div className="space-y-2">
                        {activeModule.lessons.map((lesson) => (
                          <Button
                            key={lesson.path}
                            variant={selectedLesson?.path === lesson.path ? "secondary" : "outline"}
                            className="w-full justify-between"
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            <span className="truncate">{lesson.name}</span>
                            <Badge variant={lesson.isCode ? "default" : "secondary"}>
                              {lesson.isCode ? "code" : "asset"}
                            </Badge>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedLesson ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          Preview: {selectedLesson.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={handlePrev} disabled={!activeModule || lessonIndex <= 0}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNext}
                            disabled={
                              !activeModule ||
                              lessonIndex < 0 ||
                              lessonIndex >= (activeModule?.lessons.length ?? 0) - 1
                            }
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          {lessonContentQuery.isLoading && !selectedLesson.name.toLowerCase().endsWith(".pdf") ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-xs">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Loading...
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {renderLessonContent()}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Pick a module to view details.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Learn;
