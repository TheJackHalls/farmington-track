export const getBase = () => {
  const base = import.meta.env.BASE_URL ?? "/";
  return base.endsWith("/") ? base : `${base}/`;
};

export const withBase = (path: string) => {
  const base = getBase();
  const cleaned = path.replace(/^\/+/, "");
  return `${base}${cleaned}`;
};
