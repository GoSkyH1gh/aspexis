import {
  HypixelFullData,
  WynncraftGuildInfo,
  DonutPlayerStats,
  McciPlayer,
  HypixelGuildMemberFull,
  MojangData,
  UserCapeData,
  WynncraftPlayerSummary,
  AbilityTreePage,
  PlayerStatus,
} from "../client";
import { InvalidArgumentsError } from "./errors";

const baseUrl = import.meta.env.VITE_API_URL;

const mojangUrl = `${baseUrl}/v1/players/mojang/`;
const hypixelUrl = `${baseUrl}/v1/players/hypixel/`;

const statusUrl = `${baseUrl}/v1/players/status/`;
const wynncraftUrl = `${baseUrl}/v1/players/wynncraft/`;
const wynncraftGuildUrl = `${baseUrl}/v1/wynncraft/guilds/`;
const wynncraftAbilityTreeUrl = `${baseUrl}/v1/players/wynncraft/`;
const donutUrl = `${baseUrl}/v1/players/donutsmp/`;
const mcciUrl = `${baseUrl}/v1/players/mccisland/`;
const capesUrl = `${baseUrl}/v1/players/capes/`;

export async function fetchMojang(
  search_term: string | undefined,
): Promise<MojangData | null> {
  if (!search_term) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(mojangUrl + encodeURIComponent(search_term));

  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchStatus(
  uuid: string | undefined,
): Promise<PlayerStatus> {
  if (!uuid) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(statusUrl + encodeURIComponent(uuid));

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchHypixelData(
  uuid: string | undefined,
): Promise<HypixelFullData | null> {
  if (!uuid) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(hypixelUrl + encodeURIComponent(uuid));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchHypixelGuild(
  guildId: string | undefined,
  limit: number,
  offset: number,
): Promise<HypixelGuildMemberFull[]> {
  if (!guildId) {
    throw new Error("Guild ID is required");
  }

  const url = `${baseUrl}/v1/hypixel/guilds/${guildId}?limit=${limit}&offset=${offset}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchWynncraftData(
  uuid: string | undefined,
): Promise<WynncraftPlayerSummary | null> {
  if (!uuid) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(wynncraftUrl + encodeURIComponent(uuid));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchWynncraftGuildData(
  guildPrefix: string | null | undefined,
): Promise<WynncraftGuildInfo> {
  if (!guildPrefix) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(
    wynncraftGuildUrl + encodeURIComponent(guildPrefix),
  );

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchWynncraftAbilityTree(
  uuid: string,
  character_uuid: string,
  class_type: string,
): Promise<AbilityTreePage[]> {
  if (!uuid) {
    throw new InvalidArgumentsError();
  }

  const response = await fetch(
    `${wynncraftAbilityTreeUrl}${uuid}/characters/${character_uuid}/ability-tree?class=${class_type}`,
  );

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchDonutSMP(
  username: string | undefined,
): Promise<DonutPlayerStats | null> {
  if (!username) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(donutUrl + encodeURIComponent(username));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchMCCI(
  uuid: string | undefined,
): Promise<McciPlayer | null> {
  if (!uuid) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(mcciUrl + encodeURIComponent(uuid));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}

export async function fetchCapes(
  uuid: string | undefined,
): Promise<UserCapeData[] | null> {
  if (!uuid) {
    throw new InvalidArgumentsError();
  }
  const response = await fetch(capesUrl + encodeURIComponent(uuid));

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Server error");
  }

  return response.json();
}
