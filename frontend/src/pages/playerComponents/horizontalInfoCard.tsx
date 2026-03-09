import { motion } from "motion/react";
import ArrowOutward from "/src/assets/arrow-outward.svg";
import { Popover } from "radix-ui";
import { ReactNode } from "react";

type HorizontalInfoCardProps = {
  label: string;
  value: string | number | ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  fullWidth?: boolean;
};

function HorizontalInfoCard({
  label,
  value,
  imageSrc,
  imageAlt,
  fullWidth = false,
}: HorizontalInfoCardProps) {
  return (
    <div
      className={`horizontal-info-card-item ${fullWidth ? "horizontal-info-card-full-width" : ""}`}
    >
      {imageSrc && (
        <img
          src={imageSrc}
          alt={imageAlt}
          className="horizontal-info-card-image"
        />
      )}

      <span className="horizontal-info-card-number">{value}</span>
      <span className="horizontal-info-card-label">{label}</span>
    </div>
  );
}

export default HorizontalInfoCard;
