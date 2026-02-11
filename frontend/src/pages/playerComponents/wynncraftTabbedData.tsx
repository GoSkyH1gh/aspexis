import InfoCard from "./infoCard";
import WynncraftCharacters from "./wynncraftCharacters";
import {
  formatISOTimestamp,
  formatISOToDistance,
  formatValue,
  handleStatClick,
} from "../../utils/utils";
import WynncraftGuild from "./wynncraftGuild";
import { useState } from "react";
import DistributionChartWrapper from "./distributionChartWrapper";
import { WynncraftPlayerSummary, WynncraftGuildInfo } from "../../client";

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
  const [metricData, setMetricData] = useState(null);

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
          onClick={() =>
            handleStatClick(
              "wynncraft_hours_played",
              wynncraftData.uuid,
              setMetricData,
            )
          }
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
          onClick={() =>
            handleStatClick("wynncraft_wars", wynncraftData.uuid, setMetricData)
          }
          hasStats={true}
          label="Wars"
          value={formatValue(wynncraftData.player_stats?.wars)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() =>
            handleStatClick(
              "wynncraft_mobs_killed",
              wynncraftData.uuid,
              setMetricData,
            )
          }
          hasStats={true}
          label="Mobs killed"
          value={formatValue(wynncraftData.player_stats?.mobs_killed)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() =>
            handleStatClick(
              "wynncraft_chests_opened",
              wynncraftData.uuid,
              setMetricData,
            )
          }
          hasStats={true}
          label="Chests opened"
          value={formatValue(wynncraftData.player_stats?.chests_opened)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() =>
            handleStatClick(
              "wynncraft_dungeons_completed",
              wynncraftData.uuid,
              setMetricData,
            )
          }
          hasStats={true}
          label="Dungeons completed"
          value={formatValue(wynncraftData.player_stats?.dungeons_completed)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          onClick={() =>
            handleStatClick(
              "wynncraft_raids_completed",
              wynncraftData.uuid,
              setMetricData,
            )
          }
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
