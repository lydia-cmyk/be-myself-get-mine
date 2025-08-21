export const LS_PROJECTS = "pm:projects:v1";
export const LS_ACTIVE   = "pm:activeIndex:v1";
export const LS_UPDATED  = "pm:updatedAt";

export function loadLocal() {
  try {
    return {
      projects: JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]"),
      activeIndex: JSON.parse(localStorage.getItem(LS_ACTIVE) || "-1"),
      updatedAt: Date.parse(localStorage.getItem(LS_UPDATED) || "0") || 0,
    };
  } catch { return { projects: [], activeIndex: -1, updatedAt: 0 }; }
}

export function saveLocal(projects, activeIndex) {
  try {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(projects));
    localStorage.setItem(LS_ACTIVE, JSON.stringify(activeIndex));
    localStorage.setItem(LS_UPDATED, new Date().toISOString());
  } catch {}
}

// Firestore Timestamp(toMillis) vs local ms → latest-wins
export function resolve(local, cloud) {
  if (!cloud) return local;
  const cloudTime = cloud.updatedAt?.toMillis ? cloud.updatedAt.toMillis() : 0;
  return cloudTime >= (local.updatedAt || 0)
    ? { projects: cloud.projects || [], activeIndex: cloud.activeIndex ?? -1, updatedAt: cloudTime }
    : local;
}
