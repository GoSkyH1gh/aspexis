import "./playerPage.css";
import { usePageTitle } from "../hooks/usePageTitle";
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
import { useSearchHistory } from "../hooks/useSearchHistory";
import { useEffect } from "react";
import { fetchWynncraftMaxContent } from "../utils/queries";
import { useToast } from "../components/ToastProvider";

export function PlayerPage() {
  const { username } = useParams();
  const { addToHistory } = useSearchHistory();

  // Prefetch heavy components in the background after page loads
  usePrefetch([
    () => import("./playerComponents/distributionChart"),
  ]);

  const mojangQuery = useQuery({
    queryKey: ["mojang", username],
    queryFn: () => fetchMojang(username),
    enabled: !!username,
  });

  const uuid: string | undefined = mojangQuery.data?.uuid;
  const mojangUsername: string | undefined = mojangQuery.data?.username;

  usePageTitle(mojangQuery.data?.username);

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

  const wynncraftMaxContentQuery = useQuery({
    queryKey: ["wynncraftMaxContent"],
    queryFn: () => fetchWynncraftMaxContent(),
    staleTime: 1000 * 60 * 60,
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

  const { addToast } = useToast();

  useEffect(() => {
    if (hypixelQuery.isError)
      addToast({
        message: `Couldn't fetch Hypixel Data due to ${hypixelQuery.error.message}`,
        type: "error",
        duration: 7500,
      });
  }, [hypixelQuery.isError, hypixelQuery.error, addToast]);

  useEffect(() => {
    if (wynncraftQuery.isError)
      addToast({
        message: `Couldn't fetch Wynncraft Data due to ${wynncraftQuery.error.message}`,
        type: "error",
        duration: 7500,
      });
  }, [wynncraftQuery.isError, wynncraftQuery.error, addToast]);

  useEffect(() => {
    if (donutSMPQuery.isError)
      addToast({
        message: `Couldn't fetch Donut SMP Data due to ${donutSMPQuery.error.message}`,
        type: "error",
        duration: 7500,
      });
  }, [donutSMPQuery.isError, donutSMPQuery.error, addToast]);

  useEffect(() => {
    if (mcciQuery.isError)
      addToast({
        message: `Couldn't fetch MCC Island Data due to ${mcciQuery.error.message}`,
        type: "error",
        duration: 7500,
      });
  }, [mcciQuery.isError, mcciQuery.error, addToast]);

  useEffect(() => {
    if (capesQuery.isError)
      addToast({
        message: `Couldn't fetch Capes data due to ${capesQuery.error.message}`,
        type: "error",
        duration: 7500,
      });
  }, [capesQuery.isError, capesQuery.error, addToast]);

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
              wynncraftMaxContent={wynncraftMaxContentQuery.data}
            />
          )}
          <AdvancedInfoTabs
            hypixelData={hypixelQuery.data}
            hypixelGuildQuery={hypixelGuildQuery}
            hypixelStatus={hypixelQuery.status}
            wynncraftData={wynncraftQuery.data}
            wynncraftStatus={wynncraftQuery.status}
            wynncraftGuildData={wynncraftGuildQuery.data}
            wynncraftMaxContent={wynncraftMaxContentQuery.data}
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
