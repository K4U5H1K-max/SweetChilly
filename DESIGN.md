# Geodetic Logistics Cartography — Design System Contract

> **Document Type:** Canonical Design System Specification  
> **System Name:** Geodetic Logistics Cartography (`NER-LOG-V2`)  
> **Domain:** NER Smart Logistics & Accessibility Intelligence Platform  
> **Status:** Production Design Contract  
> **Target File:** `DESIGN.md`  

---

## 1. Executive Summary & Design Ethos

The **NER Smart Logistics & Accessibility Intelligence Platform** approaches corridor disruption mapping and logistics intelligence as **rigorous, empirical terrain surveying**. The primary metaphor is that of a **geodetic survey team** mapping active landslides, corridor bottlenecks, and kinematic supply vectors across the North Eastern Region of India.

### Core Principles

1. **Cartographic Precision:** Interfaces are drafted rather than decorated. Every line, reticle, coordinate tick, and demarcated boundary corresponds to verified telemetry or probabilistic hazard modeling.
2. **Academic & Field Restraint:** Rejects all genre clichés—no neon wireframes, glowing green matrix terminals, digital locks, or sci-fi flares. The aesthetic reflects late-20th-century geological surveys, hydrographic navigation charts, and technical gazetteers.
3. **Calculated Urgency:** Critical intelligence is never screamed; it is localized. Baseline nominal states rest in quiet, low-relief surfaces, allowing the singular waypoint accent to draw immediate, unambiguous focus to predicted kinetic strike coordinates.
4. **Strict Color Exclusivity:** Optical contrast is resolved purely through the relationship between archival parchment and mineral ink. No UI component may introduce additional colors.

---

## 2. Color System & Strict Design Contract

The design system operates on a **strictly closed six-tone palette**. Pure white (`#FFFFFF`) and pure black (`#000000`) are forbidden.

### 2.1 CSS Custom Properties Token Definition

```css
:root {
  /* ==========================================================================
     CANONICAL SIX-TONE PALETTE (STRICT CONTRACT - NO ADDITIONAL COLORS ALLOWED)
     ========================================================================== */
  --parchment:    #EDE6D6; /* Universal root substrate & canvas */
  --contour:      #A99B7E; /* Structural line work, reticles, dividers, borders */
  --ink-navy:     #22303F; /* Dominant ink, primary text, high-confidence data */
  --terrain-low:  #C9C0A6; /* Low-relief surfaces, shelf headers, nominal states */
  --terrain-high: #8A6A4B; /* Elevated risk tiers, forecast cones, secondary alerts */
  --waypoint:     #C1522E; /* EXCLUSIVE: Predicted attack waypoint / next critical state */
}
```

### 2.2 Palette Architecture & Semantic Mapping

| Token Name | Hex Code | HSL Equivalent | Primary Semantic Role | Permitted Usage |
| :--- | :--- | :--- | :--- | :--- |
| `--parchment` | `#EDE6D6` | `hsl(41, 33%, 88%)` | **Universal Canvas Substrate** | Page backgrounds, root viewport, card bodies, table row alternate fills, unthreatened field zones. |
| `--contour` | `#A99B7E` | `hsl(41, 20%, 58%)` | **Geodetic Linework & Rules** | 1px component borders, coordinate reticles, lat/lon ticks, gridlines, inactive graph vectors, secondary labels. |
| `--ink-navy` | `#22303F` | `hsl(211, 29%, 19%)` | **Dominant Intellectual Voice** | Primary typography, document titles, solid primary command buttons, historical plotted trajectories, active nodes. |
| `--terrain-low` | `#C9C0A6` | `hsl(43, 27%, 72%)` | **Calibrated Baseline Relief** | Shelf header banners, low-gradient fills, nominal container panels, inactive status chips, table header dividers. |
| `--terrain-high` | `#8A6A4B` | `hsl(29, 29%, 42%)` | **Vector Expansion & Risk** | Elevated risk tiers, forecast trajectory vectors, feature attribution bars, category tags, secondary warning chips. |
| `--waypoint` | `#C1522E` | `hsl(15, 62%, 47%)` | **Critical Attack Waypoint** | **RESERVED EXCLUSIVELY** for predicted attack onset coordinates, breach waypoints, and catastrophic horizon beacons. |

