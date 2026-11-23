// ===========================================================
// Achievement rules. Evaluated after every unlock / entry view / favorite.
// ===========================================================
import { db } from "./data.js";
import { store } from "./store.js";
import { toast } from "./ui.js";
import { play } from "./sound.js";

/** How far along a rule is: { have, need }. */
export function progress(rule) {
  switch (rule.type) {
    case "count":     return { have: store.unlockedCount(), need: rule.min };
    case "all":       return { have: rule.ids.filter(store.isUnlocked).length, need: rule.ids.length };
    case "any":       return { have: rule.ids.some(store.isUnlocked) ? 1 : 0, need: 1 };
    case "viewed":    return { have: store.state.viewed.length, need: rule.min };
    case "favorites": return { have: store.favoriteCount(), need: rule.min };
    default:          return { have: 0, need: 1 };
  }
}

const ruleMet = (rule) => {
  const { have, need } = progress(rule);
  return have >= need;
};

/** Grants any newly earned achievements and returns them. */
export function syncAchievements() {
  return db.achievements.filter((a) => !store.hasAchievement(a.id) && ruleMet(a.rule) && store.grantAchievement(a.id));
}

export function announce(list) {
  list.forEach((a, i) =>
    setTimeout(() => {
      toast({ icon: a.icon, title: "Achievement Unlocked", text: a.name });
      play("achievement");
    }, i * 700));
}

export const earnedCount = () => db.achievements.filter((a) => store.hasAchievement(a.id)).length;
