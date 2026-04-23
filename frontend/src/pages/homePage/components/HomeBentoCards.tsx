import SkinView from "../../playerComponents/skinViewer";
import { Link } from "react-router-dom";
import type { AbilityTreeNode } from "../../../client";
import CopyIcon from "../../playerComponents/copyIcon.js";
import CapeShowcase from "../../playerComponents/capeShowcase.js";
import BedwarsHeroIcon from "/src/assets/bedwars.png";
import {
  HISTOGRAM_BAR_CLASSES,
  LAST_ACTIVITY_PREVIEW,
  LEADERBOARD_ROWS,
  LIVE_ROWS,
  SOURCE_COVERAGE_ROWS,
} from "../homePageData";
import {
  sampleHypixelBedwars,
  sampleMojangResponse,
} from "../homePageSampleData";
import type { PercentileView } from "../homePageData";
import { HomeHoverableAbilityNode } from "./HomeHoverableAbilityNode";

type HomeBentoCardsProps = {
  percentileView: PercentileView;
  onPercentileViewChange: (view: PercentileView) => void;
  treePreviewNodes: AbilityTreeNode[];
};

const BEDWARS_PREVIEW = sampleHypixelBedwars;
const BEDWARS_WINRATE =
  BEDWARS_PREVIEW.overall_stats.games_played > 0
    ? (
        (BEDWARS_PREVIEW.overall_stats.wins /
          BEDWARS_PREVIEW.overall_stats.games_played) *
        100
      ).toFixed(1) + "%"
    : "0.0%";

function SkinBentoCard() {
  return (
    <article className="home-bento-card home-bento-card--skin">
      <div className="home-bento-preview home-bento-preview--skin">
        <div />

        <div className="home-skin-surface">
          <div className="home-skin-shell">
            <div className="home-skin-header">
              <div>
                <p className="home-skin-name">Grian</p>
                <p>
                  <span className="home-skin-uuid-row">
                    uuid: <code>{sampleMojangResponse.uuid}</code>
                    <CopyIcon textToCopy={sampleMojangResponse.uuid} />
                  </span>
                </p>
              </div>
              <Link className="home-snapshot-open" to="/player/Grian">
                Open profile →
              </Link>
            </div>

            <div className="home-skin-content">
              <div className="home-skin-tile home-skin-tile--face">
                <img
                  src={`data:image/png;base64,${sampleMojangResponse.skin_showcase_b64}`}
                  alt="Sample skin preview"
                />
              </div>
              <div className="home-skin-tile home-skin-tile--cape">
                <CapeShowcase
                  cape_showcase_b64={sampleMojangResponse.cape_front_b64}
                  cape_back_b64={sampleMojangResponse.cape_back_b64}
                  has_cape={sampleMojangResponse.has_cape}
                  cape_name={sampleMojangResponse.cape_name}
                />
              </div>
              <div className="home-skin-actions">
                <SkinView
                  skinUrl={sampleMojangResponse.skin_url}
                  capeUrl={sampleMojangResponse.cape_url}
                  username={sampleMojangResponse.username}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="home-bento-copy">
        <p className="home-bento-copy__label">Player profile preview</p>
        <h3>Interactive Skin &amp; Cape Viewer</h3>
        <p>Inspect Mojang skins and capes in 3D.</p>
      </div>
    </article>
  );
}

