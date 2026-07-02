# Automation Roadmap — Valclassifieds

## Phase 0: Foundation (Week 1)
- [x] Framework decision (Playwright + TypeScript)
- [x] Design principles established
- [ ] Create `tests/e2e/` directory structure
- [ ] Scaffold `playwright.config.ts` with base configuration
- [ ] Write 3 POC tests (login, view listings, create listing)
- [ ] Set up Allure reporter integration
- [ ] Document coding standards
- [ ] Create test data seed SQL scripts
- [ ] Set up `.env.test` for CI

## Phase 1: Core User Journeys (Weeks 2–3)
- [ ] Authentication suite (register, login, logout, OAuth, session persistence, password reset)
- [ ] Listings suite (browse, search, filter by keyword/category/location/price, pagination)
- [ ] Listing detail suite (view details, image gallery, contact seller)
- [ ] Create listing suite (form validation, image upload, success flow)
- [ ] Edit/delete listing suite (owner permissions, field editing, deletion confirmation)

## Phase 2: Social & Communication (Weeks 4–5)
- [ ] Favorites suite (add, remove, view favorites list, empty state)
- [ ] Chat suite (start conversation, send message, receive message, typing indicator)
- [ ] Chat unread badges suite (mark as read, badge count, real-time updates)
- [ ] User profile suite (view, edit, upload avatar, validation)

## Phase 3: Admin & Edge Cases (Week 6)
- [ ] Admin panel suite (user management, listing moderation, flagging)
- [ ] Error states (404, 500, network offline, rate limiting)
- [ ] Empty states (no listings, no messages, no favorites)
- [ ] Responsive layout tests (viewport widths: 375px, 768px, 1280px)
- [ ] Accessibility basic checks (keyboard navigation, aria labels)

## Phase 4: CI & Optimization (Week 7)
- [ ] GitHub Actions workflow with parallel sharding
- [ ] Allure report publishing
- [ ] Test timing analysis and optimization
- [ ] Flaky test detection and quarantine mechanism
- [ ] Pre-commit hook for smoke tests
- [ ] Documentation handover to QA team

## Phase 5: Maturity (Ongoing)
- [ ] Visual regression testing (Playwright snapshot)
- [ ] Performance budget monitoring in CI
- [ ] Cross-browser matrix (Chrome, Firefox, Safari)
- [ ] Mobile device emulation tests
- [ ] Accessibility full audit (axe-core integration)
- [ ] API contract tests (if API extracted)

## Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Test coverage (critical paths) | 100% | Traceability Matrix |
| Test coverage (high priority) | 80%+ | Traceability Matrix |
| CI pipeline duration | < 15 min | GitHub Actions |
| Flaky test rate | < 2% | Allure trends |
| Regression detection time | Immediate | PR check status |
