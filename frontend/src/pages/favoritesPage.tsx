import { useEffect, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import { getFavorites, Favorite, deleteFavorite } from "../utils/favorites";
import { RateLimitError } from "../utils/errors";
import { MdDeleteOutline, MdOutlineSearch } from "react-icons/md";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { loadingSkin } from "./sampleData";
import { formatISOToDistance } from "../utils/utils";
import { useQuery } from "@tanstack/react-query";
import { fetchMojang } from "../utils/queries";

function FavoriteElement({
  uuid,
  username,
  addedOn,
  setFavorites,
}: {
  uuid: string;
  username: string;
  addedOn: string;
  setFavorites: React.Dispatch<React.SetStateAction<Favorite[]>>;
}) {
  const navigator = useNavigate();
  const mojangQuery = useQuery({
    queryKey: ["mojang", uuid],
    queryFn: () => fetchMojang(uuid, true),
  });
  if (mojangQuery.isError) {
    if (mojangQuery.error instanceof RateLimitError) {
      return (
        <li key={uuid}>
          <div className="favorite-content">
            <span
              className="info-card-label"
              style={{ color: "var(--color-error, #ffaaa5)" }}
            >
              Rate limit hit. Please wait a minute to view {username}.
            </span>
          </div>
        </li>
      );
    }
    return <li key={uuid}>Couldn't load {username}</li>;
  }
  return (
    <motion.li
      key={uuid}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <img
        src={
          mojangQuery.data?.skin_showcase_b64
            ? "data:image/png;base64," + mojangQuery.data.skin_showcase_b64
            : loadingSkin
        }
        alt={`${username}'s skin`}
      />
      <div className="favorite-content">
        <Link
          to={`/player/${encodeURIComponent(uuid)}`}
          aria-label={`Search player ${mojangQuery.data?.username || username}`}
          className="username username-link"
        >
          {mojangQuery.data?.username || username}
        </Link>
        <p className="info-card-label">added {formatISOToDistance(addedOn)}</p>
        <div className="favorite-action-container">
          <motion.button
            aria-description="Remove from favorites"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.3 }}
            whileTap={{ scale: 0.9 }}
            className="icon-button favorite-action"
            onClick={() => {
              deleteFavorite(uuid);
              setFavorites(getFavorites());
            }}
          >
            <MdDeleteOutline display={"flex"} />
          </motion.button>
          <motion.button
            aria-description={`Search ${username}`}
            initial={{ scale: 1, backgroundColor: "#F4F077" }}
            whileHover={{ scale: 1.3, backgroundColor: "#f8d563ff" }}
            whileTap={{ scale: 0.9 }}
            className="icon-button favorite-action"
            onClick={() => navigator(`/player/${uuid}`)}
          >
            <MdOutlineSearch color="#101e10" />
          </motion.button>
        </div>
      </div>
    </motion.li>
  );
}

function FavoritesPage() {
  usePageTitle("Favorites");
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  useEffect(() => {
    setFavorites(getFavorites());
  }, []);

  if (favorites.length === 0) {
    return <p>You don't have any favorites yet!</p>;
  }

  const paginatedFavorites = favorites.slice(0, page * PAGE_SIZE);

  const favoriteElements = paginatedFavorites.map((favorite) => (
    <FavoriteElement
      key={favorite.uuid}
      uuid={favorite.uuid}
      username={favorite.username}
      setFavorites={setFavorites}
      addedOn={favorite.addedOn}
    />
  ));

  return (
    <>
      <ul className="favorites-list">{favoriteElements}</ul>
      {page * PAGE_SIZE < favorites.length && (
        <div className="load-more-container">
          <motion.button
            className="load-more-button"
            initial={{ scale: 1, backgroundColor: "var(--color-selected)" }}
            whileHover={{
              scale: 1.3,
              backgroundColor: "var(--color-selected-hover)",
            }}
            onClick={() => setPage((p) => p + 1)}
          >
            Load more
          </motion.button>
        </div>
      )}
    </>
  );
}
export default FavoritesPage;
