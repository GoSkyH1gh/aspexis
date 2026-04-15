import { PlayerPage } from "./pages/playerPage";
import { HomePage } from "./pages/homePage";
import { Route, Routes } from "react-router-dom";
import Layout from "./pages/layout";
import TrackerPage from "./pages/trackerPage";
import FavoritesPage from "./pages/favoritesPage";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Tooltip } from "radix-ui";
import { ThemeProvider } from "./pages/playerComponents/themeContext";
import NotFoundPage from "./pages/notFoundPage";
import { ReloadPrompt } from "./components/reloadPrompt";
import { GlobalToastProvider } from "./components/ToastProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 3 * 60 * 1000,
    },
  },
});

function App() {
  return (
    <Tooltip.Provider>
      <ThemeProvider>
        <GlobalToastProvider>
          <QueryClientProvider client={queryClient}>
            <ReloadPrompt />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/player/" element={<PlayerPage />} />
                <Route path="/player/:username" element={<PlayerPage />} />
                <Route path="/track/player" element={<TrackerPage />} />
                <Route
                  path="/track/player/:username"
                  element={<TrackerPage />}
                />
                <Route path="/favorites" element={<FavoritesPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </QueryClientProvider>
        </GlobalToastProvider>
      </ThemeProvider>
    </Tooltip.Provider>
  );
}

export default App;