### 2.3 Strict Exclusivity Rule for `--waypoint` (`#C1522E`)

> [!CAUTION]
> **STRICT CONTRACT VIOLATION WARNING:**  
> `#C1522E` may **ONLY** represent a predicted attack waypoint or the next critical predicted state.  
> - **Forbidden:** Using `#C1522E` for generic error messages, routine validation banners, decorative icons, general buttons, standard tags, or hover states on nominal components.  
> - **Mandatory:** Nominal warnings and elevated probability vectors must utilize `--terrain-high` (`#8A6A4B`). Only the confirmed forecasted breach coordinate / critical intercept waypoint may use `#C1522E`.

---

## 3. Typography Specification

Typography establishes an editorial balance between institutional publication and high-density computational telemetry.

### 3.1 Font Families

- **Headline & Display:** `IBM Plex Serif` (Weights: `600 SemiBold`) — Evokes institutional cartography, gazetteers, and academic publishing.
- **Body & Editorial:** `IBM Plex Sans` (Weights: `400 Regular`, `500 Medium`, `600 SemiBold`) — Neutral, high-legibility drafting prose.
- **Telemetry & Data Matrices:** `JetBrains Mono` (Weights: `400 Regular`, `500 Medium`, `600 SemiBold`) — Strict tabular alignment (`font-variant-numeric: tabular-nums;`) for timestamps, coordinates, hex addresses, and risk percentages.

### 3.2 Type Scale Hierarchy

| Token | Font Family | Size | Line Height | Tracking | Weight | Case / Transform | Application |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `display-lg` | IBM Plex Serif | `36px` (`2.25rem`) | `44px` (`2.75rem`) | `-0.02em` | `600` | Title Case | Hero display headlines, primary title statements |
| `display-sm` | IBM Plex Serif | `28px` (`1.75rem`) | `36px` (`2.25rem`) | `-0.01em` | `600` | Title Case | Section landmark titles, modal titles |
| `headline-lg` | IBM Plex Serif | `22px` (`1.375rem`) | `28px` (`1.75rem`) | `-0.01em` | `600` | Title Case | Major panel headlines, horizon section headers |
| `headline-md` | IBM Plex Serif | `18px` (`1.125rem`) | `24px` (`1.5rem`) | `0.00em` | `600` | Title Case | Card titles, module headers, brand wordmark |
| `body-lg` | IBM Plex Sans | `15px` (`0.9375rem`) | `22px` (`1.375rem`) | `+0.01em` | `400` | Sentence case | Lead paragraphs, conceptual methodologies |
| `body-md` | IBM Plex Sans | `13px` (`0.8125rem`) | `18px` (`1.125rem`) | `+0.01em` | `400` | Sentence case | Default interface copy, card body descriptions |
| `body-sm` | IBM Plex Sans | `11px` (`0.6875rem`) | `16px` (`1.0rem`) | `+0.015em` | `400` | Sentence case | Metric annotations, table details, footnotes |
| `label-lg` | JetBrains Mono | `13px` (`0.8125rem`) | `18px` (`1.125rem`) | `+0.04em` | `500` | Uppercase | Navigation links, primary command actions |
| `label-md` | JetBrains Mono | `11px` (`0.6875rem`) | `16px` (`1.0rem`) | `+0.06em` | `500` | Uppercase | Shelf headers, metric labels, button labels |
| `label-sm` | JetBrains Mono | `9px` (`0.5625rem`) | `12px` (`0.75rem`) | `+0.08em` | `500` | Uppercase | Coordinate ticks, datums, micro-chips, timestamps |

---

## 4. Spacing System & Grid Layout

The layout behaves like a **precision drafting board** built on a strict **4px baseline sub-grid**.

### 4.1 Spacing Scale

```css
:root {
  --space-2xs:    0.125rem; /* 2px  - Hairline offsets, dense tick gaps */
  --space-xs:     0.25rem;  /* 4px  - Micro padding, icon gaps */
  --space-sm:     0.5rem;   /* 8px  - Compact element padding, chip gutters */
  --space-md:     0.75rem;  /* 12px - Form item gaps, shelf vertical padding */
  --space-lg:     1.0rem;   /* 16px - Standard card body padding, module gutters */
  --space-xl:     1.5rem;   /* 24px - Large section gaps, banner margins */
  --space-2xl:    2.0rem;   /* 32px - Section vertical rhythm, stage padding */
  --space-3xl:    3.0rem;   /* 48px - Major landmark margins, hero gutters */
  --grid-gutter:  1.0rem;   /* 16px - Column separation */
  --margin-edge:  1.5rem;   /* 24px - Viewport outer gutter */
}
```

