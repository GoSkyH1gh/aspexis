import { motion } from "motion/react";
import ArrowOutward from "/src/assets/arrow-outward.svg";
import { Popover } from "radix-ui";
import { ReactNode } from "react";

type InfoCardProps = {
  label: string;
  value: string | number | ReactNode;
  onClick?: () => void;
  hasStats?: boolean;
  children?: ReactNode;
};

function InfoCard({
  label,
  value,
  onClick,
  hasStats = false,
  children,
}: InfoCardProps) {
  if (hasStats) {
    return (
      <motion.li
        className="info-card"
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0 },
        }}
      >
        <div className="info-card-row">
          <div>
            <span className="info-card-label">{label}</span>
            <br />
            <span className="info-card-value">{value}</span>
          </div>
          <Popover.Root>
            <Popover.Trigger asChild>
              <motion.button
                className="icon-button"
                onClick={onClick}
                whileHover={{ scale: 1 }}
                whileTap={{ scale: 0.8 }}
              >
                <img src={ArrowOutward} alt="View Stats" className="icon" />
              </motion.button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content align="start" side="right">
                <motion.div
                  initial={{ scale: 0, y: -30, x: -60 }}
                  animate={{ scale: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.6, type: "spring" }}
                  layout
                  className="popover-container"
                >
                  {children}
                </motion.div>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </motion.li>
    );
  }
  return (
    <motion.li
      className="info-card"
      variants={{
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 },
      }}
    >
      <span className="info-card-label">{label}</span>
      <br />
      <span className="info-card-value">{value}</span>
    </motion.li>
  );
}

export default InfoCard;
