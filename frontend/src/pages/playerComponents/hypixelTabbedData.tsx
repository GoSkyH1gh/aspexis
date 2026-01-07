import InfoCard from "./infoCard";
import { formatValue, handleStatClick } from "../../utils/utils";
import { Dialog } from "radix-ui";
import "./dialog.css";
import { toProperCase } from "../../utils/utils";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useState } from "react";
import BedwarsHeroIcon from "/src/assets/bedwars.png";
import {
  HypixelFullData,
  HypixelGuildMemberFull,
  BedwarsProfile,
} from "../../client";
import DistributionChartWrapper from "./distributionChartWrapper";
import { Icon } from "@iconify/react";

type HypixelDataProps = {
  hypixelData: HypixelFullData;
  hypixelGuildData: HypixelGuildMemberFull[] | null;
  hypixelGuildPage: number;
  setHypixelGuildPage: React.Dispatch<React.SetStateAction<number>>;
  hypixelGuildLoading: boolean;
};

function HypixelTabbedData({
  hypixelData,
  hypixelGuildData,
  hypixelGuildPage,
  setHypixelGuildPage,
  hypixelGuildLoading,
}: HypixelDataProps) {
  const [metricData, setMetricData] = useState(null);
  return (
    <>
      <h3>Global Stats</h3>
      <ul className="info-card-list">
        <InfoCard
          label="Level"
          hasStats={true}
          onClick={() =>
            handleStatClick(
              "hypixel_level",
              hypixelData.player.uuid,
              setMetricData
            )
          }
          value={formatValue(hypixelData.player.network_level)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Karma"
          hasStats={true}
          onClick={() =>
            handleStatClick(
              "hypixel_karma",
              hypixelData.player.uuid,
              setMetricData
            )
          }
          value={formatValue(hypixelData.player.karma)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Achievement Points"
          hasStats={true}
          onClick={() =>
            handleStatClick(
              "hypixel_achievement_points",
              hypixelData.player.uuid,
              setMetricData
            )
          }
          value={formatValue(hypixelData.player.achievement_points)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
      </ul>
      <h3>Game Stats</h3>
      <HypixelBedwarsPopup bedwarsData={hypixelData.player.bedwars} />
      {hypixelData?.guild && (
        <HypixelGuild
          hypixelData={hypixelData}
          hypixelGuildData={hypixelGuildData}
          hypixelGuildPage={hypixelGuildPage}
          setHypixelGuildPage={setHypixelGuildPage}
          hypixelGuildLoading={hypixelGuildLoading}
        />
      )}
    </>
  );
}

function HypixelBedwarsPopup({ bedwarsData }: { bedwarsData: BedwarsProfile }) {
  const stats_to_map = [
    "games_played",
    "winstreak",
    "wins",
    "losses",
    "winn_loss_ratio",
    "kills",
    "deaths",
    "kill_death_ratio",
    "final_kills",
    "final_deaths",
    "final_kill_death_ratio",
    "beds_broken",
    "beds_lost",
    "bed_broken_lost_ratio",
    "items_purchased",
    "resources_collected",
    "iron_collected",
    "gold_collected",
    "diamonds_collected",
    "emeralds_collected",
  ];

  const winrate =
    (
      (bedwarsData.overall_stats.wins /
        bedwarsData.overall_stats.games_played) *
      100
    ).toFixed(1) + "%";

  const iconVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.15 },
  };
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <motion.button
          className="bedwars-showcase"
          whileHover={"hover"}
          initial={"initial"}
          transition={{
            type: "spring",
            damping: 60,
            stiffness: 500,
            duration: 0.5,
          }}
        >
          <div className="bedwars-top-row">
            <motion.img
              src={BedwarsHeroIcon}
              alt="Bedwars"
              variants={iconVariants}
            />
            <span className="em-text">Bedwars</span>
          </div>
          <br />
          {formatValue(bedwarsData.overall_stats.games_played)} games played •{" "}
          {winrate} winrate
          <br />
          <span className="secondary-text">→ See more</span>
        </motion.button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="BedwarsOverlay">
          <div className="skin-viewer-header">
            <Dialog.Title className="gallery-title-text">
              Bedwars Stats
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="dialog-close">
                <Icon icon={"material-symbols:close-rounded"} />
              </button>
            </Dialog.Close>
          </div>
          <ul className="info-card-list">
            <InfoCard label="Level" value={bedwarsData.level} />
            <InfoCard label="Tokens" value={formatValue(bedwarsData.tokens)} />
            <InfoCard label="Winrate" value={winrate} />
          </ul>

          <table className="bedwars-table">
            <thead>
              <tr>
                <th></th>
                <th>Overall</th>
                <th>Solo</th>
                <th>Duo</th>
                <th>Trio</th>
                <th>Quad</th>
              </tr>
            </thead>
            <tbody>
              {stats_to_map.map((stat) => (
                <tr>
                  <td className="bedwars-stat-name">
                    {toProperCase(stat.replaceAll("_", " "))}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.overall_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ]
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.solo_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ]
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.duo_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ]
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.trio_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ]
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.quad_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ]
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HypixelGuild({
  hypixelData,
  hypixelGuildData,
  hypixelGuildPage,
  setHypixelGuildPage,
  hypixelGuildLoading
}: HypixelDataProps) {
  let navigate = useNavigate();
  const [guildDisabled, setGuildDisabled] = useState(false);

  if (!hypixelGuildData) {
    return <p>No guild members to show</p>;
  }

  if (!hypixelData.guild) {
    return <p>No guild to show</p>;
  }

  const loadedAllMembers =
    hypixelData.guild.members.length <= hypixelGuildData.length;

  const handleGuildMemberClick = (username: string) => {
    console.log("searching for " + username);
    navigate(`/player/${username}`);
  };

  const handleLoadMore = () => {
    setHypixelGuildPage((p) => p + 1);
  };

  

  const hypixelMemberElements = hypixelGuildData.map((member) => (
    <li key={member.uuid}>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.1, ease: "easeInOut" }}
        className="guild-list-item"
        onClick={() => handleGuildMemberClick(member.uuid)}
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1 },
        }}
      >
        <div className="guild-member-flex-container">
          <img
            src={"data:image/png;base64," + member.skin_showcase_b64}
            className="guild-member-image"
            alt={"head of " + member.username + "'s skin"}
          />
          <div>
            <p className="list-username">{member.username}</p>
            <p className="list-uuid">Click for more info</p>
          </div>
        </div>
      </motion.button>
    </li>
  ));

  return (
    <>
      <h3>{hypixelData?.guild?.name}</h3>
      <ul className="guild-list">{hypixelMemberElements}</ul>
      {!loadedAllMembers && (
        <div className="load-more-container">
          <motion.button
            className="load-more-button"
            initial={{ scale: 1, backgroundColor: "#F4F077" }}
            whileHover={{ scale: 1.3, backgroundColor: "#f8d563" }}
            disabled={hypixelGuildLoading}
            onClick={handleLoadMore}
          >
            {!hypixelGuildLoading && "Load more"}
            {hypixelGuildLoading && "Loading..."}
          </motion.button>
        </div>
      )}
    </>
  );
}

export default HypixelTabbedData;
