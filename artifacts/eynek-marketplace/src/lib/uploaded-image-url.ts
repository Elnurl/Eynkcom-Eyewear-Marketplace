/** Public URL for seller uploads stored under /objects/uploads/… */
export function uploadedStoreImageUrl(path: string) {
  if (path.startsWith('data:') || path.startsWith('http')) return path;
  if (path.startsWith('/objects/')) return `/api/storage${path}`;
  if (path.startsWith('objects/')) return `/api/storage/${path}`;
  return path;
}
