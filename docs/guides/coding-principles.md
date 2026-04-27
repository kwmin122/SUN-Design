# Coding Principles

These principles are mandatory for every coding agent working on K-Design Studio.

## Summary

| Principle | Guards Against |
|---|---|
| Think before coding | Wrong assumptions, hidden confusion, overlooked tradeoffs |
| Simplicity comes first | Over-complexity, inflated abstractions |
| Surgical changes | Orthogonal edits, touching code that should not be touched |
| Goal-oriented execution | Work that lacks tests, verification, or a clear success target |

## 1. Think Before Coding

Do not guess. Do not hide confusion. Make assumptions and tradeoffs explicit.

LLMs often choose an implicit interpretation and keep going. This principle requires explicit reasoning.

- State assumptions clearly. If the risk is high and the answer cannot be discovered, ask instead of guessing.
- Present multiple interpretations when a request is ambiguous.
- Push back when a simpler path is available.
- Stop when the task is not understood. Say what is unclear and request clarification.

## 2. Simplicity Comes First

Write only the minimum code needed to solve the problem. Do not add speculative code.

Fight over-design:

- No extra features beyond the request.
- No abstraction for one-off code.
- No unrequested flexibility or configurability.
- No error handling for impossible scenarios.
- If 200 lines can become 50 without losing clarity, simplify.

Test: would a senior engineer call this overbuilt? If yes, simplify.

## 3. Surgical Changes

Touch only what is necessary. Clean up what your own change breaks.

When editing existing code:

- Do not "improve" adjacent code, comments, or formatting.
- Do not refactor working code just because it could be nicer.
- Match the existing style, even if you would normally write it differently.
- If unrelated unused code exists, mention it instead of deleting it.

When your change creates orphaned code:

- Remove imports, variables, and functions made unused by your change.
- Do not delete pre-existing unused code unless explicitly asked.

Test: every changed line must connect directly to the user's request.

## 4. Goal-Oriented Execution

Define success criteria. Iterate until the criteria are met.

Turn broad tasks into verifiable goals:

| Instead Of | Convert To |
|---|---|
| "Add validation" | "Write a test for invalid input, then make that test pass." |
| "Fix the bug" | "Write a test that reproduces the issue, then make that test pass." |
| "Refactor X" | "Ensure tests pass before and after the refactor." |

