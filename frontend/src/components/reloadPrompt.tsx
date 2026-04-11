// @ts-expect-error virtual module from vite-plugin-pwa
import { useRegisterSW } from "virtual:pwa-register/react";

export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: any) {
      // Check for updates
      if (r) {
        setInterval(
          () => {
            r.update();
          },
          10 * 60 * 1000,
        );
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="reload-prompt-container">
      <div className="reload-prompt-message">
        New update available! <br />
        Refresh to get the latest features.
      </div>
      <div className="reload-prompt-buttons">
        <button
          onClick={() => {
            updateServiceWorker(true);
            setNeedRefresh(false);
            // Failsafe in case workbox-window controllerchange event fails locally
            setTimeout(() => window.location.reload(), 1500);
          }}
          className="reload-prompt-button reload-prompt-button-primary"
        >
          Refresh App
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="reload-prompt-button reload-prompt-button-secondary"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
