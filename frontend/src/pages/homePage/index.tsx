import {
  FormEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { MdKeyboardArrowDown, MdSearch } from "react-icons/md";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
} from "motion/react";
import type { AbilityTreeNode, AbilityTreePage } from "../../client";
import { usePageTitle } from "../../hooks/usePageTitle";
import { HeroSuggestionButton } from "./components/HeroSuggestionButton";
import { HomeBentoCards } from "./components/HomeBentoCards";
import type { PercentileView } from "./homePageData";
import "./homePage.css";

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

  const meshDistortMask = useMotionTemplate`radial-gradient(
    210px circle at ${meshX}% ${meshY}%,
    rgba(0, 0, 0, 0.95) 0%,
    rgba(0, 0, 0, 0.6) 46%,
    transparent 78%
  )`;

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

    import("../../assets/sample-wynncraft-ability-tree.json").then((module) => {
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

  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setUsername(suggestion);
    searchInputRef.current?.focus();
  }, []);

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
              <HeroSuggestionButton onSelect={handleSuggestionSelect} />
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
            <HomeBentoCards
              percentileView={percentileView}
              onPercentileViewChange={setPercentileView}
              treePreviewNodes={treePreviewNodes}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

export { HomePage };
