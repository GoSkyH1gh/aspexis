import { ReactNode } from "react";
import { Progress } from "radix-ui";

type HorizontalInfoCardProps = {
  label: string;
  value: string | number | ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  fullWidth?: boolean;
  progress?: number;
};

function HorizontalInfoCard({
  label,
  value,
  imageSrc,
  imageAlt,
  fullWidth = false,
  progress,
}: HorizontalInfoCardProps) {
  return (
    <div
      className={`horizontal-info-card-item ${fullWidth ? "horizontal-info-card-full-width" : ""}`}
    ><div className="horizontal-info-card-content">
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
      {progress !== undefined && <Progress.Root
        className="CardProgressRoot"
        max={100}
        value={progress}
      >
        <Progress.Indicator
          className="CardProgressIndicator"
          style={{
            transform: `translateX(-${100 - (progress / 100) * 100}%)`,
          }}
        />
      </Progress.Root>}
    </div>
  );
}

export default HorizontalInfoCard;
