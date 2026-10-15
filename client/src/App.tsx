import { Redirect, Route, Router, Switch } from "wouter";
import type { BaseLocationHook } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { resultsPath } from "./lib/routes";
import ComparePage from "./pages/ComparePage";
import NotFound from "./pages/NotFound";
import ResultsPage from "./pages/ResultsPage";

/** Old shared links (/?from=&to=&date=) open the results page. */
function Home() {
  const p = new URLSearchParams(window.location.search);
  const [from, to, date] = [p.get("from"), p.get("to"), p.get("date")];
  if (from && to && date)
    return <Redirect to={resultsPath({ from, to, date })} replace />;
  return <ComparePage />;
}

function App({ locationHook }: { locationHook?: BaseLocationHook }) {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Router hook={locationHook}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/results/:from/:to/:date">
                {p => (
                  <ResultsPage
                    from={decodeURIComponent(p.from)}
                    to={decodeURIComponent(p.to)}
                    date={p.date}
                  />
                )}
              </Route>
              <Route component={NotFound} />
            </Switch>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
