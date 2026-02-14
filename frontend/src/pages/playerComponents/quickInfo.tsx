import InfoCard from "./infoCard.js";
import { motion } from "motion/react";
import {
  formatISOTimestamp,
  formatISOToDistance,
  parseUnknownISO,
} from "../../utils/utils.js";
import {
  HypixelFullData,
  McciPlayer,
  PlayerStatus,
  WynncraftPlayerSummary,
} from "../../client/types.gen.js";
import WynncraftCharacterModal from "./wynncraftCharacterModal.js";
import { Tooltip } from "radix-ui";

type QuickInfoProps = {
  hypixelData: HypixelFullData | null | undefined;
  wynncraftData: WynncraftPlayerSummary | null | undefined;
  mcciData: McciPlayer | null | undefined;
  playerStatus: PlayerStatus | null | undefined;
  isLoading: boolean;
};

function QuickInfo({
  hypixelData,
  wynncraftData,
  mcciData,
  playerStatus,
  isLoading,
}: QuickInfoProps) {
  if (isLoading) {
    return (
      <motion.div
        className="quick-info"
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.25, ease: "easeInOut" },
          },
        }}
        initial="hidden"
        animate="show"
      >
        <h2 className="compact-heading">Quick Info</h2>

        <motion.ul
          className="info-card-list quick-info-card-list"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                duration: 0.5,
                ease: "easeInOut",
              },
            },
          }}
          initial="hidden"
          animate="show"
        >
          <InfoCard label="Last activity" value={<span>Loading...</span>} />
          <InfoCard label="First seen on" value={<span>Loading...</span>} />
        </motion.ul>
      </motion.div>
    );
  }

  if (!hypixelData && !wynncraftData && !mcciData) {
    return (
      <motion.div
        className="quick-info"
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.25, ease: "easeInOut" },
          },
        }}
        initial="hidden"
        animate="show"
      >
        <h2 className="compact-heading">There's nothing here</h2>
        <p>We couldn't find any info here.</p>
      </motion.div>
    );
  }

  function minDate(dates: (Date | null)[]) {
    const valid = dates.filter((d) => d instanceof Date);
    return valid.length === 0 ? null : valid.reduce((a, b) => (b < a ? b : a));
  }

  function maxDate(dates: (Date | null)[]) {
    const valid = dates.filter((d) => d instanceof Date);
    return valid.length === 0 ? null : valid.reduce((a, b) => (b > a ? b : a));
  }

  const hypixelFirstJoinDate = parseUnknownISO(hypixelData?.player.first_login);
  const wynncraftFirstJoinDate = parseUnknownISO(wynncraftData?.first_login);
  const mcciFirstJoinDate = parseUnknownISO(mcciData?.first_join);

  const hypixelLastJoinDate = parseUnknownISO(hypixelData?.player.last_login);
  const wynncraftLastJoinDate = parseUnknownISO(wynncraftData?.last_login);
  const mcciLastJoinDate = parseUnknownISO(mcciData?.last_join);

  const firstJoinDates = [
    hypixelFirstJoinDate,
    wynncraftFirstJoinDate,
    mcciFirstJoinDate,
  ];

  const lastJoinDates = [
    hypixelLastJoinDate,
    wynncraftLastJoinDate,
    mcciLastJoinDate,
  ];

  const firstJoinDate = minDate(firstJoinDates);
  const lastJoinDate = maxDate(lastJoinDates);

  let lastJoinServer;
  if (lastJoinDate === hypixelLastJoinDate) {
    lastJoinServer = "Hypixel";
  } else if (lastJoinDate === wynncraftLastJoinDate) {
    lastJoinServer = "Wynncraft";
  } else if (lastJoinDate === mcciLastJoinDate) {
    lastJoinServer = "Mcc Island";
  }
  const activeWynncraftCharacter = wynncraftData?.characters.find(
    (character) =>
      character.character_uuid === playerStatus?.wynncraft_character,
  );
  let lastActivityElement;
  if (playerStatus?.hypixel_online || playerStatus?.wynncraft_online) {
    if (playerStatus.wynncraft_online) {
      lastActivityElement = (
        <InfoCard
          label="Online"
          onlineIndicator={true}
          value={`Playing Wynncraft on ${playerStatus.wynncraft_server}`}
        />
      );
    } else {
      lastActivityElement = (
        <InfoCard
          label="Online"
          value={`Playing Hypixel • ${playerStatus.hypixel_game_type} • ${playerStatus.hypixel_mode}`}
          onlineIndicator={true}
        />
      );
    }
  } else {
    lastActivityElement = (
      <Tooltip.Root delayDuration={50}>
        <Tooltip.Trigger asChild>
          <li className="last-activity-card">
            <span className="info-card-label">Last activity</span>
            <br />
            <span className="info-card-value">
              {formatISOToDistance(lastJoinDate?.toISOString())}
              {lastJoinServer && <> on {lastJoinServer}</>}
            </span>
          </li>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="TooltipContent">
            {formatISOTimestamp(lastJoinDate?.toISOString())}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    );
  }

  return (
    <motion.div
      className="quick-info"
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.25, ease: "easeInOut" },
        },
      }}
      initial="hidden"
      animate="show"
    >
      <h2 className="compact-heading">Quick Info</h2>

      <motion.ul
        className="info-card-list quick-info-card-list"
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: {
              staggerChildren: 0.1,
              duration: 0.5,
              ease: "easeInOut",
            },
          },
        }}
        initial="hidden"
        animate="show"
      >
        {lastActivityElement}
        {activeWynncraftCharacter &&
          wynncraftData &&
          playerStatus?.wynncraft_online && (
            <InfoCard
              label="Online Wynncraft character"
              value={
                <div className="quick-info-character">
                  <WynncraftCharacterModal
                    character={activeWynncraftCharacter}
                    restrictions={wynncraftData.restrictions}
                    uuid={wynncraftData.uuid}
                    smallVersion={true}
                  />
                </div>
              }
            />
          )}

        <InfoCard
          label="First seen on"
          value={formatISOTimestamp(firstJoinDate?.toISOString())}
        />
      </motion.ul>
    </motion.div>
  );
}

export default QuickInfo;