### 4.2 Architectural Spatial Discipline

- **Continuous 1px Framing:** Layout regions do not float as disconnected islands. They are bounded edge-to-edge by continuous `1px solid var(--contour)` dividing rules.
- **Density Tiering:**
  - *Analytical Modules & Data Tables:* High spatial density (`0.25rem` to `0.5rem` cell padding) for rapid scannability.
  - *Cartographic Viewports & Staging Frames:* Generous negative margins (`2.0rem` to `3.0rem`) to frame topological projections.

---

## 5. Border Radius & Geometric Standards

### 5.1 Zero-Radius Rule (`0px`)

> [!IMPORTANT]
> **Zero Border Radius Standard:**  
> `border-radius: 0px !important;` applies universally.  
> Every button, input, card, badge, tooltip, dropdown, modal dialog, and chart frame uses **sharp 90-degree right angles**. Soft rounded corners (`rounded-md`, `rounded-full`, etc.) are completely prohibited.

### 5.2 Technical Geometric Accents

- **Instrument Chamfers:** High-priority cards or focal overlays may utilize a 45-degree chamfered corner (`4px × 4px`) created using CSS `clip-path` or SVG borders:
  ```css
  clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
  ```
- **Vector Markers:** Node representations in maps and charts use diamonds (`polygon`), crosshairs (`[+]`), octagons, or square glyphs rather than soft circular bubbles.

---

## 6. Container Widths & Viewport Structure

### 6.1 Container Max Widths

- **Standard Grid Container:** `max-width: 80rem` (`1280px` / `max-w-7xl`), centered with `margin-inline: auto` and `padding-inline: var(--margin-edge)`.
- **Focused Analytical Container:** `max-width: 56rem` (`896px` / `max-w-4xl`) for targeted configuration summaries and single-focus survey briefs.
- **Full Viewport Stage:** `width: 100%` with edge-to-edge `1px solid var(--contour)` perimeter rules.

### 6.2 Application Viewport Layout Archetypes

#### A. Landing / Editorial Gazetteer Viewport
```
+-------------------------------------------------------------------------+
| Top Telemetry Ticker (24px, #C9C0A6, JetBrains Mono 9px)                |
+-------------------------------------------------------------------------+
| Primary Navigation Bar (64px, #EDE6D6, IBM Plex Serif + JetBrains Mono) |
+-------------------------------------------------------------------------+
| Hero Stage: Cartographic State-Space Projection (SVG 1000x520)          |
+-------------------------------------------------------------------------+
| 3-Column Horizon Escalation Cards (10s | 30s [Waypoint] | 60s)          |
+-------------------------------------------------------------------------+
| 3-Column Topological Manifold Vectors (Density | Latency | Entropy)     |
+-------------------------------------------------------------------------+
| Data Ledger & Comparison Matrix (12-Column Responsive Grid)             |
+-------------------------------------------------------------------------+
| Mathematical Attribution Ledger (Horizontal Feature Weight Bars)        |
+-------------------------------------------------------------------------+
| 7-Stage Pipeline Workflow (Ingest -> Transform -> Inference -> Output)  |
+-------------------------------------------------------------------------+
| 4-Column Analytical Footer & Citations Ledger                           |
+-------------------------------------------------------------------------+
```

#### B. Survey Operations Dashboard Viewport (Desktop)
- **Left Telemetry Sidebar:** Fixed `320px` width (`w-80`) with continuous `1px solid var(--contour)` right border. Houses live state trees, stream meters, and filter facets.
- **Center Topological Stage:** Flexible `8–10` columns (`flex-1`) featuring the primary geodetic vector canvas, time slider controls, and spatial coordinate grids.
- **Right Predictive Vector Inspector:** Optional collapsible `360px` drawer displaying feature attributions, BGP hop latencies, and critical intervention commands.

---

## 7. Navigation Structure

The navigation system uses a **two-tier technical drafting shelf**:

