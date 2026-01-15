export const formatPriceItemLabel = (
  name?: string,
  description?: string,
  maxDescLength = 60,
) => {
  const cleanName = (name || '').trim();
  const cleanDesc = (description || '').trim();
  if (!cleanDesc) return cleanName;
  const truncatedDesc =
    cleanDesc.length > maxDescLength
      ? `${cleanDesc.slice(0, Math.max(0, maxDescLength - 3))}...`
      : cleanDesc;
  if (!cleanName) return truncatedDesc;
  return `${cleanName} - ${truncatedDesc}`;
};
