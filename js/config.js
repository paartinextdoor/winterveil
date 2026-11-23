// ===========================================================
// App settings: the only file you normally need to edit.
// ===========================================================

const params = new URLSearchParams(location.search);

export const CONFIG = {
  // Shown in the Home greeting ("Good evening, ___").
  trainerName: "Jonathan",

  // Region / event copy
  regionName: "Winterveil",
  eventSubtitle: "Winter Research Event · December 1–25",

  // The Christmas ending, shown the first time Harmona is unlocked.
  // It can be replayed from Harmona's Pokédex page.
  // The title, message and sign-off are LOCKED with the Harmona gift code, so the public
  // repo can't spoil them. To change them, open tools/message-locker.html (via Live Server)
  // and paste the result over `locked` below.
  // To preview: on Live Server open the site with ?dev, redeem the Harmona code, then Reset on Achievements.
  ending: {
    pokemonId: "W015",
    eyebrow: "Winterveil Research Complete",
    button: "Back to the Pokédex",
    locked: "QoXgRbpZ3lLNzK1VSiMk/9pqnrcM5sGpL3ICMexua/SUMohLxxWddp+Esogu6LJWOZrj3G0Rc6nnBGVEVpBQo3pk1qeuu3fp6VYWwOSyUptGRWyaCUyyogKZVfDsWdfXjHNfxEW82ainG5XuLLnY6kKEvh8MatCYeV9fIqCxILiC5I7qQJa/fQYNOn56jnkEd+LM/aFw2UoWB7yj7Lubbs6GWQY3Xf3AcNUQF4ysQ1hRjOvU/V2jrHAIZ+fQbnppLxN+I61tioS2kNJnWUWi62NJQBsoJEeCJF1Zm5n9MRxsbuELlbpp8HQJJMwMvmlM75pfi0Jk",
  },

  // LocalStorage key. Changing it starts everyone from zero.
  storageKey: "winterveil.save.v1",

  // Add ?dev to the URL for testing tools on the Achievements tab.
  // On your computer (Live Server) it also ignores code dates and adds Unlock-all / Preview.
  // On the live site it ONLY shows "Reset all progress", so nobody can open gifts early.
  dev: params.has("dev") && ["localhost", "127.0.0.1"].includes(location.hostname),
  devReset: params.has("dev"),
};