```
+----------------------------------------------------------------------------------------------------+
| DATUM: WGS-84/NET-SP | SURVEY QUAD: EPSG-4326/GEO-DEF            LAT: 45°12'N LON: 09°18'E | UTC 14:02:19 |
+----------------------------------------------------------------------------------------------------+
| [+] GEODETIC//SEC   Overview   Method   Capabilities   Architecture   [INDEX: SEIS-992.81]  [LAUNCH DASH] |
+----------------------------------------------------------------------------------------------------+
```

### 7.1 Tier 1: Geodetic Telemetry Ticker (Shelf)
- **Height:** `24px` (`py-space-2xs`)
- **Background:** `var(--terrain-low)` (`#C9C0A6`) / `surface-container-high` (`#EFE8D8`)
- **Border:** Bottom `1px solid var(--contour)`
- **Typography:** `JetBrains Mono 9px` (`label-sm`), uppercase, tracking `0.08em`, color `var(--ink-navy)` / `var(--terrain-high)`
- **Content:** Real-time projection datums (`WGS-84/NET-SP`), survey quad identifiers, coordinate tracking (`LAT/LON`), and synchronous UTC epoch timestamps.

### 7.2 Tier 2: Primary Command Bar
- **Height:** `64px` (`h-16`)
- **Background:** `var(--parchment)` (`#EDE6D6`) at 95% opacity with `backdrop-filter: blur(4px)`
- **Border:** Bottom `1px solid var(--contour)`
- **Components:**
  - **Insignia / Reticle Mark:** `28px × 28px` framed box with `[+]` mono mark + `NER-LOGISTICS // GIS` wordmark (`IBM Plex Serif 18px`) + sub-label `Accessibility & Disruption Operations` (`JetBrains Mono 8px`).
  - **Navigation Links:** `JetBrains Mono 11px` (`label-md`), uppercase, tracking `0.06em`.
    - *Active Link:* `color: var(--ink-navy); font-weight: 600; border-bottom: 2px solid var(--ink-navy);`
    - *Inactive Link:* `color: var(--terrain-high); hover: color: var(--ink-navy); transition: color 0.15s ease;`
  - **Index Badge:** Fixed-width mono display `INDEX: SEIS-992.81` in `var(--terrain-low)` container.
  - **Action Button:** Command button (`Launch Dashboard`) featuring sharp `north_east` vector glyph.

---

## 8. Card Styles & Modular Containers

All panels, widgets, and cards inherit the **Geodetic Container Architecture**:

```
+-------------------------------------------------------------+
| SHELF HEADER: 01 // HORIZON T+10s             [12% RISK]    | <-- bg: #C9C0A6, border-b: 1px solid #A99B7E
+-------------------------------------------------------------+
| Micro-Burst Genesis                          [CALM ZONE]    |
|                                                             |
| Subterranean deviations in ACK round-trip latency...        |
|                                                             |
| +---------------------------------------------------------+ |
| | SYN Ratio Deviation:                  +0.04% (Nominal)  | | <-- bg: #C9C0A6/40, border: 1px solid #A99B7E
| | Socket Variance:                      3.2 σ             | |
| +---------------------------------------------------------+ |
+-------------------------------------------------------------+
| DISPOSITION: MONITORING                     EPOCH // 10.0s  | <-- bg: #C9C0A6/20, border-t: 1px solid #A99B7E
+-------------------------------------------------------------+
```

### 8.1 Standard Survey Card Anatomy
1. **Perimeter Frame:** `border: 1px solid var(--contour); background-color: var(--parchment); border-radius: 0;`
2. **Top Shelf Banner:** `28px` height, background `var(--terrain-low)` (`#C9C0A6`), border-bottom `1px solid var(--contour)`, text `JetBrains Mono 11px uppercase` in `var(--ink-navy)`.
3. **Card Body:** Padding `1.0rem` (`p-space-lg`), title in `IBM Plex Serif 18px`, description in `IBM Plex Sans 13px`.
4. **Metric Ledger Sub-panel:** Inset box with `background: rgba(201, 192, 166, 0.4); border: 1px solid var(--contour); padding: 0.5rem;` featuring key-value pairs in tabular mono.
5. **Footer Metadata Shelf:** `24px` height, background `rgba(201, 192, 166, 0.2)`, border-top `1px solid var(--contour)`, metadata in `JetBrains Mono 9px`.

