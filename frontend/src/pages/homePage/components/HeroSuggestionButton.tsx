import { memo, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { HERO_SUGGESTIONS } from "../homePageData";

type HeroSuggestionButtonProps = {
  onSelect: (suggestion: string) => void;
};

const HeroSuggestionButton = memo(function HeroSuggestionButton({
  onSelect,
}: HeroSuggestionButtonProps) {
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const suggestion = HERO_SUGGESTIONS[suggestionIndex];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSuggestionIndex((value) => (value + 1) % HERO_SUGGESTIONS.length);
    }, 3200);

    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <button
      className="homepage-hero__helper-button"
      type="button"
      onClick={() => onSelect(suggestion)}
    >
      <span className="homepage-hero__helper-button-label-wrap">
        <AnimatePresence initial={false} mode="sync">
          <motion.span
            key={suggestion}
            className="homepage-hero__helper-button-label"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
          >
            {suggestion}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
});

export { HeroSuggestionButton };
