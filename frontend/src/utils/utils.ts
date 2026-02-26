import { format, parseISO, formatDistanceToNowStrict } from "date-fns";

function formatISOTimestamp(timestamp: string | null | undefined) {
  // Convert string to Date object
  if (!timestamp) {
    return "Unknown";
  }

  let readableDate;
  let date;
  try {
    date = parseISO(timestamp);
    readableDate = format(date, "d MMM yyyy");
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
    const date = parseISO(isoDate);
    return formatDistanceToNowStrict(date, { addSuffix: true });
  } catch (error) {
    console.error("Error parsing ISO date:", error);
    return "Unknown";
  }
};

const formatSinceLastUpdate = (date: Date) => {
  if (!date) {
    return "unknown";
  }
  return "updated " + formatDistanceToNowStrict(date) + " ago";
};

const formatLogTime = (date: Date) => {
  if (!date) {
    return "unknown";
  }
  return format(date, "KK:mm a");
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
    return parseISO(str);
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
