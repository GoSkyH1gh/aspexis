import { useRef, useState } from "react";
import { Popover } from "radix-ui";
import type { AbilityTreeNode } from "../../../client";

function stripHtmlToText(html: string | null): string {
  if (!html) {
    return "";
  }

  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function sanitizeWynnTooltipHtml(html: string | null): string {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return stripHtmlToText(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) {
    return "";
  }

  const allowedTags = new Set(["span", "br"]);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const toReplace: Element[] = [];

  while (walker.nextNode()) {
    const current = walker.currentNode as Element;
    if (!allowedTags.has(current.tagName.toLowerCase())) {
      toReplace.push(current);
      continue;
    }

    const attrs = Array.from(current.attributes);
    attrs.forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name !== "class" && name !== "style") {
        current.removeAttribute(attribute.name);
      }
    });

    const styleValue = current.getAttribute("style");
    if (styleValue) {
      const sanitizedStyle = styleValue
        .split(";")
        .map((rule) => rule.trim())
        .filter(Boolean)
        .filter((rule) => {
          const [prop, value = ""] = rule.split(":");
          const key = prop?.trim().toLowerCase();
          const val = value.trim().toLowerCase();
          if (!key) return false;
          if (val.includes("url(") || val.includes("expression(")) return false;

          return (
            key === "color" ||
            key === "font-weight" ||
            key === "margin-left" ||
            key === "text-decoration"
          );
        })
        .join("; ");

      if (sanitizedStyle) {
        current.setAttribute("style", sanitizedStyle);
      } else {
        current.removeAttribute("style");
      }
    }
  }

  toReplace.forEach((element) => {
    const textNode = doc.createTextNode(element.textContent ?? "");
    element.replaceWith(textNode);
  });

  return root.innerHTML;
}

function HomeHoverableAbilityNode({ node }: { node: AbilityTreeNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = isHovered || isClicked;

  const handleMouseEnter = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    hoverTimeout.current = setTimeout(() => setIsHovered(true), 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }

    setIsHovered(false);
  };

  return (
    <div
      className="home-tree-node home-tree-node--ability"
      style={{
        gridColumn: node.x,
        gridRow: node.y,
      }}
    >
      <Popover.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIsHovered(false);
            setIsClicked(false);
          }
        }}
      >
        <Popover.Trigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={stripHtmlToText(node.pretty_name).split("\n")[0]}
            onMouseDown={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsClicked((value) => !value);
              }
            }}
          >
            <img
              src={node.icon_url}
              alt=""
              draggable={false}
              aria-hidden="true"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={(event) => {
                event.preventDefault();
                setIsClicked((value) => !value);
              }}
            />
          </div>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            side="top"
            sideOffset={5}
            className="TooltipContent AbilityTreeTooltip home-ability-tree-tooltip"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <div className="wynn-description home-ability-tree-tooltip__content">
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeWynnTooltipHtml(
                    `${node.pretty_name ?? ""}<br>${node.description ?? ""}`,
                  ),
                }}
              />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

export { HomeHoverableAbilityNode };
