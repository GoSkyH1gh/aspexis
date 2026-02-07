import { Dialog, Tooltip } from "radix-ui";
import {
  PlayerRestrictions,
  WynncraftCharacterInfo,
  WynncraftCharacterSkillPoints,
} from "../../client";
import { motion } from "motion/react";
import { toProperCase, formatValue } from "../../utils/utils";
import { Icon } from "@iconify/react";
import HorizontalInfoCard from "./horizontalInfoCard";
import WynncraftAbilityTree from "./wynncraftAbilityTree";

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

const skillPointSkills = [
  "strength",
  "dexterity",
  "intelligence",
  "defense",
  "agility",
];

const getSkillPointUrl = (skill: string) =>
  `https://cdn.wynncraft.com/nextgen/skill/${encodeURIComponent(skill)}_book.svg`;

const getProfessionUrl = (profession: string) =>
  `https://cdn.wynncraft.com/nextgen/classes/professions/${profession}.webp`;

const classImageUrl =
  "https://cdn.wynncraft.com/nextgen/themes/journey/assets/classes/";

function CharacterHeader({ character }: { character: WynncraftCharacterInfo }) {
  return (
    <div className="wynn-character-row">
      <img
        src={classImageUrl + character.character_class.toLowerCase() + ".webp"}
        alt={character.character_class}
        className="wynn-character-icon"
      />
      <div className="wynn-classname-c">
        <p className="em-text">
          {(character.nickname && (
            <Tooltip.Root delayDuration={150}>
              <Tooltip.Trigger asChild>
                <span className="wynn-custom-name">{character.nickname}</span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="TooltipContent">
                  {character.character_class}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )) ||
            character.character_class}
        </p>
        {character.gamemodes.length >= 1 && (
          <div className="wynn-modes">
            {character.gamemodes.sort().map((gamemode) => {
              if (character.stats?.deaths) {
                if (character.stats.deaths >= 1 && gamemode == "hardcore") {
                  gamemode = "defeated_hardcore";
                }
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

function CharacterDetails({
  character,
}: {
  character: WynncraftCharacterInfo;
}) {
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
  let professionElements = null;
  if (character.professions) {
    professionElements = professionList.map((profession) => {
      const validProfession = profession as keyof typeof character.professions;
      return (
        <HorizontalInfoCard
          label={toProperCase(profession)}
          value={character.professions![validProfession]}
          imageSrc={getProfessionUrl(profession)}
          imageAlt={profession}
        />
      );
    });
  }

  return (
    <>
      <h3>Stats</h3>
      <ul className="horizontal-card-list">
        <HorizontalInfoCard
          label="Level"
          value={formatValue(character.level, undefined, "Private")}
        />
        <HorizontalInfoCard
          label="Playtime"
          value={`${formatValue(character.playtime, undefined, "Private")} hours`}
        />
        <HorizontalInfoCard
          label="Logged In"
          value={`${formatValue(character.stats.logins, undefined, "Private")} times`}
        />
        <HorizontalInfoCard
          label="Deaths"
          value={formatValue(character.stats.deaths, undefined, "Private")}
        />
        <HorizontalInfoCard
          label="Mobs Killed"
          value={formatValue(character.stats.mobs_killed, undefined, "Private")}
        />
        <HorizontalInfoCard
          label="Chests Opened"
          value={formatValue(
            character.stats.chests_opened,
            undefined,
            "Private",
          )}
        />
        <HorizontalInfoCard
          label="Blocks Walked"
          value={formatValue(
            character.stats.blocks_walked,
            undefined,
            "Private",
          )}
        />
      </ul>
      <h3>Content</h3>
      <div className="wynn-content-container">
        <ul className="horizontal-card-list">
          <HorizontalInfoCard
            label="Content Completed"
            value={formatValue(
              character.content.content_completed,
              false,
              "Private",
            )}
          />
          <HorizontalInfoCard
            label="Quests Completed"
            value={formatValue(
              character.content.quests_completed,
              undefined,
              "Private",
            )}
          />
          <HorizontalInfoCard
            label="Discoveries"
            value={formatValue(
              character.content.discoveries,
              undefined,
              "Private",
            )}
          />
          <HorizontalInfoCard
            label="Caves"
            value={formatValue(character.content.caves, undefined, "Private")}
          />
          <HorizontalInfoCard
            label="World Events"
            value={formatValue(
              character.content.world_events,
              undefined,
              "Private",
            )}
          />
        </ul>

        <ul className="horizontal-card-list">
          <HorizontalInfoCard
            label="Lootruns"
            value={formatValue(
              character.content.lootruns,
              undefined,
              "Private",
            )}
          />
          <HorizontalInfoCard
            label="Wars"
            value={formatValue(character.content.wars, undefined, "Private")}
          />
          <HorizontalInfoCard
            label="Dungeons"
            value={formatValue(
              character.content.dungeons.total,
              undefined,
              "Private",
            )}
          />
          <HorizontalInfoCard
            label="Raids"
            value={formatValue(
              character.content.raids.total,
              undefined,
              "Private",
            )}
          />
        </ul>
      </div>
      {character.skill_points && (
        <>
          <h3>Skill Points</h3>
          <div className="horizontal-info-card-container">
            {skillPointSkills.map((skill) => (
              <HorizontalInfoCard
                label={toProperCase(skill)}
                value={
                  character.skill_points![
                    skill as keyof WynncraftCharacterSkillPoints
                  ]
                }
                imageSrc={getSkillPointUrl(skill)}
                imageAlt={skill + "skill"}
              />
            ))}
          </div>
        </>
      )}
      {character.professions && (
        <>
          <h3>Professions</h3>
          <ul className="profession-list">{professionElements}</ul>
        </>
      )}
    </>
  );
}

export default function WynncraftCharacterModal({
  character,
  uuid,
  restrictions,
}: {
  character: WynncraftCharacterInfo;
  uuid: string;
  restrictions: PlayerRestrictions;
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
                Level {character.level}
                {character.playtime &&
                  ` • Played for ${character.playtime} hours`}
              </p>
            }
          </div>
        </motion.button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Title />
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent wynn-char-modal">
          <div className="skin-viewer-header">
            <CharacterHeader character={character} />
            <div className="wynn-header-close">
              {!restrictions.character_build_access && (
                <WynncraftAbilityTree character={character} uuid={uuid} />
              )}
              <Dialog.Close asChild>
                <button className="dialog-close">
                  <Icon icon={"material-symbols:close-rounded"} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <CharacterDetails character={character} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
