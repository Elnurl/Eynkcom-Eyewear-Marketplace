type Vendor = {
  initials: string;
  logoPath?: string | null;
  name: string;
};

function uploadedStoreImageUrl(path: string) {
  if (path.startsWith('/objects/')) return `/api/storage${path}`;
  return path;
}

export function VendorMark({ vendor }: { vendor: Vendor }) {
  if (vendor.logoPath) {
    return (
      <span className="store-mark store-mark--logo mp-store-mark">
        <img src={uploadedStoreImageUrl(vendor.logoPath)} alt={`${vendor.name} loqosu`} />
      </span>
    );
  }
  return <span className="store-mark mp-store-mark">{vendor.initials}</span>;
}