### 8.2 Critical Forecast Window Card (Horizon 02 / Waypoint Sync)
- **Perimeter Frame:** Reinforced `border: 2px solid var(--ink-navy);`
- **Header Banner:** Background `var(--ink-navy)` (`#22303F`), text `var(--parchment)` (`#EDE6D6`), risk text in bold `var(--parchment)`.
- **Badge:** `bg-[#8A6A4B] text-[#EDE6D6]` for elevated risk state.
- **Footer Shelf:** Solid `var(--terrain-low)` with `font-weight: bold; color: var(--ink-navy);`.

---

## 9. Chart & Cartographic Visualization Styling

The visualization language relies on **topographic survey conventions** rather than standard consumer line charts.

```
       ENTROPY |
         0.95  |-- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
               |                                      [#C1522E WAYPOINT]
               |                                              (+) <--- 87% RISK (T+30s)
               |                                         . - '   ` .
               |                             (NOW)   . -' (Forecast) ` - . (Dispersion)
          RTT  |                       (•)-------• -'
        182ms  |                 . - ' (Historical Solid #22303F)
               |           . - '
               +----------------------------------------------------------------
                  T-60s      T-40s      T-20s      T-00s      T+10s      T+30s      T+60s
                                                  [NOW]                 [ONSET]
```

### 9.1 Technical Cartographic Chart Rules

1. **Substrate & Gridlines:**
   - Background canvas: Solid `var(--parchment)` (`#EDE6D6`).
   - Major coordinate grid: `stroke: var(--contour); stroke-width: 0.5px; stroke-dasharray: 2 4; opacity: 0.7;`.
2. **Axis Ticks & Ephemeris:**
   - Labels rendered in `JetBrains Mono 8px` using `var(--contour)`.
   - Current epoch (`T-00s [NOW]`): Bold text in `var(--ink-navy)`.
   - Forecast horizon (`T+30s [ONSET]`): Bold text in `var(--terrain-high)`.
3. **Stepped Relief Contours:**
   - Baseline nominal zones: Stepped SVG polygon paths filled with `var(--terrain-low)` (`#C9C0A6`) at `opacity: 0.35 - 0.60`, outlined with `stroke: var(--contour); stroke-width: 0.75px;`.
   - Elevated risk ridges: Filled with `var(--terrain-high)` (`#8A6A4B`) at `opacity: 0.35`, bounded by dashed isoline vectors (`stroke-dasharray: 4 2`).
4. **Hatched Pattern Fills:**
   - Standard elevation hatch: 45-degree angled 0.75px strokes in `var(--contour)` spaced 8px apart.
   - High-hazard stipple: 20-degree angled 1.0px strokes in `var(--terrain-high)` spaced 6px apart.
5. **Trajectories:**
   - *Historical Confirmed Trajectory:* Solid stroke `2.5px` in `var(--ink-navy)` (`#22303F`) with solid circular vertex markers (`r="2.5"` to `r="3"`).
   - *Current State Reticle (T-00s):* Concentric calibration rings (`r="14"`, `r="8"`, `r="3"`) with crosshair ticks in `var(--ink-navy)`.
   - *Projected Forecast Trajectory:* Dashed curve `stroke: var(--terrain-high); stroke-width: 2px; stroke-dasharray: 4 4;`.
   - *Post-Onset Dispersion Fan:* Branching dashed vectors at 0.6, 0.4, and 0.3 opacity in `var(--terrain-high)`.

### 9.2 The Singular Waypoint Beacon Specification (`#C1522E`)

