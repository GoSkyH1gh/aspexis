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
import { WynncraftPlayerSummary, WynncraftGuildInfo } from "../../client";
import { useQuery } from "@tanstack/react-query";
import { fetchMetric } from "../../utils/queries";

type WynncraftProps = {
  wynncraftData: WynncraftPlayerSummary;
  wynncraftGuildData: WynncraftGuildInfo | null | undefined;
  uuid: string;
};

function WynncraftTabbedData({
  wynncraftData,
  wynncraftGuildData,
  uuid,
}: WynncraftProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const {
    data: metricDataRaw,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["metric", selectedMetric, wynncraftData.uuid],
    queryFn: () => fetchMetric(selectedMetric!, wynncraftData.uuid),
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

  let wynnGuildElements;
  if (wynncraftGuildData) {
    wynnGuildElements = (
      <>
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
          <DistributionChartWrapper metricData={metricData} />
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
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() => setSelectedMetric("wynncraft_mobs_killed")}
          hasStats={true}
          label="Mobs killed"
          value={formatValue(wynncraftData.player_stats?.mobs_killed)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() => setSelectedMetric("wynncraft_chests_opened")}
          hasStats={true}
          label="Chests opened"
          value={formatValue(wynncraftData.player_stats?.chests_opened)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() => setSelectedMetric("wynncraft_dungeons_completed")}
          hasStats={true}
          label="Dungeons completed"
          value={formatValue(wynncraftData.player_stats?.dungeons_completed)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() => setSelectedMetric("wynncraft_raids_completed")}
          hasStats={true}
          label="Raids completed"
          value={formatValue(wynncraftData.player_stats?.raids_completed)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
      </ul>
      {!wynncraftData.restrictions.character_data_access && (
        <WynncraftCharacters
          characterList={wynncraftData.characters}
          uuid={uuid}
          restrictions={wynncraftData.restrictions}
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
