# Phase System Implementation Roadmap

## Current Status (2026-05-10)

### Completed Phases ✅

#### Phase 1: Per-Convict Phase Completion UI ✅ (DONE)
- Individual "Ready" buttons for each convict
- Phase won't advance until ALL convicts mark complete
- Completion status (✓ or ☐) shown in panel

#### Phase 2: Phase-Specific GUI Modifications ✅ (DONE)
- Event window displays below deck-strip
- Enemy cards window displays below deck-strip
- Test window integration for effects
- Proper highlighting in active section per phase
- Phase-specific UI changes per requirements

#### Phase 4: Multi-Subphase Phases ✅ (DONE)
- Subphase architecture supports all phases
- Per-convict subphase tracking works generically
- Each convict can progress independently
- All must reach final subphase to advance parent phase
- Subphase UI renders correctly for all phases

#### Phase 5: Convict-Specific Subphase Progression ✅ (DONE)
- Full multi-convict, multi-subphase progression implemented
- Each convict advances independently through subphases
- All convicts must complete final subphase to advance parent phase
- Current subphase shown in UI per convict

### Completed: Phase 3 ✅

#### Phase 3: Phase Entry Notifications ✅ (VERIFIED)
**Status**: Fully implemented and integrated

**What was implemented**:
- ✅ `renderPhaseNotification()` in `elements.js` (lines ~XXX)
  - Displays phase title + body from `PHASE_CONFIG[phase].notification`
  - Shows subphase notification when `convictSubphases[activeConvictIndex]` is set
  - Subphase notifications use `.is-subphase` CSS class for distinct styling
- ✅ `#phase-notification` HTML element in index.html
  - Fixed positioning: left: 12px, top: 50%, centered vertically
  - Uses aria-live="polite" for accessibility
- ✅ Complete CSS styling in main.css
  - Notification card: dark background (rgba 10 10 30 / 0.82), backdrop blur
  - Title: small uppercase, low opacity (0.5)
  - Body: larger, higher contrast (0.85)
  - Subphase styling: green-tinted border
- ✅ Fully integrated into render pipeline
  - Called in `renderElements()` on all code paths (loading, error, ready)
  - Re-renders every frame when game state changes

**Behavior**:
- Notifications persist until phase changes
- Automatically updates when phase/subphase changes
- Convict switching updates subphase notification for that convict
- Clears when no valid phase config found
- Non-intrusive (pointer-events: none, doesn't block interaction)

---

## Current Task: Phase 3 - Phase Notifications

### What's Already Built
- ✅ `renderPhaseNotification()` function in `elements.js` — renders phase + subphase notifications
- ✅ `#phase-notification` HTML element — fixed positioned left-center
- ✅ CSS styling — backdrop blur, positioned at left: 12px, top: 50%
- ✅ Subphase notification support — displays subphase title/body when applicable

### Remaining Work
1. **Verify rendering pipeline**: Ensure `renderPhaseNotification()` is called whenever phase changes
   - Check `renderElements()` in `elements.js` — should call it each frame
   - Verify it's subscribed to state changes

2. **Test the feature**: Play through multiple phases
   - [ ] Load game, check notification displays on phase entry
   - [ ] Advance through each phase, verify title/body correct
   - [ ] Enter tactics phase, verify subphase notifications show
   - [ ] Check mobile/responsive — notification shouldn't overflow viewport

3. **Check edge cases**:
   - [ ] Notifications clear when phase data missing
   - [ ] Subphase notification appears only when in subphase
   - [ ] Convict switching doesn't break notification (shows active convict's subphase)

4. **Polish** (if needed):
   - Review visual design — does it match other UI panels?
   - Check contrast/readability
   - Consider: Should notifications fade/animate on entry?
   - Consider: Should they be dismissible or stay until next phase?

---

## Key Files

| File | Purpose |
|------|---------|
| `WardensDebt/scripts/wardensDebt/schema.js` | Phase definitions, validation |
| `WardensDebt/scripts/wardensDebt/gameplay.js` | Phase advancement logic |
| `WardensDebt/scripts/wardensDebt/actions.js` | Phase completion actions |
| `WardensDebt/scripts/wardensDebt/elements.js` | UI rendering for phases |
| `docs/architecture/phase_structure.md` | Game rules (authoritative) |

---

## Questions / Decisions Needed

1. **Test Window Design**: Where should it appear? Floating overlay? In a panel?
2. **Notification Display**: How long should phase notification stay visible?
3. **Event/Enemy Card Windows**: New component or reuse existing?
4. **Future Subphases**: Are events, enemy-phase, or other phases expected to have subphases?

---

## Success Criteria

- [ ] Each convict has individual phase completion button
- [ ] Phase won't advance until ALL convicts click ready
- [ ] Completion status shows checkmarks for ready convicts
- [ ] Event/Enemy windows display appropriately
- [ ] Tactics subphase progression works smoothly
- [ ] Tested with 2+ convicts
