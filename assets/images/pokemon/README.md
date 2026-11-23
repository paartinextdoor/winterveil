# Pokémon artwork

Drop the final artwork for each Pokémon in this folder using these exact names:

| File | Pokémon |
|---|---|
| w001.png | Snoozlet |
| w002.png | Dozemore |
| w003.png | Napnarch |
| w004.png | Humbleat |
| w005.png | Mixipod |
| w006.png | Chartitan |
| w007.png | Flixkit |
| w008.png | Bingeowl |
| w009.png | Reelflare |
| w010.png | Firawn |
| w011.png | Wrappup |
| w012.png | Candlit |
| w013.png | Sleighvern |
| w014.png | Noelumia |
| w015.png | Harmona |

**Format:** square PNG with a transparent background, 512×512 or larger, with the Pokémon centred.
The transparent background matters. The locked "silhouette" look is made by blacking out the image.

If a file is missing, the app automatically draws a placeholder creature instead.

**Replacing a picture later?** Phones keep a saved copy for offline use. If you swap in a new version of a file
that's already published, change `MEDIA = "winterveil-media-v1"` to `v2` (then `v3`…) in `sw.js`.
Adding a file that didn't exist before needs nothing extra.
To use a different file name or format (e.g. `.webp`), change `artwork.src` for that Pokémon in `data/pokemon.json`.
