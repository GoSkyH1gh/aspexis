import { Dialog } from "radix-ui";
import { useQuery } from "@tanstack/react-query";
import { fetchWynncraftAbilityTree } from "../../utils/queries";
import { WynncraftCharacterInfo } from "../../client";
import LoadingIndicator from "./loadingIndicator";
import { Icon } from "@iconify/react";
import { AbilityTreePage } from "../../client";
import { useState, useRef } from "react";
import { Popover } from "radix-ui";

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
                __html: `${node.pretty_name}${node.description}`,
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
              className="ability-node ability-connector"
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
function AbilityTree({ pages }: { pages: AbilityTreePage[] }) {
  return (
    <>
      <Dialog.Close asChild>
        <button className="dialog-close wynn-ability-tree-close">
          <Icon icon={"material-symbols:close-rounded"} />
        </button>
      </Dialog.Close>
      <div className="ability-tree">
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
}: {
  character: WynncraftCharacterInfo;
  uuid: string;
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
        <Dialog.Overlay className="DialogOverlay AbilityTreeOverlay" />
        <Dialog.Content className="DialogContent AbilityTreeContent">
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
            <AbilityTree pages={wynncraftAbilityTreeQuery.data} />
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
