import InfoCard from "./infoCard";
import { formatValue, handleStatClick } from "../../utils/utils";
import { useState } from "react";
import DistributionChartWrapper from "./distributionChartWrapper";
import { DonutPlayerStats } from "../../client";

type DonutProps = {
  donutData: DonutPlayerStats | null | undefined
  uuid: string;
};

function DonutTabbedData({ donutData, uuid }: DonutProps) {
  const [metricData, setMetricData] = useState(null);

  if (!donutData) {
    return <p>No DonutSMP data to show</p>;
  }
  return (
    <>
      <ul className="info-card-list">
        <InfoCard
          label="Total Playtime"
          hasStats={true}
          value={donutData.playtime_hours + " hours"}
          onClick={() =>
            handleStatClick("donut_hours_played", uuid, setMetricData)
          }
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Status"
          value={donutData.online ? "Online" : "Offline"}
        />
        <InfoCard
          label="Kills"
          value={formatValue(donutData.kills)}
          hasStats={true}
          onClick={() => handleStatClick("donut_kills", uuid, setMetricData)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Deaths"
          value={formatValue(donutData.deaths)}
          hasStats={true}
          onClick={() => handleStatClick("donut_deaths", uuid, setMetricData)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
      </ul>
      <h3>Economy</h3>
      <ul className="info-card-list">
        <InfoCard
          label="Money"
          value={formatValue(donutData.money)}
          hasStats={true}
          onClick={() => handleStatClick("donut_money", uuid, setMetricData)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Money spent"
          value={formatValue(donutData.money_spent)}
          hasStats={true}
          onClick={() =>
            handleStatClick("donut_money_spent", uuid, setMetricData)
          }
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Money earned"
          value={formatValue(donutData.money_earned)}
          hasStats={true}
          onClick={() =>
            handleStatClick("donut_money_earned", uuid, setMetricData)
          }
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Shards"
          value={formatValue(donutData.shards)}
          hasStats={true}
          onClick={() => handleStatClick("donut_shards", uuid, setMetricData)}
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
      </ul>
      <h3>World</h3>
      <ul className="info-card-list">
        <InfoCard
          label="Blocks placed"
          value={formatValue(donutData.placed_blocks)}
          hasStats={true}
          onClick={() =>
            handleStatClick("donut_blocks_placed", uuid, setMetricData)
          }
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
        <InfoCard
          label="Blocks broken"
          value={formatValue(donutData.broken_blocks)}
          hasStats={true}
          onClick={() =>
            handleStatClick("donut_blocks_broken", uuid, setMetricData)
          }
        >
          <DistributionChartWrapper metricData={metricData} />
        </InfoCard>
      </ul>
    </>
  );
}

export default DonutTabbedData;