```xml
<!-- THE ONE WAYPOINT (RESERVED EXCLUSIVELY FOR PREDICTED ATTACK ONSET) -->
<g transform="translate(730, 150)">
  <!-- Static / Pulsing Cartographic Target Beacon -->
  <circle cx="0" cy="0" r="24" fill="none" stroke="#C1522E" stroke-width="0.75" stroke-dasharray="4 2" opacity="0.6">
    <animate attributeName="r" values="18;26;18" dur="3s" repeatCount="indefinite"/>
  </circle>
  <circle cx="0" cy="0" r="14" fill="none" stroke="#C1522E" stroke-width="1.25"/>
  <circle cx="0" cy="0" r="4.5" fill="#C1522E"/>
  
  <!-- Precision 4-Quadrant Hairline Crosshairs -->
  <line x1="-20" y1="0" x2="-6" y2="0" stroke="#C1522E" stroke-width="1.5"/>
  <line x1="6" y1="0" x2="20" y2="0" stroke="#C1522E" stroke-width="1.5"/>
  <line x1="0" y1="-20" x2="0" y2="-6" stroke="#C1522E" stroke-width="1.5"/>
  <line x1="0" y1="6" x2="0" y2="20" stroke="#C1522E" stroke-width="1.5"/>
  
  <!-- Geodetic Callout Stem & Data Box -->
  <polyline points="10,-10 32,-35 150,-35" fill="none" stroke="#C1522E" stroke-width="1.2"/>
  <g transform="translate(35, -95)">
    <rect width="180" height="56" fill="#EDE6D6" stroke="#C1522E" stroke-width="1"/>
    <rect width="180" height="14" fill="#C1522E"/>
    <text x="6" y="10" fill="#EDE6D6" font-family="JetBrains Mono" font-size="8" font-weight="bold" letter-spacing="0.08em">
      CRITICAL STRIKE WAYPOINT
    </text>
    <text x="6" y="27" fill="#C1522E" font-family="JetBrains Mono" font-size="10" font-weight="bold">
      PREDICTED ATTACK ONSET
    </text>
    <text x="6" y="40" fill="#22303F" font-family="JetBrains Mono" font-size="9">
      HORIZON: 30 SEC
    </text>
    <text x="6" y="50" fill="#C1522E" font-family="JetBrains Mono" font-size="9" font-weight="bold">
      87% FORECAST RISK
    </text>
  </g>
</g>
```

---

## 10. Interactive Components & States

### 10.1 Buttons

```css
/* Primary Action (Command Execute) */
.btn-primary {
  background-color: var(--ink-navy);
  color: var(--parchment);
  border: 1px solid var(--ink-navy);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.5rem 1.0rem;
  border-radius: 0;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}
.btn-primary:hover {
  background-color: var(--terrain-high);
  color: var(--parchment);
  border-color: var(--terrain-high);
}
.btn-primary:active {
  background-color: var(--ink-navy);
  border-color: var(--contour);
}

/* Secondary Action (Survey Mode) */
.btn-secondary {
  background-color: var(--parchment);
  color: var(--ink-navy);
  border: 1px solid var(--contour);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.5rem 1.0rem;
  border-radius: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.btn-secondary:hover {
  background-color: var(--terrain-low);
  color: var(--ink-navy);
  border-color: var(--contour);
}

/* Critical Intercept Action (ONLY for Predicted Attack Waypoint Intervention) */
.btn-critical-waypoint {
  background-color: transparent;
  color: var(--waypoint);
  border: 1px solid var(--waypoint);
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.5rem 1.0rem;
  border-radius: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.btn-critical-waypoint:hover {
  background-color: var(--waypoint);
  color: var(--parchment);
}
```

### 10.2 Badges & State Chips

- **Nominal / Baseline Chip:** `background: #C9C0A6; color: #22303F; border: 1px solid #A99B7E; font-size: 9px; font-family: JetBrains Mono; text-transform: uppercase;`
- **Forecast Hazard Chip:** `background: #8A6A4B; color: #EDE6D6; border: 1px solid #8A6A4B; font-size: 9px; font-family: JetBrains Mono; text-transform: uppercase;`
- **Waypoint Genesis Beacon:** `background: transparent; color: #C1522E; border: 1px solid #C1522E; font-size: 9px; font-family: JetBrains Mono;` with `[+]` prefix.

### 10.3 Form Controls & Data Inputs

- **Text Inputs:** `background: #EDE6D6; border: 1px solid #A99B7E; color: #22303F; font-family: JetBrains Mono; font-size: 11px; border-radius: 0; padding: 0.5rem;`
  - *Focus State:* `border-color: #22303F; outline: none; box-shadow: none;`
  - *Placeholder:* `color: #A99B7E;`
- **Selectors & Dropdowns:** Square boxes framed in `1px solid #A99B7E`, displaying monospace values with a sharp caret `v` in `#22303F`.
- **Checkboxes:** `12px × 12px` square, `border: 1px solid #22303F; background: transparent;`. Checked state renders an inner solid square of `6px × 6px` in `#22303F`.
- **Radio Buttons:** `12px × 12px` diamond (`transform: rotate(45deg); border: 1px solid #22303F;`). Selected state renders a centered inner solid diamond in `#22303F`.

