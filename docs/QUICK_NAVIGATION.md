# SocietyOS Command Center — Quick navigation

This release adds a keyboard-driven navigation layer for all five authorized workspaces.

## How to use

- Press **Ctrl+K** on Windows/Linux or **⌘K** on macOS.
- Type a module name, topic or action, e.g. `visitor`, `maintenance`, `billing`, `scanner`, `announcements`.
- Use **↑ / ↓** to select and **Enter** to open a route. Press **Escape** or click outside to dismiss.
- A visible **Jump to a workspace** shortcut appears at the top of signed-in workspaces.

## Role-aware by design

The destination list is constructed only from the existing `menus[role]` allowlist. A resident does not see guard-only or admin-only destinations. The command center does **not** bypass API permission checks; it only navigates to routes already authorized for the signed-in membership.

## Workspace Launchpad

The dashboard now provides three contextual shortcuts for each role:

| Role | Example shortcuts |
| --- | --- |
| Admin | Visitor desk; Service pulse; Community insights |
| Resident | Invite a visitor; Request help; Book a facility |
| Guard | Scan at the gate; Entry timeline; Report an incident |
| Maintenance | Assigned jobs; Duty schedule; Service requests |

Unavailable actions are not rendered if the role's menu does not include them. No extra data access, backend mutation or third-party AI is involved.

## Accessibility & limitations

- Buttons are keyboard reachable, with visible focus styles and a search input label.
- Dialog supports Escape and arrow-key navigation.
- A complete independent accessibility audit or assistive-technology review has not been performed.
- Live data stays in the backend; no visitor PII is indexed in this navigation layer.
