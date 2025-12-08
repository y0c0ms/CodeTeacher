import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock4, XCircle } from "lucide-react";

type TestCaseResult = {
  name: string;
  passed?: boolean;
  expected?: string;
  actual?: string;
  output?: string[];
};

export type TestRunResult = {
  status: "pass" | "fail" | "error" | "missing_tests";
  durationMs: number;
  summary: { total: number; passed: number; failed: number };
  tests: TestCaseResult[];
  stdout?: string;
  stderr?: string;
  error?: string;
  message?: string;
  packageOutput?: string[];
};

interface AnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: TestRunResult | null;
}

const AnalysisDialog = ({ open, onOpenChange, result }: AnalysisDialogProps) => {
  if (!result) return null;

  const passRate =
    result.summary.total > 0 ? Math.round((result.summary.passed / result.summary.total) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {result.status === "pass" ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            Submission analysis
          </DialogTitle>
          <DialogDescription>
            {result.status === "pass"
              ? "Great work! All tests passed. See details below."
              : "Tests ran with some failures. Review details below."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="border rounded-md p-3">
            <p className="text-xs uppercase text-muted-foreground">Duration</p>
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Clock4 className="h-4 w-4" />
              {result.durationMs} ms
            </div>
          </div>
          <div className="border rounded-md p-3">
            <p className="text-xs uppercase text-muted-foreground">Pass rate</p>
            <div className="text-lg font-semibold text-foreground">{passRate}%</div>
            <p className="text-xs text-muted-foreground">
              {result.summary.passed}/{result.summary.total} tests
            </p>
          </div>
          <div className="border rounded-md p-3">
            <p className="text-xs uppercase text-muted-foreground">Status</p>
            <Badge variant={result.status === "pass" ? "default" : "destructive"} className="mt-1">
              {result.status === "pass" ? "All tests passed" : "Issues found"}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Test cases</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Got</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.tests.map((test) => (
                <TableRow key={test.name}>
                  <TableCell className="font-medium">{test.name}</TableCell>
                  <TableCell>
                    <Badge variant={test.passed ? "default" : "destructive"}>
                      {test.passed ? "Passed" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {test.expected ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{test.actual ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnalysisDialog;

