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

export function PlayerPage() {
  const { username } = useParams();
  useEffect(() => {
    if (username) {
      fetchDataForPlayer(username);
    }
  }, [username]);

  // Prefetch heavy components in the background after page loads
  usePrefetch([
    () => import("./playerComponents/distributionChart"),
    () => import("./playerComponents/skinViewer"),
  ]);

  const [mojangData, setMojangData] = useState<MojangData | null>(null);
  const [playerStatus, setPlayerStatus] = useState<{ status: string } | null>(
    null
  );

  const [hypixelData, setHypixelData] = useState<
    HypixelFullData | null | "not found" | "not found (server error)"
  >(null);
  const [hypixelStatus, setHypixelStatus] = useState<
    null | "loading" | "playerLoaded" | "loaded"
  >(null);
  const [hypixelGuildData, setHypixelGuildData] = useState<
    HypixelGuildMemberFull[] | "no guild" | null
  >(null);

  const [wynncraftData, setWynncraftData] = useState<
    PlayerSummary | null | "not found" | "not found (server error)"
  >(null);
  const [wynncraftStatus, setWynncraftStatus] = useState<
    null | "loading" | "playerLoaded" | "loaded"
  >(null);
  const [wynncraftGuildData, setWynncraftGuildData] = useState<
    GuildInfo | null | "no guild"
  >(null);

  const [donutData, setDonutData] = useState<
    DonutPlayerStats | null | "not found" | "error"
  >(null);
  const [donutStatus, setDonutStatus] = useState<null | "loading" | "loaded">(
    null
  );

  const [mcciData, setMcciData] = useState<
    McciPlayer | null | "not found" | "error"
  >(null);
  const [mcciStatus, setMcciStatus] = useState<null | "loading" | "loaded">(
    null
  );

  const [capesData, setCapesData] = useState<
    UserCapeData[] | null | "not found" | "error"
  >(null);
  const [capesStatus, setCapesStatus] = useState<null | "loading" | "loaded">(
    null
  );

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState<Error | null>(null);

  const [loadedTabs, setLoadedTabs] = useState<string[]>([]);

  const addLoadedTab = (
    tabToAdd: "hypixel" | "wynncraft" | "donut" | "mcci"
  ) => {
    setLoadedTabs((prev) => [...prev, tabToAdd]);
  };

  const fetchDataForPlayer = async (search_term: string) => {
    setMojangData(null);
    setHypixelData(null);
    setHypixelGuildData(null);
    setWynncraftData(null);
    setWynncraftGuildData(null);
    setStatus("loading");
    setError(null);

    setDonutData(null);
    setMcciData(null);
    setCapesData(null);

    setWynncraftStatus("loading");
    setHypixelStatus("loading");
    setDonutStatus("loading");
    setMcciStatus("loading");
    setCapesStatus("loading");

    setLoadedTabs([]);

    const baseUrl =
      import.meta.env.VITE_API_URL ?? "https://fastapi-fakemc.onrender.com";

    const mojangUrl = `${baseUrl}/v1/players/mojang/`;
    const hypixelUrl = `${baseUrl}/v1/players/hypixel/`;

    const statusUrl = `${baseUrl}/v1/players/status/`;
    const wynncraftUrl = `${baseUrl}/v1/players/wynncraft/`;
    const wynncraftGuildUrl = `${baseUrl}/v1/wynncraft/guilds/`;
    const donutUrl = `${baseUrl}/v1/players/donutsmp/`;
    const mcciUrl = `${baseUrl}/v1/players/mccisland/`;
    const capesUrl = `${baseUrl}/v1/players/capes/`;

    try {
      let mojangResponseRaw = await fetch(mojangUrl + encodeURIComponent(search_term));
      if (mojangResponseRaw.status == 404) {
        setStatus("notFound");
        throw new Error("Player not found");
      } else if (!mojangResponseRaw.ok) {
        throw new Error("server error");
      }
      const mojangResponse = await mojangResponseRaw.json();
      if (mojangResponse.status == "lookup_failed") {
        throw new Error("player not found!");
      }
      console.log("got mojang response:", mojangResponse);
      setStatus("loadedMojang");
      setMojangData(mojangResponse);

      // status response
      let statusResponseRaw = await fetch(statusUrl + mojangResponse.uuid);
      const statusResponse = await statusResponseRaw.json();
      console.log("got status response: ", statusResponse);
      setPlayerStatus(statusResponse);

      // hypixel
      let hypixelResponseRaw = await fetch(hypixelUrl + mojangResponse.uuid);
      if (hypixelResponseRaw.ok) {
        const hypixelResponse: HypixelFullData =
          await hypixelResponseRaw.json();
        console.log("got hypixel response: ", hypixelResponse);
        setHypixelData(hypixelResponse);
        setHypixelStatus("playerLoaded");
        addLoadedTab("hypixel");
        fetchHypixelGuildMembers(hypixelResponse, setHypixelGuildData, 0);
        setHypixelStatus("loaded");
      } else if (hypixelResponseRaw.status === 404) {
        setHypixelData("not found");
        setHypixelStatus("loaded");
      } else {
        setHypixelData("not found (server error)");
        setHypixelStatus("loaded");
        throw new Error("error for Hypixel data");
      }

      // wynncraft
      let wynnResponseRaw = await fetch(wynncraftUrl + mojangResponse.uuid);
      const wynnResponse: PlayerSummary = await wynnResponseRaw.json();
      console.log("got wynncraft response: ", wynnResponse);
      if (wynnResponseRaw.ok) {
        setWynncraftData(wynnResponse);
        setWynncraftStatus("playerLoaded");
        addLoadedTab("wynncraft");
        if (wynnResponse.guild_name != null) {
          let wynnGuildResponseRaw = await fetch(
            wynncraftGuildUrl + wynnResponse.guild_prefix
          );
          const wynnGuildResponse = await wynnGuildResponseRaw.json();
          console.log("got wynncraft guild response: ", wynnGuildResponse);
          setWynncraftGuildData(wynnGuildResponse);
          setWynncraftStatus("loaded");
        } else {
          setWynncraftStatus("loaded");
          setWynncraftGuildData("no guild");
          console.log("no guild for searched wynncraft player");
        }
      } else if (wynnResponseRaw.status === 404) {
        setWynncraftData("not found");
        setWynncraftStatus("loaded");
      } else {
        setWynncraftData("not found (server error)");
        setWynncraftStatus("loaded");
        throw new Error("error for Wynncraft data");
      }

      // donut
      let donutResponseRaw = await fetch(donutUrl + mojangResponse.username);
      if (!donutResponseRaw.ok) {
        if (donutResponseRaw.status === 404) {
          setDonutData("not found");
        } else {
          setDonutData("error");
          throw new Error("error for donut data");
        }
        setDonutStatus("loaded");
      } else {
        const donutResponse = await donutResponseRaw.json();
        console.log("got donut response: ", donutResponse);
        setDonutData(donutResponse);
        setDonutStatus("loaded");
        addLoadedTab("donut");
      }

      // mcc island
      let mcciResponseRaw = await fetch(mcciUrl + mojangResponse.uuid);
      if (!mcciResponseRaw.ok) {
        if (mcciResponseRaw.status === 404) {
          setMcciData("not found");
        } else {
          setMcciData("error");
          throw new Error("error for mcc island data");
        }
        setMcciStatus("loaded");
      } else {
        const mcciResponse = await mcciResponseRaw.json();
        console.log("got mcc island response: ", mcciResponse);
        setMcciData(mcciResponse);
        setMcciStatus("loaded");
        addLoadedTab("mcci");
      }

      let capesResponseRaw = await fetch(capesUrl + mojangResponse.uuid);
      if (!capesResponseRaw.ok) {
        if (capesResponseRaw.status === 404) {
          setCapesData("not found");
        } else {
          setCapesData("error");
          throw new Error("error for capes.me data");
        }
        setCapesStatus("loaded");
      } else {
        const capesResponse = await capesResponseRaw.json();
        console.log("got capes response: ", capesResponse);
        setCapesData(capesResponse);
        setCapesStatus("loaded");
      }
    } catch (error: any) {
      console.error("An error occurred:", error);
      setError(error);
      setWynncraftStatus(null);
    }
  };

  async function fetchHypixelGuildMembers(
    hypixelResponse: HypixelFullData,
    setHypixelGuildData: React.Dispatch<
      React.SetStateAction<HypixelGuildMemberFull[] | "no guild" | null>
    >,
    offset: number
  ) {
    const hypixelGuildUrl = `${
      import.meta.env.VITE_API_URL ?? "https://fastapi-fakemc.onrender.com"
    }/v1/hypixel/guilds/`;
    if (hypixelResponse?.guild) {
      if (hypixelGuildData === "no guild" && offset !== 0) {
        return null;
      }
      let hypixelGuildResponseRaw = await fetch(
        `${hypixelGuildUrl}${hypixelResponse.guild.id}?limit=20&offset=${offset}`
      );
      const hypixelGuildResponse = await hypixelGuildResponseRaw.json();

      setHypixelGuildData(
        (previousData: HypixelGuildMemberFull[] | "no guild" | null) => {
          if (!previousData || previousData === "no guild") {
            return hypixelGuildResponse;
          } else {
            return previousData.concat(hypixelGuildResponse);
          }
        }
      );
      console.log(hypixelGuildResponse);
    } else {
      setHypixelGuildData("no guild");
    }
  }

  return (
    <>
      <SearchRow disabled={status === "loading"} urlToNavigate="/player" />
      <br />

      {status === "loading" && (
        <div>
          <LoadingIndicator />
        </div>
      )}
      {status === "idle" && <p>Enter a player to search</p>}
      {error != null && error.message != "Player not found" && (
        <div>
          <h3>An error occured</h3>
          <p>{error.message}</p>
        </div>
      )}
      {error != null && error.message == "Player not found" && (
        <div className="not-found-container">
          <LuSearchX />
          <div>
            <h2>We couldn't find {username}</h2>
            <p>Try checking the spelling?</p>
          </div>
        </div>
      )}

      {status === "loadedMojang" && mojangData && (
        <div>
          <MojangDataDisplay mojangResponse={mojangData} capeData={capesData} capeStatus={capesStatus}/>
        </div>
      )}

      {hypixelStatus === "loading" && status === "loadedMojang" && (
        <LoadingIndicator />
      )}

      {(hypixelStatus === "playerLoaded" || hypixelStatus === "loaded") &&
        mojangData && (
          <div>
            {hypixelData !== "not found" &&
              hypixelData !== "not found (server error)" &&
              hypixelData && (
                <QuickInfo
                  hypixelResponse={hypixelData}
                  playerStatus={playerStatus}
                />
              )}
            <AdvancedInfoTabs
              hypixelResponse={hypixelData}
              hypixelGuildResponse={hypixelGuildData}
              fetchHypixelGuildMembers={fetchHypixelGuildMembers}
              setHypixelGuildData={setHypixelGuildData}
              hypixelStatus={hypixelStatus}
              wynncraftData={wynncraftData}
              wynncraftStatus={wynncraftStatus}
              wynncraftGuildData={wynncraftGuildData}
              donutData={donutData}
              donutStatus={donutStatus}
              mcciData={mcciData}
              mcciStatus={mcciStatus}
              loadedTabs={loadedTabs}
              uuid={mojangData.uuid}
            />
          </div>
        )}
    </>
  );
}

