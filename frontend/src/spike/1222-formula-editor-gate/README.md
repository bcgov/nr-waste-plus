# 1222 Formula Editor Gate Spike

Monaco-based formula editor proof of concept for Issue #1222.

## Scope
- Self-sufficient frontend parser/validator/evaluator with backend parity
- Monaco editor with custom language definition
- Accessibility baseline with axe/cypress-axe
- No production dependencies

## Structure
- `Form/FormulaInput/` — extracted Monaco UI from diff
- `Form/ReadonlyInput/` — stub for Carbon ReadonlyInput
- `context/theme/` — stub for theme hook
- `AppSpike.tsx` — demo entry point

## Next steps
1. Stub imports resolved
2. Create render test
3. Replace mathjs evaluation core with backend-aligned parser/validator/evaluator
4. Parity tests against shared/formula-conformance.json
