import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import PassphraseGate from "@/components/PassphraseGate";
import Home from "./pages/Home";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Learn from "./pages/Learn";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PassphraseGate>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/exercise/:source/:slug" element={<Index />} />
            <Route path="/exercise" element={<Navigate to="/" replace />} />
            <Route path="/learn" element={<Learn />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </PassphraseGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
