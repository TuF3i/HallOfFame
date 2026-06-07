# Checklist

## Backend
- [x] MongoDB Quote model includes `ai_comment` field (String, default `""`)
- [x] Admin create/upload endpoints do NOT set `ai_comment`
- [x] LLM consumer writes `ai_comment` when analysis returns a comment
- [x] Go build passes (verify with `go build ./...`)

## Speaker Info Area Restyle
- [x] Nickname positioned above QQ number and quote count
- [x] Info module placed at bottom-right of the card
- [x] QQ number and quote count in pill-shaped badges (translucent bg, thin border, monospace font)
- [x] `portrait-frame` replaced with circular avatar image

## Right-Side Detail Panel
- [x] "Eye" icon button present on each history row
- [x] Floating detail panel renders between quote card and card pack
- [x] Panel shows QQ+昵称, 群+群名, suppression bar, content, AI comment, thumbnails
- [x] Empty rows (content, AI comment, attachments) are hidden
- [x] "未选择任何言论" shown when nothing selected
- [x] Thumbnail click opens full-image modal

## Archive View
- [x] Star (★) prepended to featured quote rows in history
- [x] "精华" card exists in CARD PACK
- [x] Selecting "精华" card filters to featured-only quotes
- [x] Deselecting "精华" restores full quote list

## Admin Dashboard
- [x] Vertical sidebar with "言论库", "用户列表", "发言人管理"
- [x] Active menu item is highlighted
- [x] Content switches based on active sidebar item
- [x] "手动创建言论" button opens modal with correct fields
- [x] "查看详情" button exists on admin quote rows
- [x] Speaker management section lists speakers with delete + detail

## Styling
- [x] All new controls use dark-tech style (translucent bg, thin borders, rounded corners, shadows)
- [x] Hover/active/selected states have smooth transitions
- [x] Color, spacing, and font sizes are consistent

## Verification
- [x] `tsc --noEmit` passes with zero errors
- [x] `go build ./...` passes with zero errors
