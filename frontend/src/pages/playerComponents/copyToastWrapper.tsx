import { Toast } from "radix-ui";
import { useState, ReactNode } from "react";
import { createPortal } from "react-dom";

type CopyToastWrapperProps = {
  children: (handleCopy: (text: string) => void) => ReactNode;
  toastMessage?: string;
};

export default function CopyToastWrapper({
  children,
  toastMessage = "Copied to clipboard!",
}: CopyToastWrapperProps) {
  const [open, setOpen] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setOpen(true);
  };

  return (
    <>
      {children(handleCopy)}

      {typeof document !== "undefined" &&
        createPortal(
          <Toast.Provider swipeDirection="right">
            <Toast.Root
              open={open}
              onOpenChange={setOpen}
              duration={3000}
              className="ToastRoot"
            >
              <Toast.Title className="ToastTitle">{toastMessage}</Toast.Title>
            </Toast.Root>
            <Toast.Viewport
              className="ToastViewport"
              style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100 }}
            />
          </Toast.Provider>,
          document.body,
        )}
    </>
  );
}
