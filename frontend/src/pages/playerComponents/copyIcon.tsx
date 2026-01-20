import { motion } from "motion/react";
import copyIcon from "/src/assets/copy-icon.svg";
import { Tooltip, Toast } from "radix-ui";
import { useState, useRef } from "react";

function CopyIcon({ textToCopy }: { textToCopy: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Toast.Provider swipeDirection="right">
        <Tooltip.Root delayDuration={50}>
          <Tooltip.Trigger asChild>
            <motion.button
              className="icon-button"
              onClick={() => {
                navigator.clipboard.writeText(textToCopy);
                setOpen(true);
              }}
              whileHover={{ scale: 1 }}
              whileTap={{ scale: 0.7 }}
            >
              <motion.img
                src={copyIcon}
                alt="copy uuid to clipboard"
                className="copy-icon"
              />
            </motion.button>
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content className="TooltipContent">
              Copy UUID
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      <Toast.Root
        open={open}
        onOpenChange={setOpen}
        duration={700}
        className="ToastRoot"
      >
        <Toast.Title className="ToastTitle">Copied to clipboard!</Toast.Title>
      </Toast.Root>
      <Toast.Viewport
        className="ToastViewport"
        style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}
      />
    </Toast.Provider>
  );
}

export default CopyIcon;
