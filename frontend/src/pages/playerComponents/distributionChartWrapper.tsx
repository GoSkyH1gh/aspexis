import { lazy, Suspense } from "react";
import LoadingIndicator from "./loadingIndicator";
import { HistogramData } from "../../client";

// Lazy load the heavy recharts dependency
const DistributionChart = lazy(() => import("./distributionChart"));

function DistributionChartWrapper({
  metricData,
}: {
  metricData: HistogramData | null | "notFound" | "error" | "loading";
}) {
  if (metricData === null) {
    return <p className="distribution-graph center">There's no data to show</p>;
  }
  if (metricData === "notFound") {
    return (
      <p className="distribution-graph center">Data not found for player</p>
    );
  }
  if (metricData === "error") {
    return (
      <p className="distribution-graph center">
        An error occurred while fetching metrics
      </p>
    );
  }
  if (metricData === "loading") {
    return (
      <div className="distribution-graph center">
        <LoadingIndicator />
      </div>
    );
  }
  return (
    <Suspense fallback={
      <div className="distribution-graph center">
        <LoadingIndicator />
      </div>
    }>
      <DistributionChart
        buckets={metricData.buckets}
        counts={metricData.counts}
        playerValue={metricData.player_value}
        percentile={metricData.percentile}
        sampleSize={metricData.sample_size}
        topPlayers={metricData.top_players as any}
        playerRank={metricData.player_rank}
      />
    </Suspense>
  );
}

export default DistributionChartWrapper;
