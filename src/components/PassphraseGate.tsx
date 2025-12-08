import { ReactNode, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type GateStatus = "checking" | "locked" | "granted";

const STORAGE_KEY = "codelab-passphrase";

type PassphraseGateProps = {
  children: ReactNode;
};

const PassphraseGate = ({ children }: PassphraseGateProps) => {
  const expected = import.meta.env.VITE_APP_PASSPHRASE?.toString().trim();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!expected) {
      setStatus("granted");
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored === expected) {
      setStatus("granted");
    } else {
      setStatus("locked");
    }
  }, [expected]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expected) {
      setStatus("granted");
      return;
    }

    if (input.trim() === expected) {
      localStorage.setItem(STORAGE_KEY, input.trim());
      setStatus("granted");
      setError(null);
    } else {
      setError("Incorrect passphrase. Please try again.");
    }
  };

  if (status === "granted") {
    return <>{children}</>;
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm border border-border rounded-lg p-6 shadow-sm bg-card">
        <h1 className="text-xl font-semibold text-foreground mb-2">CodeLab Access</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Enter the passphrase to continue. This gate is local-only and stored in your
          browser.
        </p>

        <form className="space-y-3" onSubmit={handleSubmit}>
          <Input
            type="password"
            placeholder="Passphrase"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status === "checking"}
          />
          <Button className="w-full" type="submit" disabled={status === "checking"}>
            Unlock
          </Button>
        </form>

        {error ? (
          <div className="mt-4">
            <Alert variant="destructive">
              <AlertTitle>Access denied</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PassphraseGate;


