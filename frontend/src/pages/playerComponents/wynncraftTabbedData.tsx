import InfoCard from "./infoCard";
import WynncraftCharacters from "./wynncraftCharacters";
import {
  formatISOTimestamp,
  formatISOToDistance,
  formatValue,
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

type WynncraftProps = {
  wynncraftData: WynncraftPlayerSummary;
  wynncraftGuildData: WynncraftGuildInfo | null | undefined;
  wynncraftMaxContent: MaxContent | null | undefined;
  uuid: string;
};


function WynncraftRankings({ rankings }: { rankings: WynncraftRanking[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedRankings = rankings.sort((ranking1, ranking2) => ranking1.position - ranking2.position);
  const previewRankings = sortedRankings.filter(ranking => ranking.position < 1000).slice(0, 3);

  if (sortedRankings.length === 0) return null;

  if (!isExpanded) {
    const previewElements = previewRankings.map(ranking => (
      <div key={ranking.internal_name} className={`wynn-ranking-item ${ranking.position <= 10 ? "wynn-high-ranking" : ""}`}>
        {`#${ranking.position} ${ranking.name}`}
      </div>
    ));

    return (
      <div key="unexpanded" className="wynn-ranking-container">
        {previewElements}
        {sortedRankings.length > previewRankings.length && (
          <button className="wynn-ranking-button" onClick={() => setIsExpanded(true)}>
            {previewRankings.length === 0 ? "See rankings" : "See more"} {'>'}
          </button>
        )}
      </div>
    );
  }

  const groupedRankings = sortedRankings.reduce((acc, ranking) => {
    const categoryKey = ranking.category || "uncategorized";
    if (!acc[categoryKey]) acc[categoryKey] = [];
    acc[categoryKey].push(ranking);
    return acc;
  }, {} as Record<string, WynncraftRanking[]>);

  const categories = Object.keys(groupedRankings).sort(
    (a, b) => groupedRankings[b].length - groupedRankings[a].length
  );

  return (
    <div key="expanded" className="wynn-ranking-expanded-container">
      <div className="wynn-ranking-expanded-grid">
        {categories.map(category => (
          <div key={category} className="wynn-ranking-category-column">
            <h4 className="wynn-ranking-category-title">
              {category === "gamemode" ? "Gamemode" : category.charAt(0).toUpperCase() + category.slice(1)}
            </h4>
            <div className="wynn-ranking-category-list">
              {groupedRankings[category].map(ranking => (
                <div key={ranking.internal_name} className={`wynn-ranking-item ${ranking.position <= 10 ? "wynn-high-ranking" : ""}`}>
                  <span className="wynn-ranking-number">#{ranking.position}</span>
                  <span className="wynn-ranking-name">{ranking.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button className="wynn-ranking-button wynn-ranking-button-less" onClick={() => setIsExpanded(false)}>
        See less {'<'}
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
  return (
    <>
      {(wynncraftData.restrictions.main_access ||
        wynncraftData.restrictions.character_data_access ||
        wynncraftData.restrictions.character_build_access ||
        wynncraftData.restrictions.online_status) && (
          <div className="wynn-restrictions">
            {wynncraftData.restrictions.main_access && (
              <p>
                Warning: This player has disabled API access to their{" "}
                <strong>main stats</strong>
              </p>
            )}
            {wynncraftData.restrictions.character_data_access && (
              <p>
                Warning: This player has disabled API access to their{" "}
                <strong>characters</strong>
              </p>
            )}
            {wynncraftData.restrictions.character_build_access && (
              <p>
                Warning: This player has disabled API access to their{" "}
                <strong>build information</strong>
              </p>
            )}
            {wynncraftData.restrictions.online_status && (
              <p>
                Warning: This player has disabled API access to their{" "}
                <strong>online status</strong>
              </p>
            )}
          </div>
        )}
      <h2 className="wynn-nametag">
        {wynncraftData.guild_prefix && "[" + wynncraftData.guild_prefix + "]"}
        <span className="wynn-username">{wynncraftData.username}</span>
      </h2>
      <WynncraftRankings rankings={wynncraftData.rankings} />
      <ul className="info-card-list">
        <InfoCard
          onClick={() => setSelectedMetric("wynncraft_hours_played")}
          hasStats={true}
          label="Total playtime"
          value={
            formatValue(wynncraftData.player_stats?.playtime_hours, false) +
            " hours"
          }
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          label="Rank"
          value={
            wynncraftData.rank_badge ? (
              <img
                src={`https://cdn.wynncraft.com/${wynncraftData.rank_badge}`}
                className="wynn-rank"
                alt={wynncraftData.rank}
              />
            ) : (
              wynncraftData.rank
            )
          }
        />
        <InfoCard
          label="First Login"
          value={formatISOTimestamp(wynncraftData.first_login)}
        />
        <InfoCard
          label="Last Login"
          value={formatISOToDistance(wynncraftData.last_login)}
          tooltip={formatISOTimestamp(wynncraftData.last_login)}
        />
      </ul>
      {wynncraftData.guild_name && (
        <ul className="info-card-list">
          <InfoCard label="Guild" value={wynncraftData.guild_name} />
        </ul>
      )}

      <h3>Global Stats</h3>
      <ul className="info-card-list">
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
          label="Dungeons completed"
          value={formatValue(wynncraftData.player_stats?.dungeons_completed)}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          onClick={() => setSelectedMetric("wynncraft_raids_completed")}
          hasStats={true}
          label="Raids completed"
          value={formatValue(wynncraftData.player_stats?.raids_completed)}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
      </ul>
      {!wynncraftData.restrictions.character_data_access && (
        <WynncraftCharacters
          characterList={wynncraftData.characters}
          uuid={uuid}
          restrictions={wynncraftData.restrictions}
          wynncraftMaxContent={wynncraftMaxContent}
        />
      )}
      {wynncraftData?.characters?.length === 0 &&
        wynncraftData.restrictions.character_data_access && (
          <p>{wynncraftData.username}'s characters are unavailable</p>
        )}

      {wynnGuildElements}
    </>
  );
}

export default WynncraftTabbedData;
