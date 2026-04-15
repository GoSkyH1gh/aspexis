import InfoCard from "./infoCard";
import WynncraftCharacters from "./wynncraftCharacters";
import {
  formatISOTimestamp,
  formatISOToDistance,
  formatValue,
  toProperCase,
} from "../../utils/utils";
import WynncraftGuild from "./wynncraftGuild";
import { useState } from "react";
import DistributionChartWrapper from "./distributionChartWrapper";
import {
  WynncraftPlayerSummary,
  WynncraftGuildInfo,
  WynncraftRanking,
  MaxContent,
} from "../../client";
import { useQuery } from "@tanstack/react-query";
import { fetchMetric } from "../../utils/queries";
import { Icon } from "@iconify/react";

type WynncraftProps = {
  wynncraftData: WynncraftPlayerSummary;
  wynncraftGuildData: WynncraftGuildInfo | null | undefined;
  wynncraftMaxContent: MaxContent | null | undefined;
  uuid: string;
};

function WynncraftRankings({ rankings }: { rankings: WynncraftRanking[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedRankings = rankings.sort(
    (ranking1, ranking2) => ranking1.position - ranking2.position,
  );
  const previewRankings = sortedRankings
    .filter((ranking) => ranking.position < 1000)
    .slice(0, 3);

  if (sortedRankings.length === 0) return null;

  if (!isExpanded) {
    const previewElements = previewRankings.map((ranking) => (
      <div
        key={ranking.internal_name}
        className={`wynn-ranking-item ${ranking.position <= 10 ? "wynn-high-ranking" : ""}`}
      >
        {`#${ranking.position} ${ranking.name}`}
      </div>
    ));

    return (
      <div key="unexpanded" className="wynn-ranking-container">
        {previewElements}
        {sortedRankings.length > previewRankings.length && (
          <button
            className="wynn-ranking-button"
            onClick={() => setIsExpanded(true)}
          >
            {previewRankings.length === 0 ? "See rankings" : "See more"} {">"}
          </button>
        )}
      </div>
    );
  }

  const groupedRankings = sortedRankings.reduce(
    (acc, ranking) => {
      const categoryKey = ranking.category || "uncategorized";
      if (!acc[categoryKey]) acc[categoryKey] = [];
      acc[categoryKey].push(ranking);
      return acc;
    },
    {} as Record<string, WynncraftRanking[]>,
  );

  const categories = Object.keys(groupedRankings).sort(
    (a, b) => groupedRankings[b].length - groupedRankings[a].length,
  );

  return (
    <div key="expanded" className="wynn-ranking-expanded-container">
      <div className="wynn-ranking-expanded-grid">
        {categories.map((category) => (
          <div key={category} className="wynn-ranking-category-column">
            <h4 className="wynn-ranking-category-title">
              {category === "gamemode"
                ? "Gamemode"
                : category.charAt(0).toUpperCase() + category.slice(1)}
            </h4>
            <div className="wynn-ranking-category-list">
              {groupedRankings[category].map((ranking) => (
                <div
                  key={ranking.internal_name}
                  className={`wynn-ranking-item ${ranking.position <= 10 ? "wynn-high-ranking" : ""}`}
                >
                  <span className="wynn-ranking-number">
                    #{ranking.position}
                  </span>
                  <span className="wynn-ranking-name">{ranking.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        className="wynn-ranking-button wynn-ranking-button-less"
        onClick={() => setIsExpanded(false)}
      >
        See less {"<"}
      </button>
    </div>
  );
}

function WynncraftTabbedData({
  wynncraftData,
  wynncraftGuildData,
  wynncraftMaxContent,
  uuid,
}: WynncraftProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const metricQuery = useQuery({
    queryKey: ["metric", selectedMetric, wynncraftData.uuid],
    queryFn: () => fetchMetric(selectedMetric!, wynncraftData.uuid),
    enabled: !!selectedMetric,
  });

  let wynnGuildElements;
  if (wynncraftGuildData) {
    wynnGuildElements = (
      <>
        <div className="full-width-divider" role="separator" />
        <h3>{wynncraftData.guild_name}</h3>
        <WynncraftGuild wynncraftGuildData={wynncraftGuildData} />
      </>
    );
  } else {
    wynnGuildElements = <></>;
  }

  let disabledStats = [];
  if (wynncraftData.restrictions.main_access) {
    disabledStats.push("Main Access");
  }
  if (wynncraftData.restrictions.character_data_access) {
    disabledStats.push("Characters");
  }
  if (wynncraftData.restrictions.character_build_access) {
    disabledStats.push("Build Information");
  }
  if (wynncraftData.restrictions.online_status) {
    disabledStats.push("Online Status");
  }

  return (
    <>
      {disabledStats.length == 1 && (
        <div className="wynn-privacy-card">
          <Icon icon="material-symbols:lock-outline" />
          <div>
            {wynncraftData.username} has disabled API access to{" "}
            <strong>{disabledStats[0]}</strong>
          </div>
        </div>
      )}
      {disabledStats.length > 1 && (
        <>
          <div className="wynn-privacy-card">
            <Icon icon="material-symbols:lock-outline" />
            <div>
              {wynncraftData.username} has disabled API access to{" "}
              <strong>{disabledStats.slice(0, -1).join(", ")}</strong> and{" "}
              <strong>{disabledStats.slice(-1)}</strong>
            </div>
          </div>
        </>
      )}
      <div className="wynn-player-header">
        <h2 className="wynn-nametag">
          {wynncraftData.rank_badge && (
            <>
              <img
                src={`https://cdn.wynncraft.com/${wynncraftData.rank_badge}`}
                className="wynn-rank"
                alt={wynncraftData.rank}
              />
            </>
          )}

          <span>{wynncraftData.username}</span>
        </h2>

        {wynncraftData.guild_name ? (
          <p className="wynn-secondary-paragraph">
            {toProperCase(wynncraftData.guild_rank || "")} of{" "}
            {wynncraftData.guild_name}{" "}
            {wynncraftData.guild_prefix &&
              "[" + wynncraftData.guild_prefix + "]"}
          </p>
        ) : (
          <span className="wynn-custom-name">No guild</span>
        )}
        <span className="wynn-custom-name wynn-header-activity">
          {wynncraftData.last_login &&
            `Last seen ${formatISOToDistance(wynncraftData.last_login)} • `}
          {wynncraftData.first_login &&
            `First join on ${formatISOTimestamp(wynncraftData.first_login)}`}
        </span>
      </div>
      <WynncraftRankings rankings={wynncraftData.rankings} />
      {!wynncraftData.restrictions.main_access && (
        <>
          <h3>Global Stats</h3>
          <ul className="info-card-list">
            <InfoCard
              onClick={() => setSelectedMetric("wynncraft_hours_played")}
              hasStats={true}
              label="Playtime"
              value={
                formatValue(wynncraftData.player_stats?.playtime_hours, false) +
                " hours"
              }
            >
              <DistributionChartWrapper metricQuery={metricQuery} />
            </InfoCard>
            <InfoCard
              onClick={() => setSelectedMetric("wynncraft_wars")}
              hasStats={true}
              label="Wars"
              value={formatValue(wynncraftData.player_stats?.wars)}
            >
              <DistributionChartWrapper metricQuery={metricQuery} />
            </InfoCard>
            <InfoCard
              onClick={() => setSelectedMetric("wynncraft_mobs_killed")}
              hasStats={true}
              label="Mobs killed"
              value={formatValue(wynncraftData.player_stats?.mobs_killed)}
            >
              <DistributionChartWrapper metricQuery={metricQuery} />
            </InfoCard>
            <InfoCard
              onClick={() => setSelectedMetric("wynncraft_chests_opened")}
              hasStats={true}
              label="Chests opened"
              value={formatValue(wynncraftData.player_stats?.chests_opened)}
            >
              <DistributionChartWrapper metricQuery={metricQuery} />
            </InfoCard>
            <InfoCard
              onClick={() => setSelectedMetric("wynncraft_dungeons_completed")}
              hasStats={true}
              label="Dungeons"
              value={formatValue(
                wynncraftData.player_stats?.dungeons_completed,
              )}
            >
              <DistributionChartWrapper metricQuery={metricQuery} />
            </InfoCard>
            <InfoCard
              onClick={() => setSelectedMetric("wynncraft_raids_completed")}
              hasStats={true}
              label="Raids"
              value={formatValue(wynncraftData.player_stats?.raids_completed)}
            >
              <DistributionChartWrapper metricQuery={metricQuery} />
            </InfoCard>
          </ul>
        </>
      )}
      {!wynncraftData.restrictions.character_data_access && (
        <WynncraftCharacters
          characterList={wynncraftData.characters}
          uuid={uuid}
          playerName={wynncraftData.username}
          restrictions={wynncraftData.restrictions}
          wynncraftMaxContent={wynncraftMaxContent}
        />
      )}
      {wynncraftData?.characters?.length === 0 &&
        wynncraftData.restrictions.character_data_access && (
          <>
            <h3>Characters</h3>
            <div className="wynn-privacy-card wynn-privacy-card-characters">
              <Icon icon="material-symbols:lock-outline" />
              {wynncraftData.username}'s characters are private
            </div>
          </>
        )}

      {wynnGuildElements}
    </>
  );
}

export default WynncraftTabbedData;
