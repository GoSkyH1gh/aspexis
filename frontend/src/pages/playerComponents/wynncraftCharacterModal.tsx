import { Dialog, Progress } from "radix-ui";
import DesktopTooltip from "../../components/desktopTooltip";
import {
  PlayerRestrictions,
  WynncraftCharacterInfo,
  WynncraftCharacterSkillPoints,
  Storyline,
  MaxContent,
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

const getDungeonUrl = (dungeon: string) => {
  const uriComponent = dungeon
    .replace("Corrupted ", "")
    .replace(" ", "_")
    .replace("-", "_")
    .replace("'s", "")
    .toLowerCase();
  return `https://cdn.wynncraft.com/nextgen/dung/${encodeURIComponent(uriComponent)}.webp`;
};
const getRaidUrl = (raid: string) =>
  `https://cdn.wynncraft.com/nextgen/raids/${encodeURIComponent(raid)}.webp`;

const getSkillPointUrl = (skill: string) =>
  `https://cdn.wynncraft.com/nextgen/skill/${encodeURIComponent(skill)}_book.svg`;

const getProfessionUrl = (profession: string) =>
  `https://cdn.wynncraft.com/nextgen/classes/professions/${profession}.webp`;

const classImageUrl =
  "https://cdn.wynncraft.com/nextgen/themes/journey/assets/classes/";

const gamemodeSortOrder = [
  "hardcore",
  "defeated_hardcore",
  "ultimate_ironman",
  "ironman",
  "craftsman",
  "hunted",
];

function CharacterGamemodes({
  character,
}: {
  character: WynncraftCharacterInfo;
}) {
  const gamemodes = character.gamemodes;
  let sortedGamemodes: string[] = [];
  gamemodeSortOrder.forEach(
    (gamemode) =>
      gamemodes.includes(gamemode) && sortedGamemodes.push(gamemode),
  );
  gamemodes.forEach(
    (gamemode) =>
      !sortedGamemodes.includes(gamemode) && sortedGamemodes.push(gamemode),
  );

  return (
    character.gamemodes.length >= 1 && (
      <div className="wynn-modes">
        {sortedGamemodes.map((gamemode) => {
          if (character.stats?.deaths) {
            if (character.stats.deaths >= 1 && gamemode == "hardcore") {
              gamemode = "defeated_hardcore";
            }
          }
          if (
            gamemode == "ironman" &&
            sortedGamemodes.includes("ultimate_ironman")
          ) {
            return;
          }

          const validGamemode = gamemode as keyof typeof modesMap;
          return (
            <DesktopTooltip
              key={gamemode}
              delayDuration={50}
              content={modeAttributeMap[validGamemode]}
            >
              <img src={modesMap[validGamemode]} className="wynn-mode" />
            </DesktopTooltip>
          );
        })}
      </div>
    )
  );
}

function StorylineCard({ storyline }: { storyline: Storyline }) {
  return (
    <DesktopTooltip
      delayDuration={150}
      content={
        <>
          {storyline.quests.map((quest) => (
            <div key={quest.name} className="wynn-storylines">
              <span className="wynn-fixed-width">
                {quest.completed ? "✓" : "×"}
              </span>{" "}
              {quest.name}
            </div>
          ))}
        </>
      }
    >
      <li className="horizontal-info-card-item wynn-storyline">
        <span className="horizontal-info-card-label">{storyline.name}</span>
        <span className="horizontal-info-card-number">
          {storyline.quests_available === storyline.quests_completed
            ? "✓"
            : storyline.quests_completed + "/" + storyline.quests_available}
        </span>
      </li>
    </DesktopTooltip>
  );
}

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
            <DesktopTooltip
              delayDuration={150}
              content={character.character_class}
            >
              <span className="wynn-custom-name">{character.nickname}</span>
            </DesktopTooltip>
          )) ||
            character.character_class}
        </p>
        {character.gamemodes.length >= 1 && (
          <CharacterGamemodes character={character} />
        )}
      </div>
    </div>
  );
}

