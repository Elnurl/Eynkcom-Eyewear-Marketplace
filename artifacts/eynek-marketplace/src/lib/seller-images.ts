export function sellerImageUrl(image: string) {
  if (image.startsWith('data:') || image.startsWith('http')) return image;
  if (image.startsWith('/objects/')) return `/api/storage${image}`;
  const sampleName = /^product-images\/(mimoza-02|sahil-11|nisan-07|xezer-air|luna-24|merdekan-03|iceriseher-09|caspian-sun)\.jpg$/.exec(image)?.[1];
  if (sampleName) return `${import.meta.env.BASE_URL}product-images/${sampleName}-cutout.png`;
  return `${import.meta.env.BASE_URL}${image}`;
}