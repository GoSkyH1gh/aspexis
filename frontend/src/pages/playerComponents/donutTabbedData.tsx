import InfoCard from "./infoCard";
import { formatValue } from "../../utils/utils";
import { useState } from "react";
import DistributionChartWrapper from "./distributionChartWrapper";
import { DonutPlayerStats } from "../../client";
import { useQuery } from "@tanstack/react-query";
import { fetchMetric } from "../../utils/queries";

type DonutProps = {
  donutData: DonutPlayerStats | null | undefined;
  uuid: string;
};

function DonutTabbedData({ donutData, uuid }: DonutProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  const metricQuery = useQuery({
    queryKey: ["metric", selectedMetric, uuid],
    queryFn: () => fetchMetric(selectedMetric!, uuid),
    enabled: !!selectedMetric,
  });

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
          onClick={() => setSelectedMetric("donut_hours_played")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          label="Status"
          value={donutData.online ? "Online" : "Offline"}
        />
        <InfoCard
          label="Kills"
          value={formatValue(donutData.kills)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_kills")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          label="Deaths"
          value={formatValue(donutData.deaths)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_deaths")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
      </ul>
      <h3>Economy</h3>
      <ul className="info-card-list">
        <InfoCard
          label="Money"
          value={formatValue(donutData.money)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_money")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          label="Money spent"
          value={formatValue(donutData.money_spent)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_money_spent")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          label="Money earned"
          value={formatValue(donutData.money_earned)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_money_earned")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          label="Shards"
          value={formatValue(donutData.shards)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_shards")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
      </ul>
      <h3>World</h3>
      <ul className="info-card-list">
        <InfoCard
          label="Blocks placed"
          value={formatValue(donutData.placed_blocks)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_blocks_placed")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
        <InfoCard
          label="Blocks broken"
          value={formatValue(donutData.broken_blocks)}
          hasStats={true}
          onClick={() => setSelectedMetric("donut_blocks_broken")}
        >
          <DistributionChartWrapper metricQuery={metricQuery} />
        </InfoCard>
      </ul>
    </>
  );
}

export default DonutTabbedData;
