# Aerify AI — Contract Schema 0.9 Gaps & Extension Requests

This document tracks any fields, enums, or structures needed by the UI that are not currently provided by Contract Schema 0.9.
Per system contract discipline rules:
1. NEVER silently add fields or alter contract types in `src/contracts/types.ts`.
2. Render a graceful fallback in the UI.
3. Log an entry in this registry with Screen, Field Needed, Why, Proposed Optional Field, and Fallback Strategy.

---

## Log Template

```markdown
### GAP-[ID]: [Brief Title]
- **Screen / Component**: 
- **Field Needed**: 
- **Reason / Why**: 
- **Proposed Optional Field**: 
- **Current UI Graceful Fallback**: 
- **Status**: [PROPOSED | BACKEND_REVIEW | IMPLEMENTED]
```

---

## Active Gap Registry

*(No active schema gaps. Contract Schema 0.9 is fully verified with 0 active schema gaps. All UI views, types, endpoints, and fixtures conform strictly to Contract Schema 0.9).*

