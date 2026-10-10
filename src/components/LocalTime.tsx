"use client";

import { useEffect, useState } from "react";

/** Renders UTC on the server, then the viewer's own timezone after mount. */
export function LocalTime({ iso }: { iso: string }) {
  const utc = new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const [text, setText] = useState(utc);

  useEffect(() => {
    try {
      setText(
        new Date(iso).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZoneName: "short",
        }),
      );
    } catch {
      setText(utc);
    }
  }, [iso, utc]);

  return <time dateTime={iso}>{text}</time>;
}
