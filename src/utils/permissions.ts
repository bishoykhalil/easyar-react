export type Permission = string;

export const hasPermission = (
  permissions: Permission[] | undefined,
  required: Permission | Permission[],
): boolean => {
  if (!permissions || permissions.length === 0) return false;
  const set = new Set(permissions);
  if (Array.isArray(required)) {
    return required.some((p) => set.has(p));
  }
  return set.has(required);
};
