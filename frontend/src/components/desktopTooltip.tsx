import { ReactNode, useSyncExternalStore } from "react";
import { Tooltip } from "radix-ui";

let isTouchCache = false;

// Initialize cache if window exists
if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(pointer: coarse), (hover: none)");
  isTouchCache = mediaQuery.matches;

  mediaQuery.addEventListener("change", (e) => {
    isTouchCache = e.matches;
    emitChange();
  });
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function getSnapshot() {
  return isTouchCache;
}

/* eslint-disable react-refresh/only-export-components */
export function useIsTouchDevice() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export default function DesktopTooltip({
  children,
  content,
  delayDuration = 150,
  disableHoverableContent = false,
  asChild = true,
}: {
  children: ReactNode;
  content: ReactNode;
  delayDuration?: number;
  disableHoverableContent?: boolean;
  asChild?: boolean;
}) {
  const isTouch = useIsTouchDevice();

  if (isTouch) {
    return <>{children}</>;
  }

  return (
    <Tooltip.Root
      delayDuration={delayDuration}
      disableHoverableContent={disableHoverableContent}
    >
      <Tooltip.Trigger asChild={asChild}>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content className="TooltipContent">{content}</Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
