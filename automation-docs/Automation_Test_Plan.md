# Automation Test Plan — Valclassifieds

## 1. Introduction
This document defines the test automation strategy for Valclassifieds, a classifieds marketplace web application. The goal is to ensure rapid, reliable, and repeatable quality validation across the application's critical user journeys.

## 2. Scope
### In Scope
- User registration, login, logout (email/password, Google OAuth)
- Listing CRUD (create, read, update, delete)
- Search & filter (keyword, category, location/city, price range)
- Favorites / watchlist management
- Chat (conversations, messaging, typing indicator, presence, unread badges)
- User profile management
- Admin panel functionality
- Image upload and gallery
- Responsive layout (desktop grid, mobile single-column)
- Keyboard navigation and screen reader compatibility (ARIA)

### Out of Scope
- Performance/load testing (covered by separate suite)
- Security penetration testing (covered by separate suite)
- Cross-browser visual regression (future phase)

## 3. Test Objectives
- Achieve 80%+ automated coverage of critical and high-priority user journeys
- Reduce regression testing cycle from 2 days to 4 hours
- Catch regressions before code reaches staging environment
- Provide consistent, auditable test evidence via Allure reports

## 4. Test Levels
- **Unit Tests**: Vitest (existing, to be expanded) — utility functions, hooks logic
- **Component Tests**: Playwright Component — individual UI component behavior
- **Integration Tests**: Playwright — feature-level flows (e.g., login → create listing → view listing)
- **E2E Tests**: Playwright — complete end-to-end user journeys

## 5. Test Environment
| Environment | URL | Database | Notes |
|-------------|-----|----------|-------|
| Local | http://localhost:5173 | Local Supabase | Dev work |
| Staging | https://staging.valclassifieds.app | Staging Supabase | CI runs |
| Production | https://valclassifieds.app | Production Supabase | Smoke tests only |

## 6. Test Data Strategy
- Synthetic test data generated via SQL seed scripts
- Dedicated test user accounts (buyer, seller, admin)
- Isolated test schema or cleanup between runs
- Fixtures for common data (listings, categories, cities)

## 7. Automation Framework
- **Framework**: Playwright (TypeScript)
- **Pattern**: Page Object Model with Component Objects
- **Assertions**: Playwright built-in + expect
- **Reporting**: Allure
- **CI**: GitHub Actions

## 8. Test Execution
- **Trigger**: Push to main, PR to main, nightly full suite
- **Parallelism**: Shard across 4 workers
- **Retries**: 1 retry for flaky tests
- **Timeout**: 30s per test, 5min per suite

## 9. Deliverables
- Automated test suite in `tests/e2e/`
- Allure report artifacts per CI run
- Test data seed scripts in `tests/seed/`
- This test plan document

## 10. Roles & Responsibilities
| Role | Responsibility |
|------|----------------|
| QA Engineer | Write & maintain automated tests, review results |
| Developer | Fix test failures, review test PRs |
| DevOps | Maintain CI pipeline, Allure server |
| Product Manager | Prioritize test coverage areas |

## 11. Schedule
| Phase | Milestone | Duration |
|-------|-----------|----------|
| Phase 0 | Framework setup, POC, standards | 1 week |
| Phase 1 | Core auth & listing tests | 2 weeks |
| Phase 2 | Chat & profile tests | 2 weeks |
| Phase 3 | Admin & regression suite | 1 week |
| Phase 4 | CI integration & optimization | 1 week |
