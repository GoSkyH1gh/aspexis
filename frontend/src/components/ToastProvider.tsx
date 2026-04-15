import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { Toast } from "radix-ui";

export type ToastMessage = {
  id: string;
  message: string;
  type?: "error" | "success" | "info";
  duration?: number;
};

interface ToastContextType {
  addToast: (toast: Omit<ToastMessage, "id">) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function GlobalToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((toast: Omit<ToastMessage, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      <Toast.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <Toast.Root
            key={toast.id}
            duration={toast.duration || 5000}
            className={toast.type === "error" ? "ToastRoot ToastError" : "ToastRoot"}
            onOpenChange={(open) => {
              if (!open) {
                setTimeout(() => {
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }, 150);
              }
            }}
          >
            <Toast.Title className="sr-only">
              {toast.type === "error" ? "Error" : "Notification"}
            </Toast.Title>
            <Toast.Description className="ToastTitle">{toast.message}</Toast.Description>
          </Toast.Root>
        ))}
        <Toast.Viewport
          className="ToastViewport"
          style={{ position: "fixed", bottom: 20, right: 20, zIndex: 100000 }}
        />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}
