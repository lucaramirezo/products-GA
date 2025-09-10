# Commit-on-Blur Input Refactor

## 1. Summary
Implemented deferred persistence for editable text and numeric fields: values now commit only on blur or Enter, and revert on Escape. Added reusable controlled input components to encapsulate the behavior while preserving existing mutation services and business rules.

## 2. Files Added / Modified

### Added
- `src/components/CommitInputs.tsx`
  - `CommitTextInput`: Local state, commit on blur/Enter, revert on Esc, IME-safe, duplicate commit guard (`isSaving`).
  - `CommitNumberInput`: String staging for partial numeric input, parse/validate on commit, supports `min`, `max`, `step`, custom `parse`/`format`, Esc revert, IME-safe, duplicate commit guard.
  - Reason: Centralize commit-on-blur logic and avoid duplicating patterns across UI.

### Modified
- `src/components/ProductDrawer.tsx`
  - Replaced per-keystroke `<input>` handlers for: `name`, `cost_sqft`, `area_sqft`, `min_pvp`, `override_multiplier`, `override_ink_factor` with commit components.
  - Reason: Prevent DB writes per key; keep checkboxes immediate.
- `src/components/ProductsTable.tsx`
  - Replaced area (`area_sqft`) inline edit with `CommitNumberInput`.
  - Reason: High-frequency table edits now batch to single commit.
- `src/components/TiersPanel.tsx`
  - Replaced tier `mult` and `ink_factor` inputs with commit components.
  - Reason: Avoid rapid writes when adjusting tiers.
- `src/components/ParamsPanel.tsx`
  - Switched tier editors, category rule numeric editors, and parameter numeric edits (via `ParamInput`) to commit-based inputs.
  - Reason: Consolidate mutation timing; reduce noise in audit logs.
- `src/components/CategoryRulesPanel.tsx`
  - Converted `min_pvp`, `override_multiplier`, `override_ink_factor` inputs to commit components.
  - Reason: Prevent excessive upsert calls while typing.
- `src/components/ui.tsx`
  - Updated `ParamInput` implementation to wrap `CommitNumberInput` (no API change to consumers).
  - Reason: Provide deferred commit transparently where `ParamInput` is used.
- `COMMIT_ON_BLUR_IMPLEMENTATION.md` & `TESTING_GUIDE.md`
  - Added descriptive docs & testing instructions (informational only).

## 3. Behavioral Changes (Field Matrix)
| Entity / Panel | Fields Now Commit on Blur / Enter | Still Immediate |
|----------------|-----------------------------------|-----------------|
| Product (drawer) | name, cost_sqft, area_sqft, min_pvp, override_multiplier, override_ink_factor | checkboxes (ink, lam, cut, active), selects (category, providerId, active_tier) |
| Product (table) | area_sqft | active (checkbox), others read-only |
| Tiers | mult, ink_factor | — |
| Params (globals) | ink_price, lamination_price, cut_price, rounding_step, min_pvp_global | selects (cut_unit, cost_method) |
| Category Rules | min_pvp, override_multiplier, override_ink_factor | add/delete actions |

## 4. Commit Logic Details
- Commit triggers: `blur` or `Enter` (unless IME composition active).
- Cancel: `Escape` restores original value and skips mutation.
- Change detection: Shallow compare original vs staged; skip if unchanged.
- Concurrency guard: `isSaving` prevents double-submits (e.g., blur + Enter race).
- IME safety: Suppresses commit during `compositionstart` → resumes eligibility after `compositionend`.
- Number parsing:
  - Empty string → `undefined` (preserves prior optional semantics).
  - Invalid parse → `null` internally; commit skipped unless explicitly different (we never send `null` if the field was optional — stays `undefined`).
  - Range enforcement: Clamp to `min` / `max` when provided.

## 5. Error Handling
- If `onCommit` throws: local value reverts to last committed (originalValueRef), console logs error (no new UI styling added per constraints).
- No retry loop added to keep minimal diff.

## 6. Reasons / Rationale Per Change
- Central components: Reduce duplication, simplify future maintenance, ensure uniform UX for commit semantics.
- Skip toggles & selects: These are low-frequency and expected to be immediate (require immediate recalculations or state pivots).
- Preserve audit integrity: Fewer noisy entries caused by transient keystrokes.
- Performance: Network & DB load reduction; prevents cascading recalculations while user types.

## 7. Notes / Warnings / Limitations
- No debounce layer added (unnecessary after deferring to commit events).
- No optimistic UI rollback visuals—only silent revert on error.
- Inputs still allow quickly blurring multiple fields; each fires its own mutation individually (no batch grouping implemented).
- `undefined` vs `0`: Empty numeric clears become `undefined`; explicit zero is preserved.
- IME handling relies on standard composition events—custom IME edge cases not simulated.
- Markdown lint warnings in auxiliary docs (formatting only, non-blocking).

## 8. Order of Operations (Apply These Changes in This Exact Sequence)
1. Create file `src/components/CommitInputs.tsx` with both components and shared logic.
2. Update `ui.tsx` to import `CommitNumberInput` and refactor `ParamInput` to wrap it (no prop signature change).
3. Modify `ProductDrawer.tsx`:
   - Add import for commit components.
   - Replace raw inputs for name & numeric fields listed above.
4. Modify `ProductsTable.tsx` to replace area input with `CommitNumberInput` and add import.
5. Modify `TiersPanel.tsx` to import and replace tier inputs.
6. Modify `CategoryRulesPanel.tsx` to import and replace numeric rule inputs.
7. Modify `ParamsPanel.tsx`:
   - Add import.
   - Replace tier, category rule, and any residual numeric inputs not already using `ParamInput`.
8. Run type check / build to ensure no TS errors.
9. Manually test (browser):
   - Type → no requests until blur/Enter.
   - Esc revert works.
   - IME (if possible) does not prematurely commit.
10. Commit documentation files (`COMMIT_ON_BLUR_IMPLEMENTATION.md`, this doc) last.

## 9. Verification Checklist
- [ ] `CommitInputs.tsx` present with both components exported.
- [ ] No remaining `onChange` handlers calling mutations directly for text/number fields (except toggles/selects).
- [ ] ProductDrawer numeric & text fields use commit components.
- [ ] ProductsTable area field uses commit component.
- [ ] TiersPanel numeric fields use commit component.
- [ ] ParamsPanel tier + category rule + param numeric fields commit on blur.
- [ ] CategoryRulesPanel numeric fields use commit components.
- [ ] ESC correctly reverts unsaved edits.
- [ ] Enter commits immediately (once) with no duplicate request.
- [ ] IME composition prevents premature commits.
- [ ] Network tab: single request per edit cycle.
- [ ] No TypeScript errors.
- [ ] No unintended style changes.
