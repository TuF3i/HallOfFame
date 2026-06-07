# Checklist

## Backend
- [ ] MongoDB Quote model includes `ai_comment` field (String, default `""`)
- [ ] Admin create/upload endpoints do NOT set `ai_comment`
- [ ] LLM consumer writes `ai_comment` when analysis returns a comment
- [ ] Go build passes (verify with `go build ./...`)

## Speaker Info Area Restyle
- [ ] Nickname positioned above QQ number and quote count
- [ ] Info module placed at bottom-right of the card
- [ ] QQ number and quote count in pill-shaped badges (translucent bg, thin border, monospace font)
- [ ] `portrait-frame` replaced with circular avatar image

## Right-Side Detail Panel
- [ ] "Eye" icon button present on each history row
- [ ] Floating detail panel renders between quote card and card pack
- [ ] Panel shows QQ+昵称, 群+群名, suppression bar, content, AI comment, thumbnails
- [ ] Empty rows (content, AI comment, attachments) are hidden
- [ ] "未选择任何言论" shown when nothing selected
- [ ] Thumbnail click opens full-image modal

## Archive View
- [ ] Star (★) prepended to featured quote rows in history
- [ ] "精华" card exists in CARD PACK
- [ ] Selecting "精华" card filters to featured-only quotes
- [ ] Deselecting "精华" restores full quote list

## Admin Dashboard
- [ ] Vertical sidebar with "言论库", "用户列表", "发言人管理"
- [ ] Active menu item is highlighted
- [ ] Content switches based on active sidebar item
- [ ] "手动创建言论" button opens modal with correct fields
- [ ] "查看详情" button exists on admin quote rows
- [ ] Speaker management section lists speakers with delete + detail

## Styling
- [ ] All new controls use dark-tech style (translucent bg, thin borders, rounded corners, shadows)
- [ ] Hover/active/selected states have smooth transitions
- [ ] Color, spacing, and font sizes are consistent

## Verification
- [ ] `tsc --noEmit` passes with zero errors
- [ ] `go build ./...` passes with zero errors
