import type { InitialState } from './app';

export default (initialState: InitialState) => {
  const roles = initialState?.roles || [];
  const isAuthenticated = Boolean(initialState?.token);
  const canSeeAdmin = roles.includes('ADMIN');

  return {
    isAuthenticated,
    canSeeAdmin,
  };
};
