import { motion } from "motion/react";
import { useState, useEffect } from "react";

type CapeShowcaseProps = {
  cape_showcase_b64: string | null;
  cape_back_b64: string | null;
  has_cape: boolean;
  cape_name: string | null;
};

function CapeShowcase({
  cape_showcase_b64,
  cape_back_b64,
  has_cape,
  cape_name,
}: CapeShowcaseProps) {
  const defaultCapePath = "data:image/png;base64," + cape_showcase_b64;
  const hoveredCapePath = "data:image/png;base64," + cape_back_b64;
  const [currentImage, setCurrentImage] = useState(defaultCapePath);

  useEffect(() => {
    setCurrentImage(defaultCapePath);
  }, [cape_showcase_b64, cape_back_b64]);

  const handleMouseEnter = () => {
    setCurrentImage(hoveredCapePath);
  };

  const handleMouseLeave = () => {
    setCurrentImage(defaultCapePath);
  };

  if (has_cape) {
    return (
      <motion.div
        className="cape-section"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, type: "spring", delay: 0.1 }}
      >
        <img
          src={currentImage}
          className="cape-showcase"
          alt="cape of searched player"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
        <div>
          <p className="info-card-label cape-name-label">Cape name</p>
          <p className="cape-name">{cape_name}</p>
        </div>
      </motion.div>
    );
  } else {
    return null;
  }
}

export default CapeShowcase;
