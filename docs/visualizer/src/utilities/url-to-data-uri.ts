function blobToDataUrl(blob: any) {
  const FR = new FileReader();
  return new Promise((resolve, reject) => {
    FR.onerror = () => {
      FR.abort();
      reject(new DOMException("Problem parsing input file."));
    };

    FR.onload = () => {
      resolve(FR.result);
    };

    FR.readAsDataURL(blob);
  });
}

export async function urlToDataUri(url: string) {
  const image = await fetch(url);
  const blob = await image.blob();
  const dataUrl = await blobToDataUrl(blob);
  return dataUrl as string;
}
