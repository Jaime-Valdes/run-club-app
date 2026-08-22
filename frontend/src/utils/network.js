const networkHost = import.meta.env.VITE_NETWORK_HOST;

export const checkInOrigin = networkHost
  ? `${window.location.protocol}//${networkHost}${window.location.port ? `:${window.location.port}` : ""}`
  : window.location.origin;
