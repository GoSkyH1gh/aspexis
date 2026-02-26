import InfoCard from "./infoCard";
import { formatValue, formatISOToDistance } from "../../utils/utils";
import { Dialog } from "radix-ui";
import "./dialog.css";
import { toProperCase, formatISOTimestamp } from "../../utils/utils";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import BedwarsHeroIcon from "/src/assets/bedwars.png";
import {
  HypixelFullData,
  HypixelGuildMemberFull,
  BedwarsProfile,
} from "../../client";
import DistributionChartWrapper from "./distributionChartWrapper";
import { Icon } from "@iconify/react";
import { useQuery } from "@tanstack/react-query";
import { fetchMetric } from "../../utils/queries";
import { Link } from "react-router-dom";

type HypixelDataProps = {
  hypixelData: HypixelFullData;
  hypixelGuildQuery: any; // UseInfiniteQueryResult with InfiniteData wrapper
};

function HypixelTabbedData({
  hypixelData,
  hypixelGuildQuery,
}: HypixelDataProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const {
    data: metricDataRaw,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["metric", selectedMetric, hypixelData.player.uuid],
    queryFn: () => fetchMetric(selectedMetric!, hypixelData.player.uuid),
    enabled: !!selectedMetric,
  });

  let metricData: any = null;
  if (selectedMetric) {
    if (isLoading) {
      metricData = "loading";
    } else if (isError) {
      metricData = "error";
    } else if (metricDataRaw === null) {
      metricData = "notFound";
    } else if (metricDataRaw) {
      metricData =
        "metricDataRaw" in metricDataRaw
          ? metricDataRaw.metricDataRaw
          : metricDataRaw;
    }
  }

  return (
    <>
      <ul className="info-card-list">
        <InfoCard label="Rank" value={hypixelData.player.rank || "No Rank"} />
        <InfoCard
          label="Guild"
          value={hypixelData?.guild?.name || "No guild"}
        />
        <InfoCard
          label="First seen on"
          value={formatISOTimestamp(hypixelData.player?.first_login)}
        />
        <InfoCard
          label="Last seen"
          value={formatISOToDistance(hypixelData.player?.last_login)}
          tooltip={formatISOTimestamp(hypixelData.player?.last_login)}
        />
      </ul>
      <h3>Global Stats</h3>
      <ul className="info-card-list">
        <InfoCard
          label="Level"
          hasStats={true}
          onClick={() => setSelectedMetric("hypixel_level")}
          value={formatValue(hypixelData.player.network_level)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Karma"
          hasStats={true}
          onClick={() => setSelectedMetric("hypixel_karma")}
          value={formatValue(hypixelData.player.karma)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Achievement Points"
          hasStats={true}
          onClick={() => setSelectedMetric("hypixel_achievement_points")}
          value={formatValue(hypixelData.player.achievement_points)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
      </ul>
      <h3>Game Stats</h3>
      <HypixelBedwarsPopup bedwarsData={hypixelData.player.bedwars} />
      {hypixelData?.guild && (
        <>
          <div className="hypixel-guild-divider" role="separator" />
          <HypixelGuild
            hypixelData={hypixelData}
            hypixelGuildQuery={hypixelGuildQuery}
          />
        </>
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
          Level {bedwarsData.level}
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
                      ],
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.solo_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ],
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.duo_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ],
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.trio_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ],
                    )}
                  </td>
                  <td className="bedwars-stat-value">
                    {formatValue(
                      bedwarsData.quad_stats[
                        stat as keyof typeof bedwarsData.overall_stats
                      ],
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

function HypixelGuild({ hypixelData, hypixelGuildQuery }: HypixelDataProps) {
  let navigate = useNavigate();

  if (!hypixelGuildQuery) {
    return <p>No guild members to show</p>;
  }

  if (!hypixelData.guild) {
    return <p>No guild to show</p>;
  }

  const [displayMode, setDisplayMode] = useState<"card" | "list">("card");

  // Access the pages from the infinite query data
  const guildMembers: HypixelGuildMemberFull[] =
    hypixelGuildQuery.data?.pages?.flat() ?? [];

  const hasNextPage = hypixelGuildQuery.hasNextPage;
  const isFetchingNextPage = hypixelGuildQuery.isFetchingNextPage;

  const handleGuildMemberClick = (username: string) => {
    console.log("searching for " + username);
    navigate(`/player/${username}`);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      hypixelGuildQuery.fetchNextPage();
    }
  };

  const hypixelMemberElements = guildMembers.map((member) => {
    if (displayMode === "card") {
      return (
        <li key={`${member.uuid}:card`}>
          <Link to={`/player/${member.uuid}`}>
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
                  src={"data:image/png;base64," + member.skin_showcase_b64}
                  className="guild-member-image"
                  alt={"head of " + member.username + "'s skin"}
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
          <Link to={`/player/${member.uuid}`}>
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
                  src={"data:image/png;base64," + member.skin_showcase_b64}
                  className="guild-member-image guild-member-image-list"
                  alt={"head of " + member.username + "'s skin"}
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
      <div className="hypixel-guild-card">
        <h3 className="hypixel-guild-header">
          {hypixelData.guild.name}
          {hypixelData.guild.tag && ` [${hypixelData.guild.tag}]`}
        </h3>
        <div>
          {hypixelData.guild.description && (
            <div className="hypixel-guild-description">
              {hypixelData.guild.description}
            </div>
          )}

          <div className="hypixel-guild-info-container">
            Founded {formatISOTimestamp(hypixelData.guild.created)} •{" "}
            {hypixelData.guild.members.length} members • Level{" "}
            {hypixelData.guild.level}
          </div>
        </div>
      </div>
      <div className="hypixel-guild-members-heading">
        <h3>Members</h3>
        <div className="flex">
          Display as
          <div className="select-container">
            <button
              onClick={() => setDisplayMode("card")}
              className={`select-button-left select-button ${displayMode === "card" && "select-button-active"}`}
            >
              Card
            </button>
            <button
              onClick={() => setDisplayMode("list")}
              className={`select-button-right select-button ${displayMode === "list" && "select-button-active"}`}
            >
              List
            </button>
          </div>
        </div>
      </div>
      <ul
        className={`guild-list ${displayMode === "card" ? "guild-list-card" : "guild-list-list"}`}
      >
        {hypixelMemberElements}
      </ul>
      {hasNextPage && (
        <div className="load-more-container">
          <motion.button
            className="load-more-button"
            initial={{ scale: 1, backgroundColor: "var(--color-selected)" }}
            whileHover={{
              scale: 1.3,
              backgroundColor: "var(--color-selected-hover)",
            }}
            disabled={isFetchingNextPage}
            onClick={handleLoadMore}
          >
            {!isFetchingNextPage && "Load more"}
            {isFetchingNextPage && "Loading..."}
          </motion.button>
        </div>
      )}
    </>
  );
}

export default HypixelTabbedData;
