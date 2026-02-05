import InfoCard from "./infoCard.js";
import { motion } from "motion/react";
import { formatISOTimestamp, formatISOToDistance } from "../../utils/utils.js";
import { HypixelFullData } from "../../client/types.gen.js";

type StatusData = {
  status: string;
};

type QuickInfoProps = {
  hypixelResponse:
    | HypixelFullData
    | null
    | "not found"
    | "not found (server error)";
  playerStatus: StatusData | null;
};

function QuickInfo({ hypixelResponse, playerStatus }: QuickInfoProps) {
  if (
    !hypixelResponse ||
    hypixelResponse === "not found" ||
    hypixelResponse === "not found (server error)"
  ) {
    return (
      <motion.div
        className="hypixel-data"
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
  return (
    <motion.div
      className="hypixel-data"
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
        className="info-card-list"
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
        <InfoCard label="Status" value={playerStatus?.status} />
        <InfoCard
          label="First seen on"
          value={formatISOTimestamp(hypixelResponse.player?.first_login)}
        />
        <InfoCard
          label="Last seen"
          value={formatISOToDistance(hypixelResponse.player?.last_login)}
          tooltip={formatISOTimestamp(hypixelResponse.player?.last_login)}
        />
        <InfoCard
          label="Hypixel rank"
          value={hypixelResponse.player?.rank || "No Rank"}
        />
        <InfoCard
          label="Hypixel guild"
          value={hypixelResponse?.guild?.name || "No guild"}
        />
      </motion.ul>
    </motion.div>
  );
}

export default QuickInfo;
