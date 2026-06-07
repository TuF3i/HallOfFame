# Tasks

- [ ] Task 1: Backend — Add `ai_comment` field to MongoDB Quote model
  - Add `ai_comment string` field with default `""` to the Quote struct in `models/`
  - Ensure the field is not set by admin create/upload endpoints
  - Update LLM consumer to write the field when analysis returns a comment

- [ ] Task 2: Frontend — Restyle speaker info area (`portrait-section`)
  - Move nickname above QQ/quote count
  - Move the entire info module to bottom-right of the card
  - Wrap QQ number and quote count in two pill-shaped badges (translucent bg, thin border, monospace font)
  - Replace `portrait-frame` geometric portrait with a circular avatar image
  - Update `styles.css` accordingly

- [ ] Task 3: Frontend — Add right-side detail panel (archive page)
  - Add an "eye" icon button to each history row
  - Create a floating detail panel between quote card and card pack
  - Panel shows: QQ+昵称, 群+群名, suppression progress bar, content, AI comment, attachment thumbnails
  - Add full-image modal on thumbnail click
  - Show "未选择任何言论" when nothing is selected
  - Update `App.tsx` and `styles.css`

- [ ] Task 4: Frontend — Add featured star indicator and "Featured" card pack card
  - Prepend ★ to featured quote rows in history list
  - Add a fixed "精华" card at the top of the CARD PACK list
  - When selected, filter archive view to only featured quotes
  - Update `App.tsx` and `styles.css`

- [ ] Task 5: Frontend — Restructure Admin dashboard with sidebar
  - Replace flat layout with vertical sidebar menu (言论库, 用户列表, 发言人管理)
  - Highlight active menu item
  - Move existing content (quote table, user table, terminal panel) into respective sections
  - Create speaker management section with basic list + delete + detail view
  - Add "手动创建言论" button + modal with fields from spec
  - Add "查看详情" button to each admin quote row
  - Update `App.tsx` and `styles.css`

- [ ] Task 6: TypeScript check — Ensure `tsc --noEmit` passes
  - Run TypeScript type check
  - Fix any type errors introduced by the changes

- [ ] Task 7: Go build — Ensure `go build ./...` passes
  - Run Go build
  - Fix any compilation errors

# Task Dependencies
- Task 1 (backend) is independent of frontend tasks
- Task 4 depends on the archive view refactoring but is mostly independent of Task 2
- Task 5 depends on nothing in Tasks 1-4 and can run in parallel
- Tasks 2 and 3 can run in parallel
- Tasks 6 and 7 are final verification steps
