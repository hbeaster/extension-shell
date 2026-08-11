# Standards

Prescriptive documents that define what conformant implementations look like. Where an ADR
(`docs/adr/`) records *why* a decision was made and an architecture snapshot
(`docs/architecture/`) records *how the system looks*, a standard states *what an
implementation must do* in individually testable requirements.

## Conventions

- Files are numbered `NNN-kebab-title.md` (3 digits, sequential), matching the
  `docs/architecture/` scheme. New standards take the next number.
- Requirement levels use the key words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**,
  and **MAY** as defined in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and
  [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174): the key words carry their special
  meaning only when they appear in all capitals.
- Every normative requirement has a stable ID (e.g. `CON-03`, `EXT-07`) so it can be cited
  in reviews and checked individually. Sections marked *informative* (rationale, examples,
  implementation pointers) carry no requirements.
- Standards codify decisions that were already made in an ADR. A change that widens or
  alters a documented contract needs a new accepted ADR first; the standard is then
  updated to match, with its version bumped and the change recorded in its change log.

## Index

| Standard | Title | Audience |
| --- | --- | --- |
| [001](./001-extension-consumption.md) | Extension Consumption by the Shell | Shell (core team) developers |
| [002](./002-extension-authoring-and-communication.md) | Extension Authoring and Shell Communication | Extension (tool team) developers |
