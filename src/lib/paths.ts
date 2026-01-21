export const getBase = () => {
  const base = import.meta.env.BASE_URL ?? "/";
  if (base !== "/") {
    return base.endsWith("/") ? base : `${base}/`;
  }
  const site = import.meta.env.SITE;
  if (site) {
    const sitePath = new URL(site).pathname;
    if (sitePath && sitePath !== "/") {
      return sitePath.endsWith("/") ? sitePath : `${sitePath}/`;
    }
  }
  return "/";
};

export const withBase = (path: string) => {
  const base = getBase();
  const cleaned = path.replace(/^\/+/, "");
  return `${base}${cleaned}`;
};