function CharacterDetails({
  character,
  wynncraftMaxContent,
}: {
  character: WynncraftCharacterInfo;
  wynncraftMaxContent: MaxContent | null | undefined;
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
          key={profession}
          value={character.professions![validProfession].level}
          imageSrc={getProfessionUrl(profession)}
          imageAlt={profession}
          progress={character.professions![validProfession].xp_percent}
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
        <HorizontalInfoCard
          label="Wars"
          value={formatValue(character.content.wars, undefined, "Private")}
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
      <h3>Content</h3>
      <div
        className={`horizontal-info-card-item horizontal-info-card-full-width`}
      >
        <div className="wynn-progress-container">
          <div className="wynn-progress-label-container">
            <span className="horizontal-info-card-label">
              Content Completed
            </span>
            <span className="horizontal-info-card-number wynn-progress-label">
              {`${character.content.content_completed || "Private"}/${wynncraftMaxContent?.content || "?"}`}
            </span>
          </div>
          <Progress.Root
            className="ProgressRoot"
            max={wynncraftMaxContent?.content}
            value={character.content.content_completed}
          >
            <Progress.Indicator
              className="ProgressIndicator"
              style={{
                transform: `translateX(-${
                  100 -
                  ((character.content.content_completed || 0) /
                    (wynncraftMaxContent?.content || 1133)) *
                    100
                }%)`,
              }}
            />
          </Progress.Root>
        </div>
      </div>
      <ul className="horizontal-card-grid wynn-content-card-grid">
        <HorizontalInfoCard
          label="Quests"
          value={`${formatValue(
            character.content.quests_completed,
            false,
            "Private",
          )}/${wynncraftMaxContent?.quests || "?"}`}
        />
        <HorizontalInfoCard
          label="Discoveries"
          value={`${formatValue(
            character.content.discoveries,
            false,
            "Private",
          )}/${wynncraftMaxContent?.discoveries || "?"}`}
        />
        <HorizontalInfoCard
          label="Caves"
          value={`${formatValue(character.content.caves, false, "Private")}/${wynncraftMaxContent?.caves || "?"}`}
        />
        <HorizontalInfoCard
          label="World Events"
          value={`${formatValue(
            character.content.world_events,
            false,
            "Private",
          )}/${wynncraftMaxContent?.world_events || "?"}`}
        />
        <HorizontalInfoCard
          label="Lootruns"
          value={`${formatValue(
            character.content.lootruns,
            false,
            "Private",
          )}/${wynncraftMaxContent?.lootruns || "?"}`}
        />

        <HorizontalInfoCard
          label="Dungeons"
          value={`${formatValue(
            character.content.dungeons.unique_completions,
            false,
            "Private",
          )}/${wynncraftMaxContent?.dungeons || "?"}`}
        />
        <HorizontalInfoCard
          label="Raids"
          value={`${formatValue(
            character.content.raids.unique_completions,
            false,
            "Private",
          )}/${wynncraftMaxContent?.raids || "?"}`}
        />
      </ul>

      {character.professions && (
        <>
          <h3>Professions</h3>
          <ul className="profession-list">{professionElements}</ul>
        </>
      )}
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
      {Object.keys(character.content.raids.list).length > 0 && (
        <>
          <h3>Raids</h3>
          <ul className="horizontal-card-list wynn-center-list">
            {Object.entries(character.content.raids.list).map(
              ([raidName, raidCompletions]) => (
                <li className="wynn-square-card" key={raidName}>
                  <img
                    src={getRaidUrl(raidName)}
                    alt={raidName}
                    className="wynn-square-img"
                  />
                  <div>
                    <div>{raidName}</div>
                  </div>
                  <div className="wynn-dungeon-list">
                    <div>{raidCompletions}</div>
                  </div>
                </li>
              ),
            )}
          </ul>
        </>
      )}
      {Object.keys(character.content.dungeons.list).length > 0 && (
        <>
          <h3>Dungeons</h3>
          <ul className="horizontal-card-list wynn-center-list">
            {character.content.dungeons.list.map((dungeon) => (
              <li className="wynn-square-card" key={dungeon.name}>
                <img
                  src={getDungeonUrl(dungeon.name)}
                  alt={dungeon.name}
                  className="wynn-square-img"
                />
                <div>
                  <span className="wynn-em-text">{dungeon.name}</span>
                </div>
                <div className="wynn-dungeon-list">
                  {dungeon.normal_completions &&
                  dungeon.normal_completions > 0 ? (
                    <DesktopTooltip delayDuration={0} content="Normal Runs">
                      <div className="wynn-dungeon-key">
                        <Icon icon={"material-symbols:vpn-key"} />
                        {dungeon.normal_completions}
                      </div>
                    </DesktopTooltip>
                  ) : (
                    <></>
                  )}
                  {dungeon.corrupted_completions &&
                  dungeon.corrupted_completions > 0 ? (
                    <DesktopTooltip
                      delayDuration={0}
                      disableHoverableContent={true}
                      content="Corrupted Runs"
                    >
                      <div className="wynn-dungeon-key">
                        <Icon
                          icon={"material-symbols:vpn-key"}
                          color="#888888"
                        />
                        {dungeon.corrupted_completions}
                      </div>
                    </DesktopTooltip>
                  ) : (
                    <></>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {character.content.storylines && (
        <>
          <h3>Storylines</h3>
          <ul className="horizontal-card-list">
            {character.content.storylines.map((storyline) => (
              <StorylineCard key={storyline.name} storyline={storyline} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function WynncraftCharacterModal({
  character,
  uuid,
  restrictions,
  wynncraftMaxContent,
  smallVersion = false,
  renderTrigger,
}: {
  character: WynncraftCharacterInfo;
  uuid: string;
  restrictions: PlayerRestrictions;
  wynncraftMaxContent: MaxContent | null | undefined;
  smallVersion?: boolean;
  renderTrigger?: any;
}) {
  if (smallVersion) {
    return (
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            className={`wynncraft-character-item wynncraft-character-item-small`}
          >
            <p className="em-text">
              {(character.nickname && (
                <DesktopTooltip
                  delayDuration={150}
                  content={character.character_class}
                >
                  <span className="wynn-custom-name">{character.nickname}</span>
                </DesktopTooltip>
              )) ||
                character.character_class}
            </p>
            {character.gamemodes.length >= 1 && (
              <CharacterGamemodes character={character} />
            )}
            {
              <p className="secondary-text wynn-char-preview">
                Lv {character.level}
              </p>
            }
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Title asChild>{character.character_class}</Dialog.Title>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className="DialogContent wynn-char-modal">
            <div className="wynn-character-header">
              <CharacterHeader character={character} />
              <div className="wynn-header-close">
                {!restrictions.character_build_access && (
                  <WynncraftAbilityTree character={character} uuid={uuid} />
                )}
                <Dialog.Close asChild>
                  <button className="wynn-dialog-close">
                    <Icon icon={"material-symbols:close-rounded"} />
                  </button>
                </Dialog.Close>
              </div>
            </div>
            <CharacterDetails
              character={character}
              wynncraftMaxContent={wynncraftMaxContent}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <motion.button
          className={`wynncraft-character-item`}
          layout
          layoutDependency={renderTrigger}
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
        <Dialog.Title asChild>{character.character_class}</Dialog.Title>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent wynn-char-modal">
          <div className="wynn-character-header">
            <CharacterHeader character={character} />
            <div className="wynn-header-close">
              {!restrictions.character_build_access && (
                <WynncraftAbilityTree character={character} uuid={uuid} />
              )}
              <Dialog.Close asChild>
                <button className="wynn-dialog-close">
                  <Icon icon={"material-symbols:close-rounded"} />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <CharacterDetails
            character={character}
            wynncraftMaxContent={wynncraftMaxContent}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
