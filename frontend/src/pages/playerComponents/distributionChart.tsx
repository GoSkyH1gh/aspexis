import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatValue } from "../../utils/utils";
import { useState, useRef } from "react";
import helpIcon from "/src/assets/help-icon.svg";
import { motion, stagger } from "motion/react";
import { MdAutoGraph } from "react-icons/md";
import { MdPercent } from "react-icons/md";
import { MdStackedBarChart } from "react-icons/md";
import { useQuery, useQueries } from "@tanstack/react-query";
import { fetchMojang } from "../../utils/queries";
import { Link, useParams } from "react-router-dom";

type RankedPlayer = {
  uuid: string;
  value: number;
};

type DistributionChartProps = {
  buckets: number[];
  counts: number[];
  playerValue: number;
  percentile: number;
  sampleSize: number;
  topPlayers: RankedPlayer[];
  playerRank: number;
};

function DistributionChart({
  buckets,
  counts,
  playerValue,
  percentile,
  sampleSize,
  topPlayers,
  playerRank,
}: DistributionChartProps) {
  const { username } = useParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"chart" | "leaderboard">("chart");
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const currentPlayerQuery = useQuery({
    queryKey: ["mojang", username],
    queryFn: () => fetchMojang(username),
    enabled: !!username,
  });

  const TABS = ["chart", "leaderboard"] as const;

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextTab = TABS[(index + 1) % TABS.length];
      setActiveTab(nextTab);
      tabRefs.current.get(nextTab)?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevTab = TABS[(index - 1 + TABS.length) % TABS.length];
      setActiveTab(prevTab);
      tabRefs.current.get(prevTab)?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(TABS[0]);
      tabRefs.current.get(TABS[0])?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveTab(TABS[TABS.length - 1]);
      tabRefs.current.get(TABS[TABS.length - 1])?.focus();
    }
  };

  const playerQueries = useQueries({
    queries: topPlayers.map((player) => ({
      queryKey: ["mojang", player.uuid],
      queryFn: () => fetchMojang(player.uuid, true),
    })),
  });

  const animationVariants = {
    hidden: { y: -30, opacity: 0 },
    show: { y: 0, opacity: 1 },
  };

  const data = counts.map((count, i) => ({
    range: `${Math.round(buckets[i]).toLocaleString("en-US", {
      notation: "compact",
      maximumFractionDigits: 0,
    })}-${Math.round(buckets[i + 1]).toLocaleString("en-US", {
      notation: "compact",
      maximumFractionDigits: 0,
    })}`,
    count,
    bucketStart: buckets[i],
    bucketEnd: buckets[i + 1],
  }));

  const playerBucketIndex = data.findIndex(
    (d) => playerValue >= d.bucketStart && playerValue < d.bucketEnd,
  );

  // If the player is exactly the max value, put them in the last bucket
  const safeIndex =
    playerBucketIndex === -1 ? data.length - 1 : playerBucketIndex;

  return (
    <div className="distribution-graph">
      <div
        className="distribution-tabs text-icon"
        role="tablist"
        aria-label="Distribution chart tabs"
      >
        {TABS.map((tab, index) => (
          <button
            key={tab}
            className="distribution-tab"
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls="distribution-tab-panel"
            id={`tab-${tab}`}
            tabIndex={activeTab === tab ? 0 : -1}
            onClick={() => setActiveTab(tab)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            ref={(el) => {
              if (el) tabRefs.current.set(tab, el);
              else tabRefs.current.delete(tab);
            }}
          >
            {tab === "chart" ? "Distribution" : "Leaderboard"}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id="distribution-tab-panel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
      >
        {activeTab === "chart" && (
          <>
            <div className="distribution-chart">
              <ResponsiveContainer>
                <BarChart data={data}>
                  <XAxis
                    dataKey="range"
                    tick={{ fill: "#f3f3f7", fontSize: 13 }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "15px",
                      color: "#F4EAE3",
                      backdropFilter: "blur(20px)",
                      backgroundColor: "#bbb4",
                      border: "var(--color-surfact-layer-2) 2px solid",
                    }}
                    cursor={{ fill: "#A130F645", radius: 5 }}
                    labelStyle={{ fontWeight: 600, color: "#F4EAE3" }}
                    itemStyle={{ color: "#F4EAE3" }}
                    offset={0}
                  />
                  <Bar dataKey="count">
                    {data.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === safeIndex ? "#F4F077" : "#A130F6"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div className="text-icon flex">
                <p style={{ textAlign: "center" }}>
                  Better than {percentile.toFixed(1)}% of{" "}
                  {formatValue(sampleSize)} recorded players
                </p>
                <button
                  className="icon-button"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  <img src={helpIcon} />
                </button>
              </div>

              {isExpanded && (
                <div>
                  <motion.ul
                    className="help-ul"
                    initial={"hidden"}
                    animate={"show"}
                    transition={{
                      delayChildren: stagger(0.35, {
                        ease: "easeInOut",
                      }),
                    }}
                  >
                    <motion.li variants={animationVariants}>
                      <MdAutoGraph />
                      Each bar represents a range of values — taller bars mean
                      more players in that range.
                    </motion.li>
                    <motion.li variants={animationVariants}>
                      <MdStackedBarChart />
                      The highlighted bar marks where your current value falls.
                    </motion.li>
                    <motion.li variants={animationVariants}>
                      <MdPercent />
                      The summary above compares your position with all recorded
                      players (shown as a percentile).
                    </motion.li>
                  </motion.ul>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "leaderboard" && (
          <div className="leaderboard-list">
            {topPlayers.map((player, index) => {
              const query = playerQueries[index];
              const playerName = query.data?.username || "Loading...";
              const avatarUrl = query.data
                ? "data:image/png;base64," + query.data.skin_showcase_b64
                : undefined;

              return (
                <Link
                  to={`/player/${player.uuid}`}
                  key={player.uuid}
                  className="leaderboard-item"
                >
                  <div className="leaderboard-item-left">
                    <span
                      className={`leaderboard-rank ${index < 3 ? "top-rank" : ""}`}
                    >
                      #{index + 1}
                    </span>
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={playerName}
                        className="leaderboard-avatar"
                      />
                    ) : (
                      <div className="leaderboard-avatar-placeholder" />
                    )}
                    <span>{playerName}</span>
                  </div>
                  <span className="leaderboard-value">
                    {formatValue(player.value)}
                  </span>
                </Link>
              );
            })}

            {/* Show current player exact rank if they aren't in top 5 */}
            {playerRank > 5 && (
              <>
                <div className="leaderboard-separator" />
                <div className="leaderboard-item current-user">
                  <div className="leaderboard-item-left">
                    <span className="leaderboard-rank">
                      #{formatValue(playerRank)}
                    </span>
                    {currentPlayerQuery.data?.skin_showcase_b64 ? (
                      <img
                        src={
                          "data:image/png;base64," +
                          currentPlayerQuery.data.skin_showcase_b64
                        }
                        alt={currentPlayerQuery.data.username || "You"}
                        className="leaderboard-avatar"
                      />
                    ) : (
                      <div className="leaderboard-avatar-transparent" />
                    )}
                    <span>{currentPlayerQuery.data?.username || "You"}</span>
                  </div>
                  <span className="leaderboard-value">
                    {formatValue(playerValue)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DistributionChart;
