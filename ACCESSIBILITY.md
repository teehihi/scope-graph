# Accessibility Statement for ScopeGraph

ScopeGraph is committed to ensuring digital accessibility for software engineers, reviewers, and contributors of all abilities. We strive to continually improve the user experience for everyone and apply relevant accessibility standards.

---

## Conformance Status

ScopeGraph targets conformance with the **Web Content Accessibility Guidelines (WCAG) 2.1 Level AA**. These guidelines explain how to make web content more accessible to people with disabilities, and user-friendly to everyone.

---

## Key Accessibility Features in ScopeGraph

1. **High Contrast Color Tokens**:
   - Primary text (Ink `#151923`) against Warm White (`#F7F8F5`) satisfies a minimum contrast ratio of **14:1**, well exceeding the WCAG AAA threshold of 7:1.
   - Interactive UI elements, badges, and focus rings utilize high-contrast borders and clear visual indicators.

2. **Keyboard Navigation**:
   - All primary navigation buttons, dropdowns, and modal controls are accessible via standard keyboard interaction (`Tab`, `Shift+Tab`, `Enter`, `Escape`).
   - Modals and drawers feature focus trapping and can be dismissed immediately using the `Escape` key.

3. **Screen Reader Compatibility**:
   - Interactive icon-only buttons include descriptive `aria-label` or `title` attributes.
   - Modals and dropdowns employ appropriate ARIA attributes (`aria-expanded`, `aria-hidden`) to communicate state to assistive technologies.

4. **Motion & Animation Sensitivity**:
   - Core visual animations (e.g. pulse indicators, drawer transitions) utilize lightweight CSS transforms and adhere to standard motion timing. We respect the `prefers-reduced-motion` media query to suppress or minimize decorative animations for users with vestibular sensitivities.

5. **Multilingual Inclusivity**:
   - ScopeGraph natively supports **12 languages** (`en`, `vi`, `ja`, `ko`, `zh`, `es`, `fr`, `de`, `hi`, `th`, `it`, `ru`) with zero hardcoded language strings, ensuring engineers worldwide can navigate the platform in their native language.

---

## Known Limitations & Roadmap

While we strive for comprehensive accessibility, we are actively improving the following areas:

- **Dependency Graph Canvas Keyboard Panning**: The interactive React Flow dependency graph canvas is best experienced with a mouse, trackpad, or touch gesture. We are developing enhanced arrow-key node navigation for full keyboard-only graph traversals.
- **Complex AST Code Diffs**: Code snippets currently rely on monospace syntax styling; we are working on enhanced semantic screen-reader announcements for diff additions and deletions.

---

## Feedback and Reporting Barriers

We welcome your feedback on the accessibility of ScopeGraph. If you encounter accessibility barriers, please contact us:

- **Email**: [tee21052005@gmail.com](mailto:tee21052005@gmail.com)
- **GitHub Issues**: Open an issue using the `[BUG]` or `[FEAT]` template with the label `accessibility`.

We aim to respond to accessibility feedback within **2 business days**.
