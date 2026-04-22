import {
  FormEvent,
  PointerEvent,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import { MdKeyboardArrowDown, MdSearch } from "react-icons/md";
import { Popover } from "radix-ui";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import type { AbilityTreeNode, AbilityTreePage } from "../client";
import "./homePage.css";
import { usePageTitle } from "../hooks/usePageTitle";
import CopyIcon from "./playerComponents/copyIcon.js";
import CapeShowcase from "./playerComponents/capeShowcase.js";
import BedwarsHeroIcon from "/src/assets/bedwars.png";
import {
  sampleHypixelBedwars,
  sampleMojangResponse,
} from "./homePageSampleData";

const SkinView = lazy(() => import("./playerComponents/skinViewer"));

const LIVE_ROWS = [
  { time: "00:51 AM", header: "Offline", description: "" },
  { time: "00:41 AM", header: "Online • Wynncraft", description: "on EU2" },
  { time: "00:38 AM", header: "Offline", description: "" },
  {
    time: "11:23 AM",
    header: "Online • Hypixel",
    description: "playing SkyBlock • Hub",
  },
  {
    time: "11:21 PM",
    header: "Online • Hypixel",
    description: "playing SkyBlock • Dwarven Mines",
  },
];
const HERO_SUGGESTIONS = ["Grian", "Avoma", "Technoblade", "HellCastleBTW"];

const SOURCE_COVERAGE_ROWS = [
  { source: "Mojang", fields: "uuid • skin/cape • favorites" },
  { source: "Hypixel", fields: "rank • guild • global stats • Bedwars" },
  { source: "Wynncraft", fields: "characters • rankings • ability tree" },
  { source: "MCC Island", fields: "status • level • trophies • friends" },
  { source: "DonutSMP", fields: "economy • kills/deaths • world stats" },
  { source: "Status", fields: "live server • timeline history" },
];
const LAST_ACTIVITY_PREVIEW = {
  stateLabel: "Online",
  stateValue: "Playing Wynncraft on EU2",
  firstSeenLabel: "First seen on",
  firstSeenValue: "May 22, 2020",
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

const HISTOGRAM_BAR_CLASSES = [
  "bar-1",
  "bar-2",
  "bar-3",
  "bar-4",
  "bar-5",
  "bar-6",
];
const LEADERBOARD_ROWS = [
  { rank: 1, player: "RealAlex", score: "45.3K", highlight: true },
  { rank: 2, player: "Calluum", score: "36.2K", highlight: true },
  { rank: 3, player: "LuCoolUs", score: "26.7K", highlight: true },
  { rank: 4, player: "SmileyAlec", score: "16K", highlight: false },
  { rank: 5, player: "Salted", score: "16K", highlight: false },
];

type PercentileView = "distribution" | "leaderboard";

function HomeHoverableAbilityNode({ node }: { node: AbilityTreeNode }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = isHovered || isClicked;

  const handleMouseEnter = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => setIsHovered(true), 250);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    setIsHovered(false);
  };

  return (
    <div
      className="home-tree-node home-tree-node--ability"
      style={{
        gridColumn: node.x,
        gridRow: node.y,
      }}
    >
      <Popover.Root
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIsHovered(false);
            setIsClicked(false);
          }
        }}
      >
        <Popover.Trigger asChild>
          <div
            role="button"
            tabIndex={0}
            aria-label={stripHtmlToText(node.pretty_name).split("\n")[0]}
            onMouseDown={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setIsClicked((value) => !value);
              }
            }}
          >
            <img
              src={node.icon_url}
              alt=""
              draggable={false}
              aria-hidden="true"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={(event) => {
                event.preventDefault();
                setIsClicked((value) => !value);
              }}
            />
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            sideOffset={5}
            className="TooltipContent AbilityTreeTooltip home-ability-tree-tooltip"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <div className="wynn-description home-ability-tree-tooltip__content">
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeWynnTooltipHtml(
                    `${node.pretty_name ?? ""}<br>${node.description ?? ""}`,
                  ),
                }}
              />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function stripHtmlToText(html: string | null): string {
  if (!html) {
    return "";
  }
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function sanitizeWynnTooltipHtml(html: string | null): string {
  if (!html) {
    return "";
  }

  if (typeof window === "undefined") {
    return stripHtmlToText(html);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) {
    return "";
  }

  const allowedTags = new Set(["span", "br"]);
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const toReplace: Element[] = [];

  while (walker.nextNode()) {
    const current = walker.currentNode as Element;
    if (!allowedTags.has(current.tagName.toLowerCase())) {
      toReplace.push(current);
      continue;
    }

    const attrs = Array.from(current.attributes);
    attrs.forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name !== "class" && name !== "style") {
        current.removeAttribute(attribute.name);
      }
    });

    const styleValue = current.getAttribute("style");
    if (styleValue) {
      const sanitizedStyle = styleValue
        .split(";")
        .map((rule) => rule.trim())
        .filter(Boolean)
        .filter((rule) => {
          const [prop, value = ""] = rule.split(":");
          const key = prop?.trim().toLowerCase();
          const val = value.trim().toLowerCase();
          if (!key) return false;
          if (val.includes("url(") || val.includes("expression(")) return false;
          return (
            key === "color" ||
            key === "font-weight" ||
            key === "margin-left" ||
            key === "text-decoration"
          );
        })
        .join("; ");

      if (sanitizedStyle) {
        current.setAttribute("style", sanitizedStyle);
      } else {
        current.removeAttribute("style");
      }
    }
  }

  toReplace.forEach((element) => {
    const textNode = doc.createTextNode(element.textContent ?? "");
    element.replaceWith(textNode);
  });

  return root.innerHTML;
}

