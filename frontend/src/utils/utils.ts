import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);

dayjs.updateLocale("en", {
  relativeTime: {
    future: "in %s",
    past: "%s ago",
    s: "a few seconds",
    m: "1 minute",
    mm: "%d minutes",
    h: "1 hour",
    hh: "%d hours",
    d: "1 day",
    dd: "%d days",
    M: "1 month",
    MM: "%d months",
    y: "1 year",
    yy: "%d years",
  },
});

function formatISOTimestamp(timestamp: string | null | undefined) {
  // Convert string to Date object
  if (!timestamp) {
    return "Unknown";
  }

  let readableDate;
  try {
    const d = dayjs(timestamp);
    if (!d.isValid()) throw new Error("Invalid date");
    readableDate = d.format("D MMM YYYY");
  } catch {
    readableDate = "Unknown";
  }

  return readableDate;
}

const formatValue = (
  value: number | null | undefined,
  compact = true,
  fallbackValue = "Unknown",
) => {
  if (value === null || value === undefined) {
    return fallbackValue;
  } else {
    if (compact) {
      return value.toLocaleString("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      });
    } else {
      return value;
    }
  }
};

const formatISOToDistance = (isoDate: string | null | undefined) => {
  if (!isoDate) {
    return "Unknown";
  }
  try {
    const d = dayjs(isoDate);
    if (!d.isValid()) throw new Error("Invalid date");
    return d.fromNow();
  } catch (error) {
    console.error("Error parsing ISO date:", error);
    return "Unknown";
  }
};

const formatSinceLastUpdate = (date: Date, _tick: number) => {
  if (!date) {
    return "unknown";
  }
  const seconds = dayjs().diff(date, "second");
  if (seconds < 60) {
    return `updated ${seconds} second${seconds !== 1 ? "s" : ""} ago`;
  }
  return "updated " + dayjs(date).fromNow();
};

const formatLogTime = (date: Date) => {
  if (!date) {
    return "unknown";
  }
  return dayjs(date).format("hh:mm A");
};

function toProperCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

const parseUnknownISO = (str: string | null | undefined) => {
  if (!str) {
    return null;
  } else {
    const d = dayjs(str);
    return d.isValid() ? d.toDate() : null;
  }
};

export {
  formatISOTimestamp,
  formatValue,
  formatSinceLastUpdate,
  formatLogTime,
  formatISOToDistance,
  toProperCase,
  parseUnknownISO,
};

import { useState } from "react";

export function useStaticInfiniteQuery<T>(allItems: T[], pageSize: number) {
  const [pageCount, setPageCount] = useState(1);

  const pages = Array.from({ length: pageCount }, (_, i) =>
    allItems.slice(i * pageSize, (i + 1) * pageSize),
  );

  const hasNextPage = pageCount * pageSize < allItems.length;

  return {
    data: { pages },
    hasNextPage,
    isFetchingNextPage: false,
    fetchNextPage: () => {
      if (hasNextPage) {
        setPageCount((prev) => prev + 1);
      }
    },
  };
}
