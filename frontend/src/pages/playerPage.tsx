import { useEffect, useState } from "react";
import "./playerPage.css";
import { useParams } from "react-router-dom";
import MojangDataDisplay from "./playerComponents/mojangDataDisplay";
import QuickInfo from "./playerComponents/quickInfo";
import SearchRow from "./playerComponents/searchRow";
import LoadingIndicator from "./playerComponents/loadingIndicator";
import AdvancedInfoTabs from "./playerComponents/advancedInfoTabs";
import { usePrefetch } from "../utils/usePrefetch";
import {
  HypixelFullData,
  PlayerSummary,
  GuildInfo,
  DonutPlayerStats,
  McciPlayer,
  HypixelGuildMemberFull,
  MojangData,
  UserCapeData,
} from "../client";
import { LuSearchX } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
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

export function PlayerPage() {
  const { username } = useParams();

  // Prefetch heavy components in the background after page loads
  usePrefetch([
    () => import("./playerComponents/distributionChart"),
    () => import("./playerComponents/skinViewer"),
  ]);

  useEffect(() => setHypixelGuildPage(0), [username]);

  const [accumulatedGuildMembers, setAccumulatedGuildMembers] = useState<
    HypixelGuildMemberFull[] | null
  >(null);

  const [hypixelGuildPage, setHypixelGuildPage] = useState(0);

  const mojangQuery = useQuery({
    queryKey: ["mojang", username],
    queryFn: () => fetchMojang(username),
    enabled: !!username,
  });

  const uuid: string | undefined = mojangQuery.data?.uuid;
  const mojangUsername: string | undefined = mojangQuery.data?.username;

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

  const hypixelGuildQuery = useQuery({
    queryKey: ["hypixelGuild", hypixelQuery.data?.guild?.id, hypixelGuildPage],
    queryFn: () =>
      fetchHypixelGuild(
        hypixelQuery.data?.guild?.id,
        20,
        hypixelGuildPage * 20
      ),
    enabled: !!hypixelQuery.data?.guild?.id,
  });

  useEffect(() => {
    if (hypixelGuildQuery.data) {
      setAccumulatedGuildMembers((prev) => {
        if (!prev) return hypixelGuildQuery.data;
        return [...prev, ...hypixelGuildQuery.data];
      });
    }
  }, [hypixelGuildQuery.data]);

  useEffect(() => {
    setAccumulatedGuildMembers(null);
  }, [username]);

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

      {hypixelQuery.isPending && mojangQuery.data && <LoadingIndicator />}

      {/* Hypixel data loaded */}
      {hypixelQuery.data && mojangQuery.data && (
        <div>
          {hypixelQuery.data && (
            <QuickInfo
              hypixelResponse={hypixelQuery.data}
              playerStatus={statusQuery.data}
            />
          )}
          <AdvancedInfoTabs
            hypixelData={hypixelQuery.data}
            hypixelGuildData={accumulatedGuildMembers}
            hypixelGuildLoading={hypixelGuildQuery.isLoading}
            hypixelGuildPage={hypixelGuildPage}
            setHypixelGuildPage={setHypixelGuildPage}
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
