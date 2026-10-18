import { useState } from "react";
import { useLocation } from "wouter";
import { useNear } from "@/hooks/useNear";
import { useNetwork } from "@/hooks/useNetwork";
import { lagosDate } from "@/lib/format";
import { cityOf } from "@/lib/places";
import { lastSearch, rememberSearch, resultsPath } from "@/lib/routes";
import { SearchForm, type SearchValues } from "./SearchForm";

function initialValues(): SearchValues {
  const last = lastSearch();
  return {
    from: last.from ?? "lagos",
    to: last.to ?? null,
    date: last.date && last.date >= lagosDate() ? last.date : lagosDate(1),
  };
}

/** The bus search form. Compare opens the results on their own page. */
export function BusPanel() {
  const { network, error: networkError } = useNetwork();
  const [values, setValues] = useState<SearchValues>(initialValues);
  const { nearFor, setNear } = useNear();
  const [, navigate] = useLocation();

  const submit = () => {
    if (!values.from || !values.to) return;
    const q = { from: values.from, to: values.to, date: values.date };
    rememberSearch(q);
    navigate(resultsPath(q));
    window.scrollTo(0, 0);
  };

  return (
    <SearchForm
      network={network}
      networkError={networkError}
      values={values}
      onChange={setValues}
      onSubmit={submit}
      busy={false}
      near={nearFor(cityOf(values.from))}
      onNearChange={n => {
        const city = cityOf(values.from);
        if (city) setNear(city, n);
      }}
    />
  );
}
