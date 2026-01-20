import { Dialog, Tooltip } from "radix-ui";
import { CharacterInfo } from "../../client";
import { motion } from "motion/react";
import InfoCard from "./infoCard";
import { toProperCase, formatValue } from "../../utils/utils";
import { Icon } from "@iconify/react";

const modesMap = {
  ironman: "https://cdn.wynncraft.com/nextgen/badges/ironman.svg",
  ultimate_ironman:
    "https://cdn.wynncraft.com/nextgen/badges/ultimate_ironman.svg",
  hardcore: "https://cdn.wynncraft.com/nextgen/badges/hardcore.svg",
  defeated_hardcore: "https://cdn.wynncraft.com/nextgen/badges/dd_hardcore.svg",
  craftsman: "https://cdn.wynncraft.com/nextgen/badges/craftsman.svg",
  hunted: "https://cdn.wynncraft.com/nextgen/badges/hunted.svg",
};

const modeAttributeMap = {
  ironman: "Ironman",
  ultimate_ironman: "Ultimate Ironman",
  hardcore: "Hardcore",
  defeated_hardcore: "Defeated Hardcore",
  craftsman: "Craftsman",
  hunted: "Hunted",
};

const classImageUrl =
  "https://cdn.wynncraft.com/nextgen/themes/journey/assets/classes/";

function CharacterHeader({ character }: { character: CharacterInfo }) {
  return (
    <div className="wynn-character-row">
      <motion.img
        src={classImageUrl + character.character_class.toLowerCase() + ".webp"}
        alt={character.character_class}
        className="wynn-character-icon"
      />
      <div className="wynn-classname-c">
        <p className="em-text">{character.character_class}</p>
        {character.gamemodes.length >= 1 && (
          <div className="wynn-modes">
            {character.gamemodes.sort().map((gamemode) => {
              if (character.deaths >= 1 && gamemode == "hardcore") {
                gamemode = "defeated_hardcore";
              }
              if (
                gamemode == "ironman" &&
                character.gamemodes.includes("ultimate_ironman")
              ) {
                return;
              }

              const validGamemode = gamemode as keyof typeof modesMap;
              return (
                <Tooltip.Root delayDuration={50}>
                  <Tooltip.Trigger asChild>
                    <img src={modesMap[validGamemode]} className="wynn-mode" />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content className="TooltipContent">
                      {modeAttributeMap[validGamemode]}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CharacterDetails({ character }: { character: CharacterInfo }) {
  const professionList = [
    "fishing",
    "woodcutting",
    "mining",
    "farming",
    "scribing",
    "jeweling",
    "alchemism",
    "cooking",
    "weaponsmithing",
    "tailoring",
    "woodworking",
    "armouring",
  ];
  const professionElements = professionList.map((profession) => {
    const validProfession = profession as keyof typeof character.professions;
    return (
      <InfoCard
        key={profession}
        label={toProperCase(profession)}
        value={character.professions[validProfession]}
      />
    );
  });
  return (
    <>
      <h3>Stats</h3>
      <ul className="info-card-list">
        <InfoCard label="Level" value={formatValue(character.level)} />
        <InfoCard label="Playtime" value={`${formatValue(character.playtime)} hours`} />
        <InfoCard
          label="Logged In"
          value={`${formatValue(character.logins)} times`}
        />
        <InfoCard label="Deaths" value={formatValue(character.deaths)} />
        <InfoCard
          label="Mobs Killed"
          value={formatValue(character.mobs_killed)}
        />
        <InfoCard
          label="Chests Opened"
          value={formatValue(character.chests_opened)}
        />
        <InfoCard
          label="Quests Completed"
          value={formatValue(character.quests_completed)}
        />
      </ul>
      <h3>Professions</h3>
      <ul className="profession-list">{professionElements}</ul>
    </>
  );
}

export default function WynncraftCharacterModal({
  character,
}: {
  character: CharacterInfo;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <motion.button
          className={`wynncraft-character-item`}
          layout
          initial="initial"
          whileHover="hover"
          transition={{
            type: "spring",
            damping: 60,
            stiffness: 500,
            duration: 0.5,
          }}
        >
          <div>
            <CharacterHeader character={character} />
            {
              <p className="secondary-text wynn-char-preview">
                Level {character.level} • Played for {character.playtime} hours
              </p>
            }
          </div>
        </motion.button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent wynn-char-modal">
          <div className="skin-viewer-header">
          <CharacterHeader character={character} /><Dialog.Close asChild>
            <button className="dialog-close">
              <Icon icon={"material-symbols:close-rounded"} />
            </button>
          </Dialog.Close></div>
          <CharacterDetails character={character} />
          
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
