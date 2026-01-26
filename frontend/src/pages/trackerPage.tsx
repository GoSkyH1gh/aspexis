import { useState } from "react";
import "./playerPage.css";
import TrackSearch from "./playerComponents/trackSearch";
import TrackPlayer from "./playerComponents/trackPlayer";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchMojang } from "../utils/queries";

function TrackerPage() {
  const [trackStatus, setTrackStatus] = useState<"search" | "track">("search") // can be "search" or "track"

  const { username } = useParams();

  const mojangQuery = useQuery({
    queryKey: ["mojang", username],
    queryFn: () => fetchMojang(username),
    enabled: !!username
  });

  if (trackStatus === "search") {
    return <TrackSearch handleStartTrack={() => setTrackStatus("track")} mojangQuery={mojangQuery} />
  }
  if (trackStatus === "track" && mojangQuery.data) {
    return <TrackPlayer mojangData={mojangQuery.data} setTrackStatus={setTrackStatus} />
  }
}

export default TrackerPage;
