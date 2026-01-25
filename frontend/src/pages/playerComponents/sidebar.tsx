import { Link, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import { MaterialSymbolsSearchFilled } from "../../assets/filledSearchIcon";
import { useState, FocusEvent } from "react";

function Sidebar() {
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isHomePage = location.pathname === "/";

  const isExpanded = isHovered || isFocused;

  const handleFocus = () => setIsFocused(true);
  const handleBlur = (e: FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsFocused(false);
    }
  };

  return (
    <aside
      className={`sidebar ${isExpanded ? "sidebar-hover" : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <Link
        to="/"
        className="sidebar-row"
        draggable={false}
        aria-label="Home"
        onClick={(e) => e.currentTarget.blur()}
      >
        <div className="sidebar-icon">
          {location.pathname === "/" ? (
            <Icon
              icon="material-symbols:home-rounded"
              color={isHomePage ? "#101e10" : ""}
            />
          ) : (
            <Icon
              icon="material-symbols:home-outline-rounded"
              color={isHomePage ? "var(--color-text-on-accent)" : ""}
            />
          )}
        </div>
        {isExpanded && (
          <span
            className={`sidebar-label ${
              isHomePage ? "sidebar-label-homepage" : ""
            }`}
          >
            Home
          </span>
        )}
      </Link>

      <Link
        to="/player"
        className="sidebar-row"
        draggable={false}
        aria-label="Search"
        onClick={(e) => e.currentTarget.blur()}
      >
        <div className="sidebar-icon">
          {location.pathname.startsWith("/player") ? (
            <MaterialSymbolsSearchFilled />
          ) : (
            <Icon
              icon="material-symbols:search-rounded"
              color={isHomePage ? "var(--color-text-on-accent)" : ""}
            />
          )}
        </div>
        {isExpanded && (
          <span
            className={`sidebar-label ${
              isHomePage ? "sidebar-label-homepage" : ""
            }`}
          >
            Search
          </span>
        )}
      </Link>

      <Link
        to="/track/player"
        className="sidebar-row"
        draggable={false}
        aria-label="Track Player"
        onClick={(e) => e.currentTarget.blur()}
      >
        <div className="sidebar-icon">
          {location.pathname.startsWith("/track/player") ? (
            <Icon icon="material-symbols:footprint" />
          ) : (
            <Icon
              icon="material-symbols:footprint-outline"
              color={isHomePage ? "var(--color-text-on-accent)" : ""}
            />
          )}
        </div>
        {isExpanded && (
          <span
            className={`sidebar-label ${
              isHomePage ? "sidebar-label-homepage" : ""
            }`}
          >
            Track
          </span>
        )}
      </Link>

      <Link
        to="/favorites"
        className="sidebar-row"
        draggable={false}
        aria-label="Favorites"
        onClick={(e) => e.currentTarget.blur()}
      >
        <div className="sidebar-icon">
          {location.pathname === "/favorites" ? (
            <Icon icon="material-symbols:favorite-rounded" />
          ) : (
            <Icon
              icon="material-symbols:favorite-outline-rounded"
              color={isHomePage ? "var(--color-text-on-accent)" : ""}
            />
          )}
        </div>
        {isExpanded && (
          <span
            className={`sidebar-label ${
              isHomePage ? "sidebar-label-homepage" : ""
            }`}
          >
            Favorites
          </span>
        )}
      </Link>
    </aside>
  );
}

export default Sidebar;
