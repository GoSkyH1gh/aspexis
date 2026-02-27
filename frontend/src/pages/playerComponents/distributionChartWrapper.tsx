import { lazy, Suspense } from "react";
import LoadingIndicator from "./loadingIndicator";
import { HistogramData } from "../../client";
import { UseQueryResult } from "@tanstack/react-query";

// Lazy load the heavy recharts dependency
const DistributionChart = lazy(() => import("./distributionChart"));

function DistributionChartWrapper({
  metricQuery,
}: {
  metricQuery: UseQueryResult<HistogramData | null, Error>;
}) {
  if (metricQuery.isPending) {
    return (
      <div className="distribution-graph center">
        <LoadingIndicator />
      </div>
    );
  }
  if (metricQuery.data === null) {
    return (
      <p className="distribution-graph center">Data not found for player</p>
    );
  }
  if (metricQuery.isError) {
    return (
      <p className="distribution-graph center">
        An error occurred while fetching metrics
      </p>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="distribution-graph center">
          <LoadingIndicator />
        </div>
      }
    >
      <DistributionChart histogramData={metricQuery.data} />
    </Suspense>
  );
}

export default DistributionChartWrapper;
