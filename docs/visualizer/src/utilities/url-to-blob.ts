export async function urlToBlob(imageUrl: string) {
  const response = await fetch(imageUrl); // fetch promise
  const blob = await response.blob(); // blob promise
  return blob;
}
