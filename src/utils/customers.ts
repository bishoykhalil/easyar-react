export const formatCustomerLabel = (name?: string, city?: string) => {
  const cleanName = (name || '').trim();
  const cleanCity = (city || '').trim();
  if (cleanName && cleanCity) return `${cleanName} - ${cleanCity}`;
  return cleanName || cleanCity || '';
};
