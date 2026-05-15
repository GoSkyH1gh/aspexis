export async function downloadElementScreenshot(
  element: HTMLElement,
  filename: string,
) {
  const { toPng } = await import("html-to-image");

  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 1,
    backgroundColor: "#373945",
    height: element.scrollHeight,
    style: {
      overflow: "visible",
      maxHeight: "none",
    },
    fontEmbedCSS: "",
  });

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
