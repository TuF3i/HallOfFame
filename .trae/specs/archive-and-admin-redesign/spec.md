# Archive & Admin Redesign Spec

## Why
Comprehensive UI/UX overhaul of the HallOfFame platform — restyle the speaker info area, add a right-side detail panel, optimize the ARCHIVE view, restructure the Admin console with a sidebar and new modules, add a "Featured" card to the card pack, and extend the backend data model with an `ai_comment` field.

## What Changes
- **BREAKING**: `portrait-section` layout — nickname moves above QQ/quote count, module shifts to bottom-right of the card.
- **BREAKING**: Admin console restructured — vertical sidebar menu replaces flat layout.
- **NEW**: Right-side detail panel triggered by an "eye" button on each quote row.
- **NEW**: "Featured" card in CARD PACK that filters all featured quotes.
- **NEW**: Admin console — "Create Quote" modal, "Speaker Management" section, "View Details" button per quote.
- **NEW**: MongoDB `ai_comment` field on Quote documents, set only by LLM analysis.
- **NEW**: Star indicator (★) for featured quotes in history rows.
- **MODIFIED**: `portrait-frame` → circular avatar display.

## Impact
- Affected specs: Archive page, Admin dashboard, Card pack, Quote data model
- Affected code: `App.tsx`, `styles.css`, `api.ts`, `types.ts`, MongoDB DAO layer, LLM consumer

## ADDED Requirements

### Requirement: Speaker Info Area Restyle
The system SHALL reposition the speaker info block within `portrait-section` to the bottom-right corner, with nickname above a row of two pill-shaped badges (QQ number and quote count) styled in a dark-tech theme (translucent background, thin border, monospace font).

### Requirement: Right-Side Detail Panel
The system SHALL display a floating detail panel between the quote card and the existing right-side card pack when an "eye" icon button on a history row is clicked. The panel SHALL display:
- Row 1: `QQ: <number>  昵称: <name>`
- Row 2: `群: <group_number>  群名: <group_name>`
- Row 3: Suppression progress bar (0–100, gradient colored)
- Row 4: Quote content (hidden if empty)
- Row 5: AI comment (hidden if empty)
- Row 6+: Attachment thumbnail grid → click opens full-image modal

### Requirement: Admin Console Sidebar
The system SHALL render a vertical sidebar menu in the admin dashboard with items "言论库", "用户列表", "发言人管理", each with an icon+label. The active item SHALL be highlighted. Content panels switch based on the active sidebar item.

### Requirement: Featured Star Indicator
The system SHALL prepend a black solid star (★) to featured quote rows in the history list.

### Requirement: "Featured" Card in Card Pack
The system SHALL render a fixed card labeled "精华" in the CARD PACK area. When selected, it SHALL filter `quotes` to show only those with `is_featured === true`.

### Requirement: Backend ai_comment Field
The system SHALL add an `ai_comment` field (String, default `""`) to the MongoDB Quote document schema. The field SHALL be set only by the LLM analysis consumer, never by admin manual creation.

## MODIFIED Requirements

### Requirement: Avatar Display
The `portrait-frame` element SHALL display a circular cropped avatar image instead of the current geometric portrait. Size SHALL be proportional to the card layout.

### Requirement: Admin Dashboard Layout
The admin dashboard SHALL use a sidebar + content area layout. The sidebar SHALL group navigation items vertically.

### Requirement: Quote Creation Modal
The admin dashboard SHALL provide a "手动创建言论" button that opens a modal with fields: content (required), userdata JSON (required), groupdata JSON, suppression (default 0), files (multi-upload).

## REMOVED Requirements
*(None)*
