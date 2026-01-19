import SkinShowcase from "./skinShowcase.js";
import CapeShowcase from "./capeShowcase.js";
import CopyIcon from "./copyIcon.js";
import { motion } from "motion/react";
import SkinView from "./skinViewer.js";
import { MojangData, UserCapeData } from "../../client/types.gen.js";
import { MdFavoriteBorder, MdFavorite } from "react-icons/md";
import {
  addFavorite,
  checkFavorite,
  deleteFavorite,
} from "../../utils/favorites.js";
import { Tooltip } from "radix-ui";
import { useEffect, useState } from "react";
import CapeGallery from "./capeGallery.js";

type MojangProps = {
  mojangResponse: MojangData;
  capeData: UserCapeData[] | null | undefined;
  capeStatus: "error" | "success" | "pending";
};

function MojangDataDisplay({
  mojangResponse,
  capeData,
  capeStatus,
}: MojangProps) {
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    if (checkFavorite(mojangResponse.uuid)) {
      setIsFavorite(true);
    } else {
      setIsFavorite(false);
    }
  }, [mojangResponse.uuid]);
  return (
    <motion.div
      className="mojang-data"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      <div>
        <div className="text-icon">
          <h2 className="username compact-heading">
            {mojangResponse.username}
          </h2>

          <Tooltip.Provider>
            <Tooltip.Root delayDuration={50}>
              <Tooltip.Trigger asChild>
                <motion.button
                  className="icon-button flex"
                  whileHover={{ scale: 1 }}
                  whileTap={{ scale: 0.8 }}
                  aria-label={
                    !isFavorite
                      ? `Add ${mojangResponse.username} to Favorites`
                      : `Remove ${mojangResponse.username} from Favorites`
                  }
                  onClick={() => {
                    if (isFavorite) {
                      deleteFavorite(mojangResponse.uuid);
                      setIsFavorite(false);
                    } else {
                      const now = new Date();
                      addFavorite({
                        username: mojangResponse.username,
                        uuid: mojangResponse.uuid,
                        addedOn: now.toISOString(),
                      });
                      setIsFavorite(true);
                    }
                  }}
                >
                  {isFavorite && <MdFavorite />}
                  {!isFavorite && <MdFavoriteBorder />}
                </motion.button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="TooltipContent">
                  {!isFavorite
                    ? `Add ${mojangResponse.username} to Favorites`
                    : `Remove ${mojangResponse.username} from Favorites`}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        <div className="text-icon uuid-container">
          <p className="uuid">uuid: {mojangResponse.uuid}</p>
          <CopyIcon textToCopy={mojangResponse.uuid} />
        </div>
      </div>
      <div className="mojang-img">
        <SkinShowcase skin_showcase_b64={mojangResponse.skin_showcase_b64} />
        <CapeShowcase
          cape_showcase_b64={mojangResponse.cape_front_b64}
          cape_back_b64={mojangResponse.cape_back_b64}
          has_cape={mojangResponse.has_cape}
          cape_name={mojangResponse.cape_name}
        />
        <motion.div className="skin-options-container">
          <SkinView
            skinUrl={mojangResponse.skin_url}
            capeUrl={mojangResponse.cape_url}
            username={mojangResponse.username}
            key={"skin-view"}
          />
          {capeStatus === "success" && capeData !== null && (
            <CapeGallery
              capeData={capeData}
              capeStatus={capeStatus}
              key={"cape-gallery"}
            />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

export default MojangDataDisplay;
