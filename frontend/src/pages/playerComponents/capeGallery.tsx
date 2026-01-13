import { Dialog } from "radix-ui";
import { UserCapeData } from "../../client";
import { Icon } from "@iconify/react";
import { motion } from "motion/react";

type CapeGalleryProps = {
  capeData: UserCapeData[] | null | undefined;
  capeStatus: "error" | "success" | "pending";
};

function CapeGallery({ capeData, capeStatus }: CapeGalleryProps) {
  let capeElements;
  if (capeData === undefined) {
    capeElements = <p>There's nothing to show here</p>;
  } else if (capeData === null) {
    capeElements = <p>No capes were found for this player</p>;
  } else if (capeStatus === "error") {
    capeElements = <p>Something went wrong while fetching capes</p>;
  } else {
    capeElements = capeData.map((cape) => <CapeElement cape={cape} />);
  }

  if (capeStatus === "pending") {
    <p>Loading capes...</p>;
  }
  // ^^^ these should never happen because the button is only shown when this is loaded and there is content

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.1,
            type: "spring",
            delay: 0.2,
            ease: "easeOut",
          }}
          className="skin-button fill-button tooltip"
          data-tooltip="View Cape Gallery"
          aria-label="View Cape Gallery"
        >
          <Icon icon={"material-symbols:grid-view-outline-rounded"} />
        </motion.button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent cape-gallery">
          <div className="gallery-title-container">
            <Dialog.Title className="gallery-title">
              <span className="gallery-title-text">Cape Gallery</span>
              <span className="credit-pill">
                Data from{" "}
                <a href="https://capes.me/" target="_blank">
                  capes.me
                </a>
              </span>
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="dialog-close">
                <Icon icon={"material-symbols:close-rounded"} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description />
          <p></p>
          <div className="cape-gallery-container">{capeElements}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CapeElement({ cape }: { cape: UserCapeData }) {
  return (
    <div className="cape-gallery-element" key={cape.name}>
      <img
        src={`data:image/png;base64,${cape.images.front_b64}`}
        alt={cape.name}
        className={`cape-gallery-cape ${cape.removed ? "removed-cape" : ""}`}
      ></img>
      <p className="cape-label">
        {cape.name}
        {cape.removed ? (
          <>
            <br />
            (Removed)
          </>
        ) : (
          ""
        )}
      </p>
    </div>
  );
}

export default CapeGallery;
