# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript with React Router. Motion for React (framer-motion) is the suggested animation library.

Frontend only: there is no backend yet. Every screen runs on realistic mock data behind a thin service layer (`src/services/*.ts` returning Promises), so it can be swapped for a real API later. Screens never import mock data directly.

Design tokens (color, type scale, spacing, radius, shadow, motion durations/easings) are defined once and used everywhere. The UI is component-driven, with reusable primitives: Button, Card, Badge, Tooltip, Dialog, Tabs, Table, EmptyState, Skeleton.

## Users

**Primary:** school and university teachers. They are busy, not always tech-savvy, and work on laptops and desktops, with tablets as a secondary device. Their job is to understand a class at a glance, see who needs what, and prepare fairer assessments, while trusting the AI's output without feeling replaced by it.

**Indirect:** students, including neurodivergent students. They do not use the product, but it is about them. Their data is sensitive.

## Product Purpose

An AI-powered pedagogical platform for teachers. Teachers organize exams by class and upload exams and graded answer sheets. A set of AI agents then:

- adapts exam questions for neurodivergent students (color blindness, ADHD, autism/ASD, dyslexia, dyscalculia);
- builds a pedagogical profile for each student: competencies, a 1–100 performance score, and whether a gap looks technical or related to a declared need;
- generates diagnostic assessments tailored to each student's profile.

The core of the product is a data dashboard: a heatmap of class performance by subject subtopic (for example, law of sines and law of cosines), from which the teacher can drill into any student's profile.

Success for a teacher means understanding a class in moments and leaving with an action they trust and have approved.

**Current goal:** a hackathon demo. A complete, convincing guided story for judges on one seeded class. Depth on the core flow beats breadth.

## Positioning

A teaching assistant, not a surveillance or analytics tool. It connects what a class got wrong to what each student needs, and turns that into adapted exams and diagnostics the teacher reviews and approves. The teacher stays the author of every decision.

## Operating Context

The core workflow, in order:

1. Organize exams by class.
2. Upload an exam and its graded answer sheets.
3. Read the class heatmap by subtopic.
4. Drill into a student's profile.
5. Review and approve what the AI produced: adapted questions, profiles, and diagnostic assessments.

Terminology is in Brazilian Portuguese, and subject content uses the vocabulary of the teacher's discipline.

## Capabilities and Constraints

- **Teacher approval is mandatory.** Nothing the AI produces reaches a student or becomes final until the teacher has reviewed and approved it.
- **Neurodivergence information is declared only.** It comes solely from what the school or family records. The AI uses declared needs to adapt exams and to read a student's gaps, but never suggests, infers, or hints at neurodivergence for a student without a declared need.
- For a student with no declared need, a gap reads only as technical/pedagogical. The "technical or related to neurodivergence" reading exists only where a need was declared.
- All data in this stage is mock data served through the service layer.
- UI language: Brazilian Portuguese (pt-BR).

**Undecided:**

- Product name. The brief uses `[APP NAME]`; use a neutral working name until one is chosen.
- How declared needs are recorded, and by whom, inside the product.
- Authentication, roles, and multi-school organization.
- Real AI integration and how long processing takes.
- Data privacy and compliance details for real student data.

## Brand Commitments

**Personality:** direct, rigorous, trustworthy. A teaching assistant who states plainly what the data shows and leaves the decision to the teacher. Confident, never decorative.

**Voice:** respectful, never labeling or clinical, about students and their needs. The interface can be blunt; what it says about a student never is. The AI is present but not loud.

**Aesthetic direction, as stated by the user: neo-brutalist minimalism.**

- Strictly black and white: pure black, pure white, and at most two grays for secondary text and disabled states. No accent color yet.
- The score scale is the only color in the app. 0 is blue, 100 is red, interpolated smoothly in OKLCH with even lightness steps, and applied to every chart that encodes the 1–100 score. Its legend is a continuous bar with ticks at 0, 25, 50, 75 and 100.
- Thick solid black borders, 2–3px, on cards, inputs, buttons, the sidebar, and table and heatmap cells.
- Hard offset shadows such as `4px 4px 0 #000`. No blur, no soft elevation, no translucency, and no gradients outside the heatmap.
- Zero border radius, as one consistent rule.
- Bold, confident typography: a strong grotesk for headings, with high contrast in size and weight, and plenty of whitespace. Minimal ornament: every element earns its place.
- A flat, crisp grid with strong alignment.
- Light theme first; tokens must make a dark theme possible.

**Anti-references:** soft, airy, or glassy interfaces; rounded corners; blurred shadows; pastel fills; color outside the score scale; generic admin templates; dense enterprise BI dashboards; purple-gradient "AI startup" clichés; cartoonish edtech or playful neo-brutalism with stickers and tilted shapes; gimmicky robot imagery; sparkle icons.

**Motion is part of the identity: snappy and mechanical.**

- Buttons and cards: on hover the hard shadow grows slightly; on press the element translates into its shadow and the shadow goes to zero.
- Sidebar collapse, page transitions, and shared-element transitions stay, on tight, low-bounce springs with short durations.
- Staggered entrances stay, crisper.
- Nothing floats, drifts, or fades slowly.

## Evidence on Hand

None yet: no real classes, students, exams, results, testimonials, or partner schools exist. Mock data must be realistic and use fictional students. Do not fabricate efficacy claims, accuracy figures, adoption numbers, or endorsements.

## Product Principles

1. **The teacher decides.** The AI proposes, the teacher reviews and approves. Every AI output is visibly a draft until then.
2. **Understood at a glance.** A busy teacher should grasp a class quickly, with detail available on demand and not imposed.
3. **Dignity before data.** Students are people, not risk scores. Language and presentation must never label, rank, or expose them.
4. **Never presume a need.** Only declared needs exist in the product. The AI does not speculate about who a student is.
5. **Accessibility is the mission.** A product about inclusive assessment has to be inclusive itself; this is not a compliance layer.

## Accessibility & Inclusion

Non-negotiable, because it is the product's purpose:

- WCAG AA contrast minimum.
- Never color alone. The score scale rises evenly in lightness, so its order survives grayscale and color-vision differences; values stay in the cells by default, with exact values on hover and focus and patterns on demand. Blue-to-red is weaker than a single-hue ramp for red-blind and blue-blind readers, so these secondary signals are required, not optional extras.
- Full keyboard navigation, visible focus states, semantic HTML, and ARIA where needed.
- Dyslexia-friendly reading options: comfortable line length and spacing, and an optional font switch.
- Fully respect `prefers-reduced-motion`, plus an in-app "reduce motion" toggle.
