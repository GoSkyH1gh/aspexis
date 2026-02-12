import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Popover } from "radix-ui";
import { useSearchHistory } from "../../hooks/useSearchHistory";

type SearchbarProps = {
  handleInputChange: (input: any) => void;
  inputValue: string;
  handleKeyPress: (keyPress: any) => void;
  onFocus: () => void;
  setIsOpen: (isOpen: boolean) => void;
};

// Forward ref to allow Popover.Anchor to work
const SearchInput = React.forwardRef<HTMLInputElement, any>(
  ({ handleInputChange, inputValue, handleKeyPress, onFocus }, ref) => {
    return (
      <>
        <label className="visually-hidden" htmlFor="search">
          Search by username or UUID
        </label>
        <motion.input
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          type="text"
          id="search"
          placeholder="search by username or UUID"
          className="searchbar"
          name="search"
          onChange={handleInputChange}
          value={inputValue}
          onKeyDown={handleKeyPress}
          onFocus={onFocus}
          ref={ref}
          autoComplete="off"
        />
      </>
    );
  }
);

SearchInput.displayName = "SearchInput";

type SearchButtonProps = {
  onClick: () => void;
  disabled?: boolean;
};

function SearchButton({ onClick, disabled }: SearchButtonProps) {
  return (
    <motion.button
      className="search-button"
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut", delay: 0.2 }}
      aria-label="Search"
    >
      <Icon icon="material-symbols:search-rounded" />
    </motion.button>
  );
}

type SearchRowProps = {
  disabled?: boolean;
  urlToNavigate: string;
};

function SearchRow({ disabled, urlToNavigate }: SearchRowProps) {
  let navigate = useNavigate();
  const [inputValue, setInputValue] = useState("");
  const { history, removeFromHistory } = useSearchHistory();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchRowRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Don't auto-open on typing if empty, but maybe good to keep open if it was open
  };

  const handleSearchClick = (term?: string) => {
    const finalTerm = term || inputValue.trim();
    if (!disabled && finalTerm) {
      setOpen(false);
      // Blur input to prevent auto-reopening by the effect
      const input = searchRowRef.current?.querySelector("input");
      if (input instanceof HTMLInputElement) {
        input.blur();
      }
      navigate(`${urlToNavigate}/${encodeURIComponent(finalTerm)}`);
    }
  };

  const filteredHistory = history.filter((item) =>
    item.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If we have a highlighted item in the filtered list, use it
      if (open && highlightedIndex >= 0 && filteredHistory[highlightedIndex]) {
        handleSearchClick(filteredHistory[highlightedIndex]);
      } else {
        setOpen(false); 
        handleSearchClick();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open && filteredHistory.length > 0) {
        setOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) =>
          prev < filteredHistory.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > -1 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };
  
  // Helper to ensure we don't try to rely on "open" state which might be stale in closure if not careful,
  // but here we use it directly.

  const onFocus = () => {
    if (filteredHistory.length > 0) {
      setOpen(true);
      setHighlightedIndex(-1);
    }
  };

  // Close popover if history becomes empty or clicked outside (handled by Popover usually)
  useEffect(() => {
    if (filteredHistory.length === 0) {
      setOpen(false);
    } else if (document.activeElement === searchRowRef.current?.querySelector("input")) {
        // Re-open if we have results and are focused (e.g. after typing)
        // Check strict equality to avoid loop, though setOpen is stable
        setOpen(true);
    }
  }, [filteredHistory.length, inputValue]); // React to input changes impacting filter

  return (
    <div className="search-row" ref={searchRowRef}>
      <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
        <Popover.Anchor asChild>
          <SearchInput
            handleInputChange={handleInputChange}
            inputValue={inputValue}
            handleKeyPress={handleKeyPress}
            onFocus={onFocus}
          />
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            className="search-history-popover"
            align="start"
            side="bottom"
            sideOffset={5}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onCloseAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
               if (searchRowRef.current && searchRowRef.current.contains(e.target as Node)) {
                 e.preventDefault();
               }
            }}
            
          >
            <div className="search-history-list">
              {filteredHistory.map((item, index) => (
                <div
                  key={item}
                  className={`search-history-item ${
                    index === highlightedIndex ? "highlighted" : ""
                  }`}
                  onClick={() => handleSearchClick(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <Icon icon="material-symbols:history" className="history-icon" />
                  <span className="history-text">{item}</span>
                  <button
                    className="remove-history-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(item);
                    }}
                    aria-label={`Remove ${item} from history`}
                  >
                   <Icon icon="material-symbols:close-rounded" />
                  </button>
                </div>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <SearchButton onClick={() => handleSearchClick()} disabled={disabled} />
    </div>
  );
}

export default SearchRow;
