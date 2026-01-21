import { motion } from "motion/react";
import { useState, useEffect, useRef } from "react";
import WynncraftTabbedData from "./wynncraftTabbedData";
import DonutTabbedData from "./donutTabbedData";
import McciTabbedData from "./mcciTabbedData";
import HypixelTabbedData from "./hypixelTabbedData";
import LoadingIndicator from "./loadingIndicator";
import {
  HypixelFullData,
  WynncraftPlayerSummary,
  WynncraftGuildInfo,
  DonutPlayerStats,
  McciPlayer,
} from "../../client";

type AdvancedInfoProps = {
  hypixelData: HypixelFullData | null | undefined;
  hypixelStatus: "error" | "success" | "pending";
  hypixelGuildQuery: any; // UseInfiniteQueryResult with InfiniteData wrapper
  wynncraftData: WynncraftPlayerSummary | undefined | null;
  wynncraftStatus: "pending" | "error" | "success";
  wynncraftGuildData: WynncraftGuildInfo | null | undefined;
  donutData: DonutPlayerStats | null | undefined;
  donutStatus: "pending" | "success" | "error";
  mcciData: McciPlayer | null | undefined;
  mcciStatus: "pending" | "success" | "error";
  loadedTabs: string[];
  uuid: string;
};

function AdvancedInfoTabs({
  hypixelData,
  hypixelGuildQuery,
  hypixelStatus,
  wynncraftData,
  wynncraftStatus,
  wynncraftGuildData,
  donutData,
  donutStatus,
  mcciData,
  mcciStatus,
  loadedTabs,
  uuid,
}: AdvancedInfoProps) {
  const [selectedTab, setSelectedTab] = useState<string | undefined>(undefined);
  const TAB_PRIORITY = ["hypixel", "wynncraft", "donut", "mcci"] as const;
  const hasAutoSelected = useRef(false);

  useEffect(() => {
    if (hasAutoSelected.current) return;

    const timeout = setTimeout(() => {
      const firstAvailable = TAB_PRIORITY.find((tab) =>
        loadedTabs.includes(tab),
      );

      if (firstAvailable) {
        setSelectedTab(firstAvailable);
        hasAutoSelected.current = true;
      }
    }, 100); // sweet spot: 100–150ms

    return () => clearTimeout(timeout);
  }, [loadedTabs]);

  let tabContents;
  if (selectedTab === "hypixel") {
    {
      if (hypixelStatus === "pending") {
        tabContents = (
          <>
            <br />
            <LoadingIndicator />
          </>
        );
      }
    }
    if (hypixelStatus === "success") {
      if (hypixelData) {
        tabContents = (
          <HypixelTabbedData
            hypixelData={hypixelData}
            hypixelGuildQuery={hypixelGuildQuery}
          />
        );
      }
    }
  } else if (selectedTab === "wynncraft") {
    if (wynncraftStatus === "success") {
      if (!wynncraftData) {
        tabContents = <p>No data to show</p>;
      } else {
        tabContents = (
          <WynncraftTabbedData
            wynncraftData={wynncraftData}
            wynncraftGuildData={wynncraftGuildData}
          />
        );
      }
    } else if (wynncraftStatus === "pending") {
      tabContents = <p>Loading Wynncraft data...</p>;
    }
  } else if (selectedTab === "donut") {
    if (donutStatus === "pending") {
      tabContents = <p>loading donut data...</p>;
    } else if (donutStatus === "success") {
      tabContents = <DonutTabbedData donutData={donutData} uuid={uuid} />;
    }
  } else if (selectedTab === "mcci") {
    if (mcciStatus === "pending") {
      tabContents = <p>loading MCC Island data...</p>;
    } else if (mcciStatus === "success") {
      tabContents = <McciTabbedData mcciData={mcciData} />;
    }
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut", delay: 0.4 }}
      className="advanced-info-tabs"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeInOut", delay: 0.6 }}
        className="advanced-tabs"
      >
        {loadedTabs.includes("hypixel") && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setSelectedTab("hypixel")}
            className={"hypixel" === selectedTab ? "selected-tab" : ""}
          >
            Hypixel
          </motion.button>
        )}
        {loadedTabs.includes("wynncraft") && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setSelectedTab("wynncraft")}
            className={"wynncraft" === selectedTab ? "selected-tab" : ""}
          >
            Wynncraft
          </motion.button>
        )}
        {loadedTabs.includes("donut") && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setSelectedTab("donut")}
            className={"donut" === selectedTab ? "selected-tab" : ""}
          >
            Donut SMP
          </motion.button>
        )}
        {loadedTabs.includes("mcci") && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={() => setSelectedTab("mcci")}
            className={"mcci" === selectedTab ? "selected-tab" : ""}
          >
            MCC Island
          </motion.button>
        )}
      </motion.div>
      <div>{tabContents}</div>
    </motion.div>
  );
}

export default AdvancedInfoTabs;
