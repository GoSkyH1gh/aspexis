import { lazy, Suspense } from "react";
import { Dialog, Tooltip } from "radix-ui";
import "./dialog.css";
import { motion } from "motion/react";
import View3DIcon from "/src/assets/view-3d-icon.svg";
import { Icon } from "@iconify/react";

// Lazy load the heavy 3D skin viewer library
const ReactSkinview3d = lazy(() => import("react-skinview3d"));

type SkinViewProps = {
  skinUrl: string;
  capeUrl: string | null;
  username: string;
};

function SkinView({ skinUrl, capeUrl, username }: SkinViewProps) {
  return (
    <Dialog.Root>
      <Tooltip.Root delayDuration={50}>
        <Tooltip.Trigger asChild>
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
              className="skin-button fill-button"
              aria-label="View in 3D"
            >
              <img src={View3DIcon} alt="View skin in 3d viewer" />
            </motion.button>
          </Dialog.Trigger>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="TooltipContent">
            View in 3D
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <div className="skin-viewer-header">
            <Dialog.Title className="gallery-title-text">
              {username}'s skin
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="dialog-close">
                <Icon icon={"material-symbols:close-rounded"} />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ease: "easeInOut", duration: 0.3 }}
            className="skin-container"
          >
            <Suspense fallback={<div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading 3D viewer...</div>}>
              <ReactSkinview3d
                skinUrl={skinUrl}
                capeUrl={capeUrl || undefined}
                height="300"
                width="300"
              />
            </Suspense>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default SkinView;
