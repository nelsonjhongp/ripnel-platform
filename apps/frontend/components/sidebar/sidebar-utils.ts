import type { SidebarItem } from "./sidebar-config";

export function isRouteActive(pathname: string, url: string) {
  return pathname === url || pathname.startsWith(`${url}/`);
}

export function resolveActiveItemIndex(items: SidebarItem[], pathname: string) {
  const exactIndex = items.findIndex((item) => pathname === item.url);

  if (exactIndex !== -1) {
    return exactIndex;
  }

  let bestIndex = -1;
  let bestLength = -1;

  items.forEach((item, index) => {
    if (!pathname.startsWith(`${item.url}/`)) {
      return;
    }

    if (item.url.length > bestLength) {
      bestIndex = index;
      bestLength = item.url.length;
    }
  });

  return bestIndex;
}
