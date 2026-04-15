import { ReactNode } from "react";
import { useToast } from "../../components/ToastProvider";

type CopyToastWrapperProps = {
  children: (handleCopy: (text: string) => void) => ReactNode;
  toastMessage?: string;
};

export default function CopyToastWrapper({
  children,
  toastMessage = "Copied to clipboard!",
}: CopyToastWrapperProps) {
  const { addToast } = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast({ message: toastMessage, type: "success", duration: 3000 });
  };

  return <>{children(handleCopy)}</>;
}
