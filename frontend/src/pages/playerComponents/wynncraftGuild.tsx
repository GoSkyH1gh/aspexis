import { useState } from "react";
import { motion } from "motion/react";
import InfoCard from "./infoCard";
import { formatISOTimestamp, formatValue } from "../../utils/utils";
import { Link } from "react-router-dom";
import { ToggleGroup } from "radix-ui";
import { WynncraftGuildInfo } from "../../client";

function WynncraftGuild({
  wynncraftGuildData,
}: {
  wynncraftGuildData: WynncraftGuildInfo | null;
}) {
  const [displayMode, setDisplayMode] = useState<"card" | "list">("card");

  if (wynncraftGuildData === null) {
    return <>No Guild Data to show</>;
  }

  const guildMemberElements = wynncraftGuildData.members.map((member) => {
    if (displayMode === "card") {
      return (
        <li key={`${member.uuid}:card`}>
          <Link
            to={`/player/${member.uuid}`}
            className="guild-list-item-container"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.1, ease: "easeInOut" }}
              className="guild-list-item"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1 },
              }}
              tabIndex={-1}
            >
              <div className="guild-member-flex-container">
                <img
                  src={`https://minotar.net/helm/${member.uuid}/128.png`}
                  className="guild-member-image"
                  alt={`head of ${member.username}'s skin`}
                  loading="lazy"
                />
                <div className="guild-member-item-card">
                  <div>
                    <p className="list-username">{member.username}</p>
                    <p className="list-rank">{member.rank}</p>
                  </div>

                  <p className="list-uuid">
                    Joined {formatISOTimestamp(member.joined)}
                  </p>
                </div>
              </div>
            </motion.div>
          </Link>
        </li>
      );
    }
    if (displayMode === "list") {
      return (
        <li key={`${member.uuid}:list`}>
          <Link
            to={`/player/${member.uuid}`}
            className="guild-list-item-container"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.1, ease: "easeInOut" }}
              className="hypixel-guild-list-item-list"
              variants={{
                hidden: { opacity: 0 },
                show: { opacity: 1 },
              }}
            >
              <div className="hypixel-guild-list-member-primary">
                <img
                  src={`https://minotar.net/helm/${member.uuid}/128.png`}
                  className="guild-member-image guild-member-image-list"
                  alt={`head of ${member.username}'s skin`}
                  loading="lazy"
                />
                <div className="flex">
                  <p className="list-username">{member.username}</p>
                  <p className="list-rank">{member.rank}</p>
                </div>
              </div>
              <p className="list-date-joined">
                Joined {formatISOTimestamp(member.joined)}
              </p>
            </motion.div>
          </Link>
        </li>
      );
    }
  });

  return (
    <>
      <ul className="info-card-list">
        <InfoCard label="Level" value={wynncraftGuildData.level} />
        <InfoCard label="Wars" value={formatValue(wynncraftGuildData.wars)} />
        <InfoCard
          label="Territories held"
          value={formatValue(wynncraftGuildData.territories)}
        />
        <InfoCard
          label="Created on"
          value={formatISOTimestamp(wynncraftGuildData.created)}
        />
        <InfoCard
          label="Member count"
          value={formatValue(wynncraftGuildData.member_count)}
        />
      </ul>

      <div className="hypixel-guild-members-heading">
        <h3>{wynncraftGuildData.name}'s members</h3>
        <div className="flex">
          Display as
          <ToggleGroup.Root
            type="single"
            value={displayMode}
            onValueChange={(value) => {
              if (value) setDisplayMode(value as "card" | "list");
            }}
            className="select-container"
          >
            <ToggleGroup.Item
              value="card"
              className={`select-button-left select-button ${displayMode === "card" && "select-button-active"}`}
            >
              Card
            </ToggleGroup.Item>
            <ToggleGroup.Item
              value="list"
              className={`select-button-right select-button ${displayMode === "list" && "select-button-active"}`}
            >
              List
            </ToggleGroup.Item>
          </ToggleGroup.Root>
        </div>
      </div>
      <ul
        className={`guild-list ${displayMode === "card" ? "guild-list-card" : "guild-list-list"}`}
      >
        {guildMemberElements}
      </ul>
    </>
  );
}

export default WynncraftGuild;
