import { useQuery } from "@tanstack/react-query";
import { NotFoundError } from "../utils/errors";

function TanstackPractice() {
  // REMOVE THIS BEFORE PUSHING
  const playerToSearch = "goskyhigh";
  const baseUrl = import.meta.env.VITE_API_URL;

  const { status, data, error, refetch } = useQuery({
    queryKey: ["mojang", playerToSearch],
    queryFn: async () => {
      const response = await fetch(
        `${baseUrl}/v1/players/mojang/${playerToSearch}`
      );

      if (response.status === 404) {
        throw new NotFoundError();
      }
      if (!response.ok) {
        throw new Error();
      }
      return response.json();
    },
  });

  const uuid = data?.uuid;

  const {
    status: wynncraftStatus,
    data: wynncraftData,
    error: wynncraftError,
  } = useQuery({
    queryKey: ["wynncraft", uuid],
    queryFn: async () => {
      const response = await fetch(`${baseUrl}/v1/players/wynncraft/${uuid}`);
      if (response.status === 404) {
        throw new NotFoundError();
      }
      if (!response.ok) {
        throw new Error();
      }
      return response.json();
    },
    staleTime: 3 * 60 * 1000,
    enabled: !!uuid,
  });

  return (
    <>
      {status === "pending" && <p>Loading...</p>}
      {status === "error" && <p>Error: {error.message}</p>}
      {status === "success" && <p>{JSON.stringify(data)}</p>}
      <p>wynncraft:</p>
      {wynncraftStatus === "pending" && <p>Loading...</p>}
      {wynncraftStatus === "error" && <p>Error: {wynncraftError.message}</p>}
      {wynncraftStatus === "success" && <p>{JSON.stringify(wynncraftData)}</p>}
    </>
  );
}

export default TanstackPractice;
