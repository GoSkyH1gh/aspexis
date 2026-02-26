import { motion } from "motion/react";
import ArrowOutward from "/src/assets/arrow-outward.svg";
import { Popover } from "radix-ui";
import { ReactNode } from "react";
import { Tooltip } from "radix-ui";
import { Icon } from "@iconify/react";

// can't use both hasStats and tooltip at the same time
type BaseProps = {
  label: string;
  value: string | number | ReactNode;
  onClick?: () => void;
  children?: ReactNode;
  onlineIndicator?: boolean;
};

type WithStats = BaseProps & {
  hasStats: true;
  tooltip?: never;
};

type WithTooltip = BaseProps & {
  tooltip: string;
  hasStats?: false;
};

type Plain = BaseProps & {
  hasStats?: false;
  tooltip?: null;
};

type InfoCardProps = WithStats | WithTooltip | Plain;

const StatusDot = () => {
  return (
    <div
      className="status-dot"
      aria-hidden="true"
      role="status"
      aria-live="polite"
    >
      <div />
    </div>
  );
};

function InfoCard({
  label,
  value,
  onClick,
  hasStats = false,
  tooltip = null,
  onlineIndicator = false,
  children,
}: InfoCardProps) {
  if (hasStats) {
    return (
      <motion.li
        className="info-card info-card-stats"
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: { opacity: 1, y: 0 },
        }}
      >
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              onClick={onClick}
              className="info-card-button-wrapper info-card"
            >
              <div className="info-card-content-wrapper">
                <span className="info-card-label">{label}</span>
                <br />
                <span className="info-card-value">
                  {onlineIndicator && <StatusDot />}

                  {value}
                </span>
              </div>
              <Tooltip.Root delayDuration={150}>
                <Tooltip.Trigger asChild>
                  <div className="info-card-icon-wrapper">
                    <Icon
                      icon="material-symbols:query-stats-rounded"
                      height={20}
                      width={20}
                    />
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content className="TooltipContent">
                    View Distribution
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </button>
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
      </motion.li>
    );
  }
  if (tooltip != null) {
    return (
      <Tooltip.Root delayDuration={50}>
        <Tooltip.Trigger asChild>
          <motion.li
            className="info-card"
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0 },
            }}
          >
            <span className="info-card-label">{label}</span>
            <br />
            <span className="info-card-value">
              {onlineIndicator && <StatusDot />}
              {value}
            </span>
          </motion.li>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="TooltipContent">
            {tooltip}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
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
      <span className="info-card-value">
        {onlineIndicator && <StatusDot />}
        {value}
      </span>
    </motion.li>
  );
}

export default InfoCard;
