import { useEffect, useState } from "react";
import { fetchNetwork, type NetworkResponse } from "@/lib/api";

const RETRY_MS = 15_000;
const MAX_RETRIES = 20;

/**
 * Cities with live routes. If the server's route lists are incomplete (it is still
 * fetching some operators'), re-fetch periodically so pickers fill in.
 */
export function useNetwork() {
  const [data, setData] = useState<NetworkResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let tries = 0;
    const load = async () => {
      try {
        const res = await fetchNetwork(ctrl.signal);
        setData(res);
        setError(null);
        if (!res.complete && ++tries < MAX_RETRIES)
          timer = setTimeout(load, RETRY_MS);
      } catch (err: any) {
        if (ctrl.signal.aborted) return;
        setError(err.message);
        if (++tries < MAX_RETRIES) timer = setTimeout(load, RETRY_MS);
      }
    };
    load();
    return () => {
      ctrl.abort();
      clearTimeout(timer);
    };
  }, []);

  return { network: data, error };
}
