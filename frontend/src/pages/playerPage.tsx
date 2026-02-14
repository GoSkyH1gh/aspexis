import "./playerPage.css";
import { useParams } from "react-router-dom";
import MojangDataDisplay from "./playerComponents/mojangDataDisplay";
import QuickInfo from "./playerComponents/quickInfo";
import SearchRow from "./playerComponents/searchRow";
import LoadingIndicator from "./playerComponents/loadingIndicator";
import AdvancedInfoTabs from "./playerComponents/advancedInfoTabs";
import { usePrefetch } from "../utils/usePrefetch";
import { LuSearchX } from "react-icons/lu";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  fetchMojang,
  fetchCapes,
  fetchDonutSMP,
  fetchHypixelData,
  fetchHypixelGuild,
  fetchMCCI,
  fetchStatus,
  fetchWynncraftData,
  fetchWynncraftGuildData,
} from "../utils/queries";
import { Toast } from "radix-ui";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { useEffect } from "react";

export function PlayerPage() {
  const { username } = useParams();
  const { addToHistory } = useSearchHistory();

  // Prefetch heavy components in the background after page loads
  usePrefetch([
    () => import("./playerComponents/distributionChart"),
    () => import("./playerComponents/skinViewer"),
  ]);

  const mojangQuery = useQuery({
    queryKey: ["mojang", username],
    queryFn: () => fetchMojang(username),
    enabled: !!username,
  });

  const uuid: string | undefined = mojangQuery.data?.uuid;
  const mojangUsername: string | undefined = mojangQuery.data?.username;

  useEffect(() => {
    if (mojangQuery.isSuccess && mojangQuery.data?.username) {
      addToHistory(mojangQuery.data.username);
    }
  }, [mojangQuery.isSuccess, mojangQuery.data, addToHistory]);

  const statusQuery = useQuery({
    queryKey: ["status", uuid],
    queryFn: () => fetchStatus(uuid),
    enabled: !!uuid,
  });

  const hypixelQuery = useQuery({
    queryKey: ["hypixel", uuid],
    queryFn: () => fetchHypixelData(uuid),
    enabled: !!uuid,
  });

  const hypixelGuildQuery = useInfiniteQuery({
    queryKey: ["hypixelGuild", hypixelQuery.data?.guild?.id],
    queryFn: ({ pageParam = 0 }) =>
      fetchHypixelGuild(hypixelQuery.data?.guild?.id, 20, pageParam * 20),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length : undefined,
    enabled: !!hypixelQuery.data?.guild?.id,
    initialPageParam: 0,
  });

  const wynncraftQuery = useQuery({
    queryKey: ["wynncraft", uuid],
    queryFn: () => fetchWynncraftData(uuid),
    enabled: !!uuid,
  });

  const wynncraftGuildQuery = useQuery({
    queryKey: ["wynncraftGuild", wynncraftQuery.data?.guild_prefix],
    queryFn: () => fetchWynncraftGuildData(wynncraftQuery.data?.guild_prefix),
    enabled: !!wynncraftQuery.data?.guild_prefix,
  });

  const donutSMPQuery = useQuery({
    queryKey: ["donut", mojangUsername],
    queryFn: () => fetchDonutSMP(mojangUsername),
    enabled: !!mojangUsername,
  });

  const mcciQuery = useQuery({
    queryKey: ["mcci", uuid],
    queryFn: () => fetchMCCI(uuid),
    enabled: !!uuid,
  });

  const capesQuery = useQuery({
    queryKey: ["capes", uuid],
    queryFn: () => fetchCapes(uuid),
    enabled: !!uuid,
  });

  const loadedTabs = [
    hypixelQuery.data && "hypixel",
    wynncraftQuery.data && "wynncraft",
    donutSMPQuery.data && "donut",
    mcciQuery.data && "mcci",
  ].filter(Boolean) as string[];

  return (
    <>
      <SearchRow disabled={mojangQuery.isLoading} urlToNavigate="/player" />
      <br />

      {mojangQuery.isPending && username != null && (
        <div>
          <LoadingIndicator />
        </div>
      )}

      {mojangQuery.isError && (
        <div className="not-found-container">
          <LuSearchX />
          <div>
            <h2>Something went wrong!</h2>
            <p>reason: {mojangQuery.error.message}</p>
          </div>
        </div>
      )}
      <Toast.Provider swipeDirection="right">
        {hypixelQuery.isError && (
          <>
            <Toast.Root duration={7500} className="ToastRoot ToastError">
              <Toast.Title className="ToastTitle">
                Coudn't fetch Hypixel Data
              </Toast.Title>
              due to {hypixelQuery.error.message}
            </Toast.Root>
            <Toast.Viewport
              className="ToastViewport"
              style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}
            />
          </>
        )}

        {wynncraftQuery.isError && (
          <>
            <Toast.Root duration={7500} className="ToastRoot ToastError">
              <Toast.Title className="ToastTitle">
                Coudn't fetch Wynncraft Data
              </Toast.Title>
              due to {wynncraftQuery.error.message}
            </Toast.Root>
            <Toast.Viewport
              className="ToastViewport"
              style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}
            />
          </>
        )}

        {donutSMPQuery.isError && (
          <>
            <Toast.Root duration={7500} className="ToastRoot ToastError">
              <Toast.Title className="ToastTitle">
                Coudn't fetch Donut SMP Data
              </Toast.Title>
              due to {donutSMPQuery.error.message}
            </Toast.Root>
            <Toast.Viewport
              className="ToastViewport"
              style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}
            />
          </>
        )}

        {mcciQuery.isError && (
          <>
            <Toast.Root duration={7500} className="ToastRoot ToastError">
              <Toast.Title className="ToastTitle">
                Coudn't fetch MCC Island Data
              </Toast.Title>
              due to {mcciQuery.error.message}
            </Toast.Root>
            <Toast.Viewport
              className="ToastViewport"
              style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}
            />
          </>
        )}

        {capesQuery.isError && (
          <>
            <Toast.Root duration={7500} className="ToastRoot ToastError">
              <Toast.Title className="ToastTitle">
                Coudn't fetch Capes data
              </Toast.Title>
              due to {capesQuery.error.message}
            </Toast.Root>
            <Toast.Viewport
              className="ToastViewport"
              style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}
            />
          </>
        )}
      </Toast.Provider>

      {!username && <p>Enter a player to search</p>}
      {mojangQuery.data === null && (
        <div className="not-found-container">
          <LuSearchX />
          <div>
            <h2>We couldn't find {username}</h2>
            <p>Try checking the spelling?</p>
          </div>
        </div>
      )}

      {mojangQuery.data && (
        <div>
          <MojangDataDisplay
            mojangResponse={mojangQuery.data}
            capeData={capesQuery.data}
            capeStatus={capesQuery.status}
          />
        </div>
      )}

      {hypixelQuery.isPending &&
        wynncraftQuery.isPending &&
        mcciQuery.isPending &&
        mojangQuery.data && <LoadingIndicator />}

      {/* Hypixel data loaded */}
      {loadedTabs.length >= 1 && mojangQuery.data && (
        <div>
          {(hypixelQuery.data || wynncraftQuery.data || mcciQuery.data) && (
            <QuickInfo
              hypixelData={hypixelQuery.data}
              wynncraftData={wynncraftQuery.data}
              mcciData={mcciQuery.data}
              playerStatus={statusQuery.data}
              isLoading={
                hypixelQuery.isPending ||
                wynncraftQuery.isPending ||
                mcciQuery.isPending
              }
            />
          )}
          <AdvancedInfoTabs
            hypixelData={hypixelQuery.data}
            hypixelGuildQuery={hypixelGuildQuery}
            hypixelStatus={hypixelQuery.status}
            wynncraftData={wynncraftQuery.data}
            wynncraftStatus={wynncraftQuery.status}
            wynncraftGuildData={wynncraftGuildQuery.data}
            donutData={donutSMPQuery.data}
            donutStatus={donutSMPQuery.status}
            mcciData={mcciQuery.data}
            mcciStatus={mcciQuery.status}
            loadedTabs={loadedTabs}
            uuid={mojangQuery.data.uuid}
          />
        </div>
      )}
    </>
  );
}
