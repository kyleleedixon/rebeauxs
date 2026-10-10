import type { Dashboard, Status } from "@/lib/types";
import type { PillKind } from "@/components/ui";

export type Prov = { kind: PillKind; label: string; title: string };

/**
 * Every number on the page says whether it is Real or a Guess.
 *  - Inputs and tier rows carry the Sheet's own status.
 *  - Anything calculated from them is only as good as the weakest input, so it
 *    reads Guess while any input is still a guess.
 *  - Actuals come from the Log, so they are Real.
 */
export function modelProv(d: Dashboard): Prov {
  const guesses = d.derived.guessCount;
  const total = guesses + d.derived.realCount;
  if (guesses === 0) {
    return {
      kind: "real",
      label: "Real",
      title: `Calculated in the Sheet from ${total} inputs, all marked Real.`,
    };
  }
  return {
    kind: "guess",
    label: "Guess",
    title: `Calculated in the Sheet from ${total} inputs. ${guesses} of them are still marked Guess, so this number is a guess too.`,
  };
}

export const observedProv: Prov = {
  kind: "real",
  label: "Real",
  title: "Measured — fed by rows in the Log tab.",
};

export function statusProv(s: Status): Prov {
  if (s === "Real") return { kind: "real", label: "Real", title: "Marked Real in the Sheet." };
  if (s === "Guess")
    return {
      kind: "guess",
      label: "Guess",
      title: "Marked Guess in the Sheet — not measured yet.",
    };
  return {
    kind: "nodata",
    label: "Not marked",
    title: "No Real/Guess status in the Sheet for this row.",
  };
}
