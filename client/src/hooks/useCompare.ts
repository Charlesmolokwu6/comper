import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCompare, type CompareResponse, type Coverage } from "@/lib/api";
import { POLL_INTERVAL_MS, shouldPoll } from "@/lib/polling";

export interface CompareQuery {
  from: string;
  to: string;
  date: string;
}

type Fetcher<R> = (
  from: string,
  to: string,
  date: string,
  signal?: AbortSignal
) => Promise<R>;

export type CompareState<R = CompareResponse> =
  | { phase: "idle" }
  | { phase: "loading"; query: CompareQuery }
  | {
      phase: "results";
      query: CompareQuery;
      data: R;
      /** Still re-polling for operators that are pending. */
      polling: boolean;
      /** Gave up waiting; operators still pending have timed out. */
      timedOut: boolean;
      /** A re-poll failed; showing the last good response. */
      pollError: string | null;
    }
  | { phase: "error"; query: CompareQuery; message: string };

/**
 * Runs a comparison and keeps re-fetching while operators are still `pending`. Each
 * response is the server's full current snapshot, so it simply replaces the last one.
 */
export function useCompare<
  R extends { coverage: Pick<Coverage, "status">[] } = CompareResponse,
>(fetcher: Fetcher<R> = fetchCompare as unknown as Fetcher<R>) {
  const [state, setState] = useState<CompareState<R>>({ phase: "idle" });
  const run = useRef<{
    ctrl: AbortController;
    timer?: ReturnType<typeof setTimeout>;
  } | null>(null);

  const stop = () => {
    run.current?.ctrl.abort();
    clearTimeout(run.current?.timer);
    run.current = null;
  };

  const search = useCallback((query: CompareQuery) => {
    stop();
    const ctrl = new AbortController();
    const current = { ctrl } as {
      ctrl: AbortController;
      timer?: ReturnType<typeof setTimeout>;
    };
    run.current = current;
    const startedAt = Date.now();
    setState({ phase: "loading", query });

    const poll = async (first: boolean) => {
      try {
        const data = await fetcher(
          query.from,
          query.to,
          query.date,
          ctrl.signal
        );
        if (ctrl.signal.aborted) return;
        const again = shouldPoll(data.coverage, startedAt, Date.now());
        const pending = data.coverage.some(c => c.status === "pending");
        setState({
          phase: "results",
          query,
          data,
          polling: again,
          timedOut: pending && !again,
          pollError: null,
        });
        if (again)
          current.timer = setTimeout(() => poll(false), POLL_INTERVAL_MS);
      } catch (err: any) {
        if (ctrl.signal.aborted) return;
        if (first) {
          setState({ phase: "error", query, message: err.message });
          return;
        }
        // Keep what we have; one more try unless out of time.
        setState(s =>
          s.phase === "results" ? { ...s, pollError: err.message } : s
        );
        if (Date.now() - startedAt < 120_000)
          current.timer = setTimeout(() => poll(false), POLL_INTERVAL_MS * 2);
        else
          setState(s =>
            s.phase === "results" ? { ...s, polling: false, timedOut: true } : s
          );
      }
    };
    poll(true);
  }, []);

  useEffect(() => stop, []);

  return { state, search };
}
