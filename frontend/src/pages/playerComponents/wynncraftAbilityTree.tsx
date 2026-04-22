import { Dialog } from "radix-ui";
import { useQuery } from "@tanstack/react-query";
import { fetchWynncraftAbilityTree } from "../../utils/queries";
import { WynncraftCharacterInfo } from "../../client";
import LoadingIndicator from "./loadingIndicator";
import { Icon } from "@iconify/react";
import { AbilityTreePage } from "../../client";
import { useState, useRef } from "react";
import { Popover } from "radix-ui";
import { downloadElementScreenshot } from "../../utils/screenshot";
import { useToast } from "../../components/ToastProvider";

const ROWS_PER_PAGE = 6;

function HoverableAbilityNode({ node, row }: { node: any; row: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = isHovered || isClicked;

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setIsHovered(true), 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsHovered(false);
  };

  return (
    <div
      className={`ability-node ${node.icon_id.split(".")[1]}`}
      style={{
        gridColumn: node.x,
        gridRow: row,
      }}
    >
      <Popover.Root
        open={open}
        onOpenChange={(o) => {
          if (!o) {
            setIsHovered(false);
            setIsClicked(false);
          }
        }}
      >
        <Popover.Trigger asChild>
          <img
            src={node.icon_url}
            alt={node.name}
            draggable={false}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
              e.preventDefault();
              setIsClicked(!isClicked);
            }}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            sideOffset={5}
            className="TooltipContent AbilityTreeTooltip"
          >
            <div
              className="wynn-description"
              dangerouslySetInnerHTML={{
                __html: `${node.pretty_name}<br>${node.description}`,
              }}
            ></div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function toLocalRow(globalY: number, pageNumber: number): number {
  const row = globalY - (pageNumber - 1) * ROWS_PER_PAGE;

  if (row < 1 || row > ROWS_PER_PAGE) {
    console.warn(
      `Node y=${globalY} on page ${pageNumber} maps to row ${row} (out of bounds)`,
    );
  }

  return row;
}
function AbilityPage({ page }: { page: AbilityTreePage }) {
  return (
    <div className="ability-page">
      {page.nodes.map((node) => {
        const row = toLocalRow(node.y, page.page_number);
        if (node.node_type == "connector") {
          return (
            <div
              key={node.node_id}
              className={`ability-node ability-connector ${node.unlocked ? "ability-connector-active" : ""}`}
              style={{
                gridColumn: node.x,
                gridRow: row,
              }}
            >
              <img src={node.icon_url} alt={node.name} draggable={false} />
            </div>
          );
        }
        if (node.node_type == "ability" && node.description) {
          return (
            <HoverableAbilityNode key={node.node_id} node={node} row={row} />
          );
        }
      })}
    </div>
  );
}
function AbilityTree({
  pages,
  characterClass,
  playerName,
}: {
  pages: AbilityTreePage[];
  characterClass: string;
  playerName: string;
}) {
  const treeRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const { addToast } = useToast();

  const handleScreenshot = async () => {
    if (!treeRef.current) {
      addToast({
        message: "Screenshot failed: tree element not found.",
        type: "error",
      });
      return;
    }
    if (isCapturing) return;

    setIsCapturing(true);
    treeRef.current.classList.add("wynn-no-animation");

    // Crucial: We must yield to the browser's event loop for ~50ms!
    // html-to-image is highly CPU intensive and locks the Javascript main thread instantly.
    // Easing here guarantees React is allowed to render the spinner state FIRST.
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const date = new Date();
      const shortYear = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hour = date.getHours().toString().padStart(2, "0");
      const minute = date.getMinutes().toString().padStart(2, "0");

      const filename = `tree-${playerName}-${characterClass}-${shortYear}-${month}-${day}-${hour}-${minute}.png`;

      await downloadElementScreenshot(treeRef.current, filename);
      addToast({
        message: "Screenshot saved successfully!",
        type: "success",
      });
    } catch (e: any) {
      console.error(e);
      addToast({
        message: `Screenshot Error: ${e.message || "Unknown error"}`,
        type: "error",
      });
    } finally {
      treeRef.current?.classList.remove("wynn-no-animation");
      setIsCapturing(false);
    }
  };

  return (
    <>
      <div className="wynn-ability-tree-header">
        <span className="wynn-ability-tree-title">
          {playerName}'s{" "}
          {characterClass.charAt(0).toUpperCase() + characterClass.slice(1)}
        </span>
        <button
          className="dialog-close wynn-ability-tree-btn"
          onClick={handleScreenshot}
          disabled={isCapturing}
          title="Save Screenshot"
        >
          {isCapturing && (
            <svg className="wynn-screenshot-spinner" viewBox="0 0 48 48">
              <circle
                cx="24"
                cy="24"
                r="14"
                stroke="#f3f3f7"
                strokeWidth="2"
                strokeDasharray="20 100"
                fill="none"
                strokeLinecap="round"
                className="wynn-screenshot-spinner-circle"
              />
            </svg>
          )}
          <span
            className={
              isCapturing
                ? "wynn-screenshot-icon capturing"
                : "wynn-screenshot-icon"
            }
          >
            <Icon icon="material-symbols:download-rounded" />
          </span>
        </button>
        <Dialog.Close asChild>
          <button className="dialog-close wynn-ability-tree-btn">
            <Icon icon={"material-symbols:close-rounded"} />
          </button>
        </Dialog.Close>
      </div>
      <div className="ability-tree" ref={treeRef}>
        {pages.map((page) => (
          <AbilityPage page={page} key={page.page_number} />
        ))}
      </div>
    </>
  );
}

function WynncraftAbilityTree({
  character,
  uuid,
  playerName,
}: {
  character: WynncraftCharacterInfo;
  uuid: string;
  playerName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wynncraftAbilityTreeQuery = useQuery({
    queryKey: ["wynncraft_ability_tree", character.character_uuid],
    queryFn: () =>
      fetchWynncraftAbilityTree(
        uuid,
        character.character_uuid,
        character.character_class.toLowerCase(),
      ),
    enabled: isOpen,
  });

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger asChild>
        <button className="wynn-ability-tree-open">Open Ability Tree</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="AbilityTreeOverlay" />
        <Dialog.Content className="AbilityTreeContent">
          {wynncraftAbilityTreeQuery.isLoading && (
            <>
              <Dialog.Close asChild>
                <button className="dialog-close wynn-ability-tree-close">
                  <Icon icon={"material-symbols:close-rounded"} />
                </button>
              </Dialog.Close>
              <div className="wynn-ability-tree-loading">
                <LoadingIndicator />
              </div>
            </>
          )}
          {wynncraftAbilityTreeQuery.data && (
            <AbilityTree
              pages={wynncraftAbilityTreeQuery.data}
              characterClass={character.character_class.toLowerCase()}
              playerName={playerName ?? ""}
            />
          )}
          {wynncraftAbilityTreeQuery.isError && (
            <>
              <Dialog.Close asChild>
                <button className="dialog-close wynn-ability-tree-close">
                  <Icon icon={"material-symbols:close-rounded"} />
                </button>
              </Dialog.Close>
              <div className="wynn-ability-tree-loading">
                Ability Tree could not be loaded.
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default WynncraftAbilityTree;