### 10.4 Data Ledgers & Comparison Grids

- **Header Row:** Background `var(--ink-navy)` (`#22303F`), text `var(--parchment)` (`#EDE6D6`), font `JetBrains Mono 9px` uppercase tracking `0.08em`.
- **Alternating Data Rows:** Row 1 in `var(--parchment)` (`#EDE6D6`), Row 2 in `rgba(201, 192, 166, 0.25)`. Cell borders are `1px solid var(--contour)`.
- **Scanline Hover Effect:** Active row shifts background to `var(--terrain-low)` (`#C9C0A6`) with an immediate left indicator bar `2px solid var(--ink-navy)`.

---

## 11. Topographic & Geodetic Visual Elements

1. **Latitude/Longitude & Reticle Ticks:** Corner markers (`+`, `L`, `T`) drafted at 1px thickness in `var(--contour)`.
2. **Elevation Contours:** Stepped polygonal boundaries depicting probabilistic hazard depth.
3. **Cartographic Crosshairs:** `[+]` notation used as leading symbols on section headers and coordinate badges.
4. **Integrated Gradient Attribution Bars:**
   - Container: Height `12px` (`h-3`), background `var(--terrain-low)`, border `1px solid var(--contour)`.
   - Feature Bar Fill: Solid `var(--ink-navy)` for primary driver, `var(--terrain-high)` for secondary factors, `var(--contour)` for residual metrics.
5. **Horizontal Signal Flow Architecture:** 7-stage sequential pipeline boxes (`01. INGEST` to `07. PROVENANCE`) linked by continuous borders without rounded arrows.

---

## 12. Responsive Behavior Specifications

### 12.1 Breakpoint Strategy

| Breakpoint | Target Viewport | Grid Model | Navigation Behavior | Cartographic Stage Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop (`≥ 1024px` / `1280px`)** | High-resolution workstations & survey monitors | 12-column analytical grid, 3-column horizon cards, 7-column pipeline | Full dual-tier fixed header with live coordinate ticker and index badges | Full-aspect SVG projection (1000×520), side-by-side metric readouts |
| **Tablet (`768px – 1023px`)** | Field tablets & split viewports | 2-column stacked grid, 2-column pipeline wrap | Condensed ticker (hides secondary EPSG datums), full navigation links | Aspect ratio preserved, horizontal scroll enabled for 12-column ledgers |
| **Mobile (`< 768px`)** | Handheld terminals | Single column vertical stack (`grid-cols-1`) | Collapsed brand bar, compact quick-action button, essential UTC timestamp | SVG viewport maintains aspect ratio with internal touch-pan; tabular data scrolls horizontally |

### 12.2 Responsive Layout Rules

- **Zero-Shift Reflow:** Components transition cleanly from multi-column grids to stacked single columns without changing border thickness or typography scale.
- **Edge Rule Integrity:** When cards stack vertically on mobile viewports, consecutive borders collapse cleanly using `border-t-0` or negative margin overlapping to avoid double 2px divider lines.
- **Data Table Preservation:** Technical comparison tables and attribution ledgers preserve strict column alignments on small screens via `overflow-x: auto` containers with styled scrollbars matching `var(--contour)`.

---

## 13. System Implementation Checklist

```
[✓] Color Tokens explicitly mapped to canonical six-tone hex codes.
[✓] Zero UI components introduce foreign colors or unauthorized tints.
[✓] #C1522E strictly isolated to the predicted attack waypoint and critical forecast onset.
[✓] Typography families specified: IBM Plex Serif, IBM Plex Sans, JetBrains Mono.
[✓] Spacing tokens based on 4px baseline sub-grid (space-2xs to space-3xl).
[✓] Border radius hard-coded to 0px across all interactive primitives.
[✓] Container widths defined: max-w-7xl, max-w-4xl, fixed 320px/360px dashboard sidebars.
[✓] Navigation structure documented: Dual-tier ticker + command bar.
[✓] Card & panel architectures specified with shelf header bands and metric ledgers.
[✓] Cartographic chart styling documented with isolines, hatches, trajectories, and reticles.
[✓] Interactive states (buttons, chips, inputs, radios, checkboxes) specified.
[✓] Topographic visual elements and responsive behavior documented.
```
