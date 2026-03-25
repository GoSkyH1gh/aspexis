import { motion } from "motion/react";
import copyIcon from "/src/assets/copy-icon.svg";
import { Toast } from "radix-ui";
import DesktopTooltip from "../../components/desktopTooltip";
import { useState, useRef } from "react";

function CopyIcon({ textToCopy }: { textToCopy: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Toast.Provider swipeDirection="right">
      <DesktopTooltip delayDuration={50} content="Copy UUID">
        <motion.button
          className="icon-button"
          aria-label="Copy UUID to clipboard"
          onClick={() => {
            navigator.clipboard.writeText(textToCopy);
            setOpen(true);
          }}
          whileHover={{ scale: 1 }}
          whileTap={{ scale: 0.8 }}
        >
          <motion.img src={copyIcon} alt="" className="copy-icon" />
        </motion.button>
      </DesktopTooltip>
      <Toast.Root
        open={open}
        onOpenChange={setOpen}
        duration={3000}
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
