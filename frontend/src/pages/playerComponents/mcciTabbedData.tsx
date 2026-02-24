import InfoCard from "./infoCard";
import {
  formatValue,
  formatISOTimestamp,
  formatISOToDistance,
} from "../../utils/utils";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { McciPlayer } from "../../client";

function McciTabbedData({
  mcciData,
}: {
  mcciData: McciPlayer | null | undefined;
}) {
  let navigator = useNavigate();
  if (!mcciData) {
    return <p>No MCC Island data to show</p>;
  }
  const friendElements = mcciData?.friends.map((friend) => (
    <li>
      <motion.button
        className="wynn-guild-member-item"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigator(`/player/${friend.username}`)}
        key={friend.uuid}
      >
        <div className="guild-member-flex-container">
          <img
            src={`https://minotar.net/helm/${friend.uuid}/128.png`}
            className="guild-member-image"
            height="80"
            width="80"
            loading="lazy"
          />
          <div>
            <p className="em-text list-username">{friend.username}</p>
            <p className="secondary-text left-align">
              {friend.rank || "No Rank"}
            </p>
          </div>
        </div>
      </motion.button>
    </li>
  ));

  return (
    <>
      <ul className="info-card-list">
        <InfoCard
          label="Status"
          value={mcciData.online ? "Online" : "Offline"}
        />
        <InfoCard
          label="First Login"
          value={formatISOTimestamp(mcciData.first_join)}
        />
        <InfoCard
          label="Last Login"
          value={formatISOToDistance(mcciData.last_join)}
          tooltip={
            (mcciData.last_join && formatISOTimestamp(mcciData.last_join)) ||
            null
          }
        />
        <InfoCard label="Rank" value={mcciData.rank ?? "No Rank"} />
        <InfoCard
          label="Subscribed to Plus"
          value={mcciData.plus_subscribed ? "True" : "False"}
        />
      </ul>
      <h3>Stats</h3>
      {mcciData?.stats && (
        <>
          <ul className="info-card-list">
            <InfoCard
              label="Level"
              value={formatValue(mcciData.stats.level, false)}
            />
            <InfoCard
              label="Trophies"
              value={
                formatValue(mcciData.stats.trophies) +
                "/" +
                formatValue(mcciData.stats.max_trophies)
              }
            />
          </ul>
          <ul className="info-card-list">
            <InfoCard label="Coins" value={formatValue(mcciData.stats.coins)} />
            <InfoCard
              label="ANGLR Tokens"
              value={formatValue(mcciData.stats.anglr_token)}
            />
            <InfoCard
              label="Royal Reputation"
              value={formatValue(mcciData.stats.royal_reputation)}
            />
          </ul>
        </>
      )}
      {!mcciData?.stats && <p>No stats available for this player.</p>}

      {mcciData?.friends.length != 0 && (
        <>
          <h3>{mcciData?.username}'s friends</h3>
          <ul className="wynn-guild-member-list">{friendElements}</ul>
        </>
      )}
    </>
  );
}

export default McciTabbedData;
