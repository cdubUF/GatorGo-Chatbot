# Expansion artwork provenance and prompts

Mode: built-in image generation. These are project assets, copied into `frontend/assets/`; no runtime dependency on the generator or the original Downloads files.

## Stadium resort

Saved as `frontend/assets/stadium-resort.png`.

Prompt:

> Use case: stylized-concept. Create a high quality wide landscape BACKGROUND ASSET for GatorGo resort concierge web app. A playful yet luxurious fictional fusion of University of Florida's Ben Hill Griffin football stadium and a tropical resort: recognizable large football grandstands and blue stadium architecture in middle distance with green football field, viewed from an elegant shaded poolside cabana terrace, turquoise swimming pool, palm trees, tropical planting, ivory umbrellas and lounge chairs in foreground. Bright Florida daylight, immersive polished 3D animated-film environment, realistic materials. Color story rich royal blue and lush gator green, turquoise water, warm ivory stone. Spacious middle foreground for overlaying a character. No characters, no people, no interface, no captions, no watermark. 1536x1024 landscape.

## Mascot atlas

Saved as `frontend/assets/gator-atlas.png`. Reference: user-provided `17d1fcf9-6440-4739-8f70-a0b887d2a269.png`. Transparent-background generation enabled. The provided cabana screenshot also informed the HTML/CSS composition; it is not a screenshot used as a substitute for working controls.

Prompt:

> Use case: stylized-concept. Reference image is visual character/style reference, not an edit target. Produce ONE production sprite atlas with transparent background. Exactly THREE columns and TWO rows, six equal square cells in a precise 3x2 grid, no gaps. 1536x1024 total. Each cell contains a waist-up friendly beautifully rendered 3D green alligator concierge from the reference, frontal slight three-quarter toward viewer, arms comfortably down, head fully visible. Column 1 Front Desk Gator wearing navy blue blazer and golden neck scarf, column 2 Poolside Gator wearing blue visor and blue-white striped polo, column 3 Trail Guide Gator wearing tan ranger hat and tan shirt. TOP ROW all three have closed smiling mouths. BOTTOM ROW identical matching positions, scales, bodies, heads and lighting to top row, change ONLY lower jaw to open speaking mouth with small white teeth and warm pink mouth. Exact matched positioning between rows essential for mouth animation frames. Friendly expressive brown eyes, bright lime-green textured scales and pale yellow jaw. Clean transparent background throughout, no lettering or badges with text, no UI, no scenery, no borders. Separate silhouettes entirely inside their own cells with a little margin.

A follow-up transparency variant was generated but not selected. The original atlas rendered with transparent alpha correctly in the browser. CSS selects the guide's column and alternates rows only during actual speech playback; reduced-motion keeps the closed-mouth frame static. Clicking or keyboard-activating the guide gives a greeting gesture. This provides moving-mouth interaction, not a phoneme-aligned facial rig.

Speech integration was checked against the [official OpenAI transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text).


## Live cabana revision
Built-in image generation produced `frontend/assets/gator-blink.png` by editing the existing 3x2 atlas: preserve exact positions, costumes and mouth poses; change all eyes to closed eyelids; transparent background. Original output: exec-93fef628-87e8-4b4c-86f5-c723e230643d.png.

Built-in image generation produced `frontend/assets/outdoor-desk.png`: photorealistic honey-teak outdoor cabana desk, transparent upper space, blue laptop on left, pineapple drink and hibiscus on right, straight-on seated guest view, no character or text. Original output: exec-31e124e6-b0e9-4b97-b974-9202a7ae5902.png. Originals remain in the Codex generated_images directory.


## Poolside guide backdrop (twenty-ticket expansion)
Built-in image generation; final asset `frontend/assets/poolside-cabana.png`. Prompt: photorealistic wide sunny poolside cabana, blue/green accents, white curtains, teak roof, turquoise lagoon, palms, blue-cushioned loungers, open center foreground for existing sprite/desk layers; no people, character, desk, or lettering. Original generated output `exec-48a89158-40e8-4b81-bef2-5cd6a32f1ebf.png` retained in the Codex generated_images directory.
