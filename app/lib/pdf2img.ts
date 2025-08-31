export interface PdfConversionResult {
  imageUrl: string;
  file: File | null;
  error?: string;
}

export async function convertPdfToImage(
  file: File,
): Promise<PdfConversionResult> {
  if (typeof window === "undefined") {
    throw new Error("PDF conversion must run in the browser");
  }

  const pdfjsLib = await import("pdfjs-dist");
  const pdfWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");

  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          return resolve({
            imageUrl: "",
            file: null,
            error: "Failed to create image blob",
          });
        }
        const imageFile = new File(
          [blob],
          file.name.replace(/\.pdf$/i, "") + ".png",
          { type: "image/png" },
        );
        resolve({ imageUrl: URL.createObjectURL(blob), file: imageFile });
      }, "image/png");
    });
  } catch (err) {
    return { imageUrl: "", file: null, error: `Failed to convert PDF: ${err}` };
  }
}
