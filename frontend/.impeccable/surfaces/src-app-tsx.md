---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: []
---

# Surface: Aula app (whole frontend)

Mode: Operate. Audience, job and constraints live in PRODUCT.md (frontend/.impeccable/PRODUCT.md).
Working name "Aula" is a placeholder until the product is named.

## Decisions confirmed by the user
- AD answers: print/export, then upload; no student UI.
- Depth: all 7 screens work; Dashboard → Profile and exam adaptation get the deepest polish.
- Exam versions: one per need, plus a combined version for students with more than one declared need.
- Neurodivergence data is declared only.

## Direction contract
THESIS: A blunt single-hue blue instrument where the only warm colour is the data. Refuses both the soft SaaS dashboard and playful neo-brutalism: no stickers, tilts or decoration, every line does a job.
OWN-WORLD: Palette pinned by the user: #005187 ink on #fcffff paper, #4d82bc chart reference marks, #84b6f4 hard shadows, #c4dafa surfaces; zero radius, 2-3px solid rules, hard 4px offset shadows, Archivo at heavy weights and wide stretch for headings, Geist Mono for data. Score scale from lib/score.ts: red, yellow and green, the conventional heatmap, kept apart from the UI palette.
STORY: The teacher reads the class in the heatmap, opens a student as a sheet without losing the class, reads a respectful draft, and approves it. Every AI output repeats this gesture.
FIRST VIEWPORT: Black-ruled sidebar with the active item inverted; top bar ruled off with breadcrumb, search and notifications; heavy title and filters; a ruled four-cell KPI strip; then the heatmap as the page's main object, with the continuous legend above it. Primary action sits on the profile sheet: "Revisar e aprovar perfil".
FORM: Neo-brutalist minimalism, pinned by the user's brief; no roll. Signature interaction: a draft is a dashed sheet with crop marks, and approval stamps it solid. Motion grammar: short springs, press-into-shadow. Kept raises: one centre rail in the exam diff; nothing disappears, rejected items stay struck; one legend threshold drives the grid with a readout; focus rails on row and column; one sheet form at every scale. The accent-reserved raise is retired: no accent exists.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
