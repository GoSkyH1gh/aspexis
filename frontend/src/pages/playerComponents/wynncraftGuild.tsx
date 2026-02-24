import { motion } from "motion/react";
import InfoCard from "./infoCard";
import { formatISOTimestamp, formatValue } from "../../utils/utils";
import { useNavigate } from "react-router-dom";
import { WynncraftGuildInfo } from "../../client";

function WynncraftGuild({
  wynncraftGuildData,
}: {
  wynncraftGuildData: WynncraftGuildInfo | null;
}) {
  if (wynncraftGuildData === null) {
    return <>No Guild Data to show</>;
  }
  let navigator = useNavigate();
  const guildMemberElements = wynncraftGuildData.members.map((member) => {
    return (
      <li>
        <motion.button
          className="wynn-guild-member-item"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigator(`/player/${member.uuid}`)}
          key={member.uuid}
        >
          <div className="guild-member-flex-container">
            <img
              src={`https://minotar.net/helm/${member.uuid}/128.png`}
              className="guild-member-image"
              height="80"
              width="80"
              loading="lazy"
            />
            <div>
              <p className="em-text list-username">{member.username}</p>
              <p className="secondary-text left-align">
                {member.rank}
                <br />
                joined {formatISOTimestamp(member.joined)}
              </p>
            </div>
          </div>
        </motion.button>
      </li>
    );
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
      <p>{wynncraftGuildData.name}'s members</p>
      <ul className="wynn-guild-member-list">{guildMemberElements}</ul>
    </>
  );
}

export default WynncraftGuild;