function LiveTimelineBentoCard() {
  return (
    <article className="home-bento-card home-bento-card--live">
      <div
        className="home-bento-preview home-bento-preview--live"
        role="status"
        aria-live="polite"
      >
        <div className="home-live-header">
          <p>Tracking GoSkyHigh</p>
        </div>
        <div className="home-live-status">Offline</div>
        <div className="home-live-timeline">
          {LIVE_ROWS.map((row, index) => (
            <div
              className="home-live-timeline-row"
              key={`${row.time}-${index}`}
            >
              <span className="home-live-timeline-time">{row.time}</span>
              <span className="home-live-timeline-line" aria-hidden="true" />
              <div className="home-live-timeline-item">
                <span className="home-live-timeline-header">{row.header}</span>
                {row.description ? (
                  <>
                    <br />
                    <span className="home-live-timeline-description">
                      {row.description}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="home-bento-copy">
        <p className="home-bento-copy__label">Live tracking</p>
        <h3>Player Activity Timeline</h3>
        <p>
          Follow online and offline changes over time across supported servers.
        </p>
      </div>
    </article>
  );
}

function PercentileBentoCard({
  percentileView,
  onPercentileViewChange,
}: {
  percentileView: PercentileView;
  onPercentileViewChange: (view: PercentileView) => void;
}) {
  return (
    <article className="home-bento-card home-bento-card--histogram">
      <div className="home-bento-preview home-bento-preview--histogram">
        <div className="home-bokeh home-bokeh--one" aria-hidden="true" />
        <div className="home-bokeh home-bokeh--two" aria-hidden="true" />
        <div className="home-segmented-control">
          <button
            type="button"
            className={percentileView === "distribution" ? "is-active" : ""}
            aria-pressed={percentileView === "distribution"}
            onClick={() => onPercentileViewChange("distribution")}
          >
            Distribution
          </button>
          <button
            type="button"
            className={percentileView === "leaderboard" ? "is-active" : ""}
            aria-pressed={percentileView === "leaderboard"}
            onClick={() => onPercentileViewChange("leaderboard")}
          >
            Leaderboard
          </button>
        </div>

        {percentileView === "distribution" ? (
          <>
            <div className="home-histogram" aria-hidden="true">
              {HISTOGRAM_BAR_CLASSES.map((barClass, index) => (
                <span
                  key={barClass}
                  className={`${barClass}${index === 4 ? " is-highlighted" : ""}`}
                />
              ))}
            </div>
            <div className="home-histogram-labels" aria-hidden="true">
              <span>0-5</span>
              <span>5-35</span>
              <span>35-212</span>
              <span>212-1K</span>
              <span>1K-8K</span>
              <span>8K-45K</span>
            </div>
            <p className="home-percentile-footnote">
              Better than 75.8% of 578 recorded players
            </p>
          </>
        ) : (
          <div className="home-leaderboard">
            {LEADERBOARD_ROWS.map((row) => (
              <div className="home-leaderboard-row" key={row.rank}>
                <span className={row.highlight ? "is-highlight" : ""}>
                  #{row.rank}
                </span>
                <span>{row.player}</span>
                <strong>{row.score}</strong>
              </div>
            ))}
            <div className="home-leaderboard-divider" />
            <div className="home-leaderboard-row home-leaderboard-row--self">
              <span>#141</span>
              <span>GoSkyHigh</span>
              <strong>1.9K</strong>
            </div>
          </div>
        )}
      </div>

      <div className="home-bento-copy">
        <p className="home-bento-copy__label">Rank overview</p>
        <h3>Percentile Rankings</h3>
        <p>See exactly where you stand against every recorded player.</p>
      </div>
    </article>
  );
}

function AbilityTreeBentoCard({
  treePreviewNodes,
}: {
  treePreviewNodes: AbilityTreeNode[];
}) {
  return (
    <article className="home-bento-card home-bento-card--tree">
      <div className="home-bento-preview home-bento-preview--tree">
        <div className="home-tree-shell">
          <div className="home-tree-shell__header">
            <span>GoSkyHigh&apos;s Warrior</span>
          </div>
          <div className="home-tree-shell__body">
            <div className="home-tree-preview">
              {treePreviewNodes.map((node) => {
                if (node.node_type === "ability") {
                  return (
                    <HomeHoverableAbilityNode key={node.node_id} node={node} />
                  );
                }

                return (
                  <div
                    key={node.node_id}
                    className="home-tree-node home-tree-node--connector"
                    style={{
                      gridColumn: node.x,
                      gridRow: node.y,
                    }}
                    aria-hidden="true"
                  >
                    <img
                      src={node.icon_url}
                      alt=""
                      draggable={false}
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="home-bento-copy">
        <p className="home-bento-copy__label">Wynncraft tree</p>
        <h3>Interactive Ability Tree</h3>
        <p>Full tree recreation with one-click export.</p>
      </div>
    </article>
  );
}

function BedwarsBentoCard() {
  return (
    <article className="home-bento-card home-bento-card--bedwars">
      <div className="home-bedwars-split">
        <div className="home-bento-preview home-bento-preview--bedwars">
          <div className="home-bedwars-card" aria-label="Bedwars preview">
            <div className="home-bedwars-top-row">
              <img src={BedwarsHeroIcon} alt="" aria-hidden="true" />
              <span>Bedwars</span>
            </div>
            <p className="home-bedwars-main-line">
              {BEDWARS_PREVIEW.overall_stats.games_played} games played • Level{" "}
              {BEDWARS_PREVIEW.level}
            </p>
            <div className="home-bedwars-stats">
              <span>
                <small>Winrate</small>
                <strong>{BEDWARS_WINRATE}</strong>
              </span>
              <span>
                <small>Final K/D</small>
                <strong>
                  {BEDWARS_PREVIEW.overall_stats.final_kill_death_ratio}
                </strong>
              </span>
              <span>
                <small>Winstreak</small>
                <strong>{BEDWARS_PREVIEW.overall_stats.winstreak}</strong>
              </span>
            </div>
            <p className="home-bedwars-see-more">
              Mode splits and full stat table in profile view
            </p>
          </div>
        </div>

        <div className="home-bento-copy home-bento-copy--bedwars">
          <p className="home-bento-copy__label">Hypixel game stats</p>
          <h3>Detailed Bedwars profile view</h3>
          <p>
            Preview core performance stats, then drill into mode splits, ratios,
            and full Bedwars tables in the player view.
          </p>
        </div>
      </div>
    </article>
  );
}

function SnapshotBentoCard() {
  return (
    <article className="home-bento-card home-bento-card--snapshot">
      <div className="home-bento-preview home-bento-preview--snapshot">
        <div className="home-snapshot-header">
          <h3>Quick Info</h3>
        </div>
        <ul className="home-snapshot-list" aria-label="Quick info preview">
          <li className="home-snapshot-row home-snapshot-row--activity">
            <span className="home-snapshot-label">
              {LAST_ACTIVITY_PREVIEW.stateLabel}
            </span>
            <span className="home-snapshot-value">
              <span className="status-dot" aria-hidden="true">
                <div />
              </span>
              {LAST_ACTIVITY_PREVIEW.stateValue}
            </span>
          </li>
          <li className="home-snapshot-row">
            <span className="home-snapshot-label">
              {LAST_ACTIVITY_PREVIEW.firstSeenLabel}
            </span>
            <span className="home-snapshot-value">
              {LAST_ACTIVITY_PREVIEW.firstSeenValue}
            </span>
          </li>
        </ul>
      </div>
    </article>
  );
}

function CoverageBentoCard() {
  return (
    <article className="home-bento-card home-bento-card--coverage-full">
      <div className="home-bento-preview home-bento-preview--coverage-full">
        <div className="home-coverage-header">
          <h3>Where the data comes from</h3>
        </div>
        <div className="home-coverage-marquee" aria-label="Source coverage">
          <ul className="home-coverage-track">
            {SOURCE_COVERAGE_ROWS.map((row) => (
              <li className="home-coverage-row" key={`a-${row.source}`}>
                <span className="home-coverage-source">{row.source}</span>
                <span className="home-coverage-fields">{row.fields}</span>
              </li>
            ))}
          </ul>
          <ul className="home-coverage-track" aria-hidden="true">
            {SOURCE_COVERAGE_ROWS.map((row) => (
              <li className="home-coverage-row" key={`b-${row.source}`}>
                <span className="home-coverage-source">{row.source}</span>
                <span className="home-coverage-fields">{row.fields}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function HomeBentoCards({
  percentileView,
  onPercentileViewChange,
  treePreviewNodes,
}: HomeBentoCardsProps) {
  return (
    <>
      <SkinBentoCard />
      <LiveTimelineBentoCard />
      <PercentileBentoCard
        percentileView={percentileView}
        onPercentileViewChange={onPercentileViewChange}
      />
      <AbilityTreeBentoCard treePreviewNodes={treePreviewNodes} />
      <BedwarsBentoCard />
      <SnapshotBentoCard />
      <CoverageBentoCard />
    </>
  );
}

export { HomeBentoCards };
