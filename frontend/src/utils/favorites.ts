export const favoritesKey = "favorites";

export type Favorite = {
  uuid: string;
  username: string;
  addedOn: string;
};

function getFavorites() {
  const favoritesRaw = localStorage.getItem(favoritesKey);
  if (!favoritesRaw) {
    return [];
  }
  const favorites: Favorite[] = JSON.parse(favoritesRaw);
  return favorites;
}

function addFavorite(newFavorite: Favorite) {
  const favorites = getFavorites();
  let favoriteExists = false;
  favorites.forEach((favorite) => {
    if (favorite.uuid === newFavorite.uuid) {
      favoriteExists = true;
    }
  });
  if (favoriteExists) {
    return;
  }
  favorites.push(newFavorite);
  localStorage.setItem(favoritesKey, JSON.stringify(favorites));
}

function deleteFavorite(uuid: string) {
  const favorites = getFavorites();
  const favoriteIndexToDelete = favorites.findIndex(
    (favorite) => favorite.uuid === uuid,
  );
  if (favoriteIndexToDelete > -1) {
    favorites.splice(favoriteIndexToDelete, 1);
  }
  localStorage.setItem(favoritesKey, JSON.stringify(favorites));
}

function checkFavorite(uuid: string) {
  const favorites = getFavorites();
  const favoriteIndex = favorites.findIndex(
    (favorite) => favorite.uuid === uuid,
  );
  if (favoriteIndex > -1) {
    return true;
  }
  return false;
}

export { getFavorites, addFavorite, deleteFavorite, checkFavorite };
