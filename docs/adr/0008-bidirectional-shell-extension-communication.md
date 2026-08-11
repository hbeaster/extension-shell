# ADR 0008: Bidirectional shell/extension communication via context attributes

- Status: Accepted
- Date: 2026-08-10
- Amends: [ADR 0006](./0006-web-component-extension-system.md) (the one-directional channel is replaced by a bidirectional, asymmetric one)

## Context

ADR 0006 made the shell/extension contract deliberately one-directional: extensions dispatch DOM `CustomEvent`s on their host element, and the shell passes nothing back — no props, attributes, method calls, shared services, or theming API. That ADR's third consequence reserved any widening ("props, shared services, theming") for a later ADR. This is that ADR.

Two separate things were conflated in the original decision, and only one of them was a considered choice:

- **One direction** was deliberate. It buys containment: an extension that cannot be addressed cannot come to depend on shell state it did not ask for, and cannot be broken by shell state changing.
- **One event** was not. ADR 0006 describes the vocabulary as "currently `shell:notify`" — a placeholder sized for a proof of concept, not a designed surface.

The constraint has held through the proof of concept, but preparing the company-wide rollout has made its cost concrete. An extension cannot discover the shell's theme, so it either renders in a fixed palette that clashes with a dark shell or invents its own toggle that the shell cannot drive. It cannot discover the user's locale, so every extension either hardcodes one or ships a second locale mechanism. Both are ambient facts the shell already knows and the extension needs at first paint. Neither can be solved by a richer outbound vocabulary, because the direction is wrong.

The isolation properties that ADR 0006 bought are still worth keeping. Whatever channel we open must not reintroduce version coupling, must not require extensions to import shell code, must not give the shell a way to reach into an extension's internals, and must not let extensions discover each other.

## Decision

Communication becomes **bidirectional but asymmetric**, with both directions carried on the extension's own host element:

- **Extension → shell** — DOM `CustomEvent`s dispatched on the host element. Unchanged from ADR 0006.
- **Shell → extension** — **context attributes** set by the shell on the host element.

Context attributes are `shell-` prefixed, and their values are scalar strings. The prefix reserves a namespace to the shell exactly as `ext-` reserves the custom-element tag namespace, so an extension's own attributes can never collide with shell-owned ones.

The initial inbound vocabulary is two attributes: `shell-theme` and `shell-locale`. Widening it — a third attribute, a structured value, a method call, a shared object — requires a new accepted ADR, on the same terms ADR 0006 set for the outbound direction.

The shell sets context attributes on the element **before inserting it into the DOM**, so an extension has its context at first render rather than after a flash of unstyled or mislocalised content, and updates them **in place** when a value changes, never by remounting the element.

Honouring context attributes is **optional**. An extension that ignores them entirely is conformant, and one that has never heard of them must keep working. This is what makes the change backward compatible: the two reference extensions declare no props and need no modification.

Attributes are the contract. Frameworks may surface them however they like — Vue's `defineCustomElement` reflects declared props to both attributes and properties — but the shell writes attributes only. It does not call methods on the element, does not assign properties beyond what attributes reflect, and does not read state back off the element. The channel carries ambient context inward; it is not a remote-procedure surface, and the element remains opaque to the shell.

## Considered alternatives

- **Symmetric `CustomEvent`s inbound** (the shell dispatches events at the element) is the smallest conceptual delta and reuses the existing mechanism exactly. Rejected because theme and locale are *state*, not *events*: an extension mounting after the last theme change would have missed it and would need a request/response handshake to catch up, which is a heavier contract than an attribute that is simply always readable. Events remain the right shape for discrete happenings, and an inbound event vocabulary can be added later under its own ADR without conflicting with this one.
- **An injected shell API object** (`element.shell = { … }`) is the most ergonomic and the most dangerous. It couples every extension to a versioned method surface, makes the shell's internals reachable, and turns "the shell only ever sees a custom element" into a fiction. It also breaks framework-agnosticism in practice, because the surface's shape starts to assume a consumer.
- **A shared context module or import map** was rejected for the same reason ADR 0006 rejected module federation: anything shared at runtime is a shared version, and shared versions are the coupling this architecture exists to avoid.
- **Structured values in attributes** (JSON-encoded payloads) were rejected for the initial vocabulary. Scalar strings keep the contract inspectable in devtools and trivially implementable without a parsing convention. If a structured payload is ever genuinely needed, it gets an ADR and probably a different mechanism.

## Consequences

- Extensions can render consistently with the shell — correct theme at first paint, correct locale — without importing anything from it or knowing its version.
- The change is backward compatible. Existing extensions need no modification, and `npm ci && npm run build` output is unaffected. Nothing in the build, packaging, registry, or delivery path changes; `registry.json`'s five fields are untouched.
- The shell gains an obligation it did not have: it must set context attributes before insertion and keep them current in place. Mount order is now import → create → set attributes → attach listeners → insert.
- The containment property is weakened deliberately but narrowly. The shell can now influence an extension's rendering, but still cannot call into it, read from it, or reach past its element. Extensions still cannot address the shell except by the event vocabulary, and still cannot discover or address each other — ADR 0006's isolation guarantees and the inter-extension prohibitions survive intact.
- Two contracts now need change control instead of one. Both directions are gated the same way: a new accepted ADR before implementation.
- STD 002 goes to v3.0.0 (EXT-15, EXT-17, EXT-19 rewritten; EXT-23…EXT-26 added) and STD 001 to v1.2.0 (CONSUMPTION-11 and CONSUMPTION-14 rewritten; CONSUMPTION-17, CONSUMPTION-18 added). Architecture snapshot 005 records the runtime shape; snapshot 004's communication section is amended to match.
- The outbound vocabulary is still exactly `shell:notify`. This ADR changes the *direction* of the contract, not the size of the outbound verb set; that remains a placeholder awaiting a real requirement.
