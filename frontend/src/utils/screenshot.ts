export async function downloadElementScreenshot(
  element: HTMLElement,
  filename: string,
) {
  try {
    // Dynamically load html-to-image only when called, so it gets code-split
    const { toPng } = await import("html-to-image");

    const dataUrl = await toPng(element, {
      cacheBust: true, // Bypass browser cache bugs for images
      pixelRatio: 1, // Fixes Chrome SVG upscaling artifacts and 10MB sizes
      backgroundColor: "#373945", // Ensures transparent backgrounds don't render black
      height: element.scrollHeight, // Capture full scroll height, not just the visible viewport
      style: {
        overflow: "visible", // Remove overflow clipping on the cloned element
        maxHeight: "none",   // Remove any max-height constraint so all content renders
      },

      // Bypasses the Web Font parser entirely.
      // This fixes the 'TypeError: can't access property "trim", font is undefined' bug in Firefox (Gecko).
      // Since the Ability Tree only renders imagery and SVG backgrounds, skipping fonts won't affect the final image.
      fontEmbedCSS: "",
    });

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  } catch (error) {
    throw error;
  }
}
