import { motion } from "motion/react";
import SearchRow from "./searchRow";
import LoadingIndicator from "./loadingIndicator";
import { MojangData } from "../../client";
import { UseQueryResult } from "@tanstack/react-query";

type TrackSearchProps = {
  handleStartTrack: () => void;
  mojangQuery: UseQueryResult<MojangData | null, Error>;
};

function TrackSearch({ handleStartTrack, mojangQuery }: TrackSearchProps) {
  const mojangData = mojangQuery.data;

  return (
    <div className="player-tracker">
      <h2>Choose a player to track</h2>
      <SearchRow urlToNavigate="/track/player" />
      {mojangQuery.isPending && mojangQuery.fetchStatus !== "idle" && (
        <LoadingIndicator />
      )}
      {mojangQuery.isError ||
        (mojangQuery.data === null && (
          <p>
            Something went wrong
            <br />
            Double check spelling or try again later
          </p>
        ))}
      {mojangQuery.isSuccess && mojangQuery.data !== null && (
        <motion.div
          className="track-player"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
        >
          <h2 className="username">{mojangData?.username}</h2>
          <p className="uuid">uuid: {mojangData?.uuid}</p>
          <div className="track-flex">
            <motion.img
              whileHover={{ scale: 0.9 }}
              src={"data:image/png;base64," + mojangData?.skin_showcase_b64}
              className="skin-showcase"
              alt={mojangData?.username + "'s head"}
            />
            <motion.button
              whileHover={{
                borderColor: "#f8d563ff",
                backgroundColor: "#f4f07777",
              }}
              className="motion-button"
              onClick={handleStartTrack}
            >
              Start Tracking
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default TrackSearch;
