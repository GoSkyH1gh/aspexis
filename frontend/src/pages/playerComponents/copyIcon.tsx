import { motion } from "motion/react";
import copyIcon from "/src/assets/copy-icon.svg";
import DesktopTooltip from "../../components/desktopTooltip";
import { useToast } from "../../components/ToastProvider";

function CopyIcon({ textToCopy }: { textToCopy: string }) {
  const { addToast } = useToast();
  return (
    <DesktopTooltip delayDuration={50} content="Copy UUID">
      <motion.button
        className="icon-button"
        aria-label="Copy UUID to clipboard"
        onClick={() => {
          navigator.clipboard.writeText(textToCopy);
          addToast({ message: "Copied to clipboard!", type: "success", duration: 3000 });
        }}
        whileHover={{ scale: 1 }}
        whileTap={{ scale: 0.8 }}
      >
        <motion.img src={copyIcon} alt="" className="copy-icon" />
      </motion.button>
    </DesktopTooltip>
  );
}

export default CopyIcon;