function HomePage() {
  usePageTitle();

  const navigate = useNavigate();
  const heroRef = useRef<HTMLElement | null>(null);
  const bentoRef = useRef<HTMLDivElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [treePreviewNodes, setTreePreviewNodes] = useState<AbilityTreeNode[]>(
    [],
  );
  const [username, setUsername] = useState("");
  const [percentileView, setPercentileView] =
    useState<PercentileView>("distribution");
  const [heroSuggestionIndex, setHeroSuggestionIndex] = useState(0);
  const meshTargetX = useMotionValue(50);
  const meshTargetY = useMotionValue(58);
  const meshX = useSpring(meshTargetX, {
    stiffness: 160,
    damping: 26,
    mass: 0.45,
  });
  const meshY = useSpring(meshTargetY, {
    stiffness: 160,
    damping: 26,
    mass: 0.45,
  });

  const heroSuggestion = HERO_SUGGESTIONS[heroSuggestionIndex];
  const meshDistortMask = useMotionTemplate`radial-gradient(
    210px circle at ${meshX}% ${meshY}%,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.6) 46%,
    transparent 78%
  )`;

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroSuggestionIndex((value) => (value + 1) % HERO_SUGGESTIONS.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const cards =
      bentoRef.current?.querySelectorAll<HTMLElement>(".home-bento-card") ?? [];
    if (cards.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 },
    );

    cards.forEach((card, index) => {
      card.style.setProperty("--reveal-delay", `${index * 80}ms`);
      observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    import("../assets/sample-wynncraft-ability-tree.json").then((module) => {
      if (!isMounted) return;

      const treeData = module.default as AbilityTreePage[];

      const selectedPage = treeData[0];
      if (!selectedPage) {
        setTreePreviewNodes([]);
        return;
      }

      const nodes = selectedPage.nodes
        .map((node) => {
          const localRow = node.y - (selectedPage.page_number - 1) * 6;
          return {
            ...node,
            y: localRow,
          } satisfies AbilityTreeNode;
        })
        .sort((a, b) => {
          if (a.unlocked === b.unlocked) return 0;
          return a.unlocked ? 1 : -1;
        });

      setTreePreviewNodes(nodes);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      return;
    }

    navigate(`/player/${encodeURIComponent(trimmed)}`);
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleHeroPointerMove = (event: PointerEvent<HTMLElement>) => {
    const heroElement = heroRef.current;
    if (!heroElement) return;

    const rect = heroElement.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;
    meshTargetX.set(Math.max(0, Math.min(100, xPercent)));
    meshTargetY.set(Math.max(0, Math.min(100, yPercent)));
  };

  const handleHeroPointerLeave = () => {
    meshTargetX.set(50);
    meshTargetY.set(58);
  };

  return (
    <div className="homepage-shell">
      <main className="homepage-main">
        <section
          className="homepage-hero"
          ref={heroRef}
          onPointerMove={handleHeroPointerMove}
          onPointerLeave={handleHeroPointerLeave}
        >
          <div className="homepage-hero__glow" aria-hidden="true" />
          <motion.div className="homepage-hero__mesh" aria-hidden="true" />
          <motion.div
            className="homepage-hero__mesh-distort"
            style={{
              maskImage: meshDistortMask,
              WebkitMaskImage: meshDistortMask,
            }}
            aria-hidden="true"
          />

          <div className="homepage-hero__content">
            <p className="homepage-hero__brand">Aspexis</p>
            <h1 className="homepage-hero__title">Player stats, one search.</h1>
            <p className="homepage-hero__subtitle">
              Search a username to open the full profile view across Hypixel,
              Wynncraft, MCC Island, DonutSMP, and more.
            </p>

            <form
              className="homepage-search"
              onSubmit={handleSearch}
              onMouseDown={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("button")) {
                  return;
                }

                event.preventDefault();
                searchInputRef.current?.focus();
              }}
            >
              <label className="sr-only" htmlFor="homepage-player-search">
                Enter a Minecraft username
              </label>
              <div className="homepage-search__input-wrap">
                <MdSearch aria-hidden="true" />
                <input
                  id="homepage-player-search"
                  ref={searchInputRef}
                  type="text"
                  value={username}
                  placeholder="Enter a username..."
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <button type="submit">Search</button>
            </form>

            <div className="homepage-hero__helper">
              <span>Try searching</span>
              <button
                className="homepage-hero__helper-button"
                type="button"
                key={heroSuggestion}
                onClick={() => {
                  setUsername(heroSuggestion);
                  searchInputRef.current?.focus();
                }}
              >
                {heroSuggestion}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="homepage-scroll-indicator"
            aria-label="Scroll to features"
            onClick={scrollToFeatures}
          >
            <span>Explore features</span>
            <MdKeyboardArrowDown />
          </button>
        </section>

        <section className="homepage-features" ref={featuresRef}>
          <div className="homepage-section-heading">
            <h2>Built for depth</h2>
          </div>

          <div className="homepage-bento" ref={bentoRef}>
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
                          cape_showcase_b64={
                            sampleMojangResponse.cape_front_b64
                          }
                          cape_back_b64={sampleMojangResponse.cape_back_b64}
                          has_cape={sampleMojangResponse.has_cape}
                          cape_name={sampleMojangResponse.cape_name}
                        />
                      </div>
                      <div className="home-skin-actions">
                        <Suspense
                          fallback={
                            <button
                              className="home-skin-action-button"
                              disabled
                            >
                              Loading 3D
                            </button>
                          }
                        >
                          <SkinView
                            skinUrl={sampleMojangResponse.skin_url}
                            capeUrl={sampleMojangResponse.cape_url}
                            username={sampleMojangResponse.username}
                          />
                        </Suspense>
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
                      <span className="home-live-timeline-time">
                        {row.time}
                      </span>
                      <span
                        className="home-live-timeline-line"
                        aria-hidden="true"
                      />
                      <div className="home-live-timeline-item">
                        <span className="home-live-timeline-header">
                          {row.header}
                        </span>
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
                  Follow online and offline changes over time across supported
                  servers.
                </p>
              </div>
            </article>

            <article className="home-bento-card home-bento-card--histogram">
              <div className="home-bento-preview home-bento-preview--histogram">
                <div
                  className="home-bokeh home-bokeh--one"
                  aria-hidden="true"
                />
                <div
                  className="home-bokeh home-bokeh--two"
                  aria-hidden="true"
                />
                <div className="home-segmented-control">
                  <button
                    type="button"
                    className={
                      percentileView === "distribution" ? "is-active" : ""
                    }
                    aria-pressed={percentileView === "distribution"}
                    onClick={() => setPercentileView("distribution")}
                  >
                    Distribution
                  </button>
                  <button
                    type="button"
                    className={
                      percentileView === "leaderboard" ? "is-active" : ""
                    }
                    aria-pressed={percentileView === "leaderboard"}
                    onClick={() => setPercentileView("leaderboard")}
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
                <p>
                  See exactly where you stand against every recorded player.
                </p>
              </div>
            </article>

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
                            <HomeHoverableAbilityNode
                              key={node.node_id}
                              node={node}
                            />
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

            <article className="home-bento-card home-bento-card--bedwars">
              <div className="home-bedwars-split">
                <div className="home-bento-preview home-bento-preview--bedwars">
                  <div
                    className="home-bedwars-card"
                    aria-label="Bedwars preview"
                  >
                    <div className="home-bedwars-top-row">
                      <img src={BedwarsHeroIcon} alt="" aria-hidden="true" />
                      <span>Bedwars</span>
                    </div>
                    <p className="home-bedwars-main-line">
                      {BEDWARS_PREVIEW.overall_stats.games_played} games played
                      • Level {BEDWARS_PREVIEW.level}
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
                        <strong>
                          {BEDWARS_PREVIEW.overall_stats.winstreak}
                        </strong>
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
                    Preview core performance stats, then drill into mode splits,
                    ratios, and full Bedwars tables in the player view.
                  </p>
                </div>
              </div>
            </article>

            <article className="home-bento-card home-bento-card--snapshot">
              <div className="home-bento-preview home-bento-preview--snapshot">
                <div className="home-snapshot-header">
                  <h3>Quick Info</h3>
                </div>
                <ul
                  className="home-snapshot-list"
                  aria-label="Quick info preview"
                >
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

            <article className="home-bento-card home-bento-card--coverage-full">
              <div className="home-bento-preview home-bento-preview--coverage-full">
                <div className="home-coverage-header">
                  <h3>Where the data comes from</h3>
                </div>
                <div
                  className="home-coverage-marquee"
                  aria-label="Source coverage"
                >
                  <ul className="home-coverage-track">
                    {SOURCE_COVERAGE_ROWS.map((row) => (
                      <li className="home-coverage-row" key={`a-${row.source}`}>
                        <span className="home-coverage-source">
                          {row.source}
                        </span>
                        <span className="home-coverage-fields">
                          {row.fields}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <ul className="home-coverage-track" aria-hidden="true">
                    {SOURCE_COVERAGE_ROWS.map((row) => (
                      <li className="home-coverage-row" key={`b-${row.source}`}>
                        <span className="home-coverage-source">
                          {row.source}
                        </span>
                        <span className="home-coverage-fields">
                          {row.fields}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
}

export { HomePage };
