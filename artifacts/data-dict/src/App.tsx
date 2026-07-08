import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout";
import { OnboardingModal } from "@/components/onboarding-modal";

import Dashboard from "./pages/dashboard";
import DictionariesList from "./pages/dictionaries";
import NewDictionary from "./pages/new-dictionary";
import DictionaryDetail from "./pages/dictionary-detail";
import CriticalFields from "./pages/critical-fields";
import About from "./pages/about";
import SupabaseConfig from "./pages/supabase-config";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <OnboardingModal />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/about" component={About} />
        <Route path="/dictionaries" component={DictionariesList} />
        <Route path="/dictionaries/new" component={NewDictionary} />
        <Route path="/dictionaries/:id" component={DictionaryDetail} />
        <Route path="/fields/critical" component={CriticalFields} />
        <Route path="/supabase-config" component={SupabaseConfig} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
