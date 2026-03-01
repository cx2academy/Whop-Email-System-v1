# Emails

This directory contains React Email templates for transactional and campaign emails.

## Phase Roadmap

- **Phase 1 (current):** Directory scaffold only.
- **Phase 4:** Full template system with:
  - Base layout component (header, footer, unsubscribe link)
  - Campaign broadcast template
  - Transactional templates (welcome, password reset, etc.)
  - Preview server integration

## Conventions

- All templates are `.tsx` files using React Email components
- Templates accept typed props (no `any` types)
- Every template includes an unsubscribe link
- Preview data is exported alongside the component for dev preview
