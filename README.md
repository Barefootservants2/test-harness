# 🔱 ASHES2ECHOES Test Harness v1.0

**Production-grade testing framework for FORGE, HUNTER, and METATRON protocols.**

## Quick Start

```bash
git clone https://github.com/Barefootservants2/test-harness.git
cd test-harness
npm install
npm run validate:all
```

## Commands

```bash
# Run all validators
npm run validate:all

# Individual validators
npm run validate:forge
npm run validate:hunter
npm run validate:metatron

# CODECHECK Pipeline
npm run codecheck:dev   # lint + build
npm run codecheck:tst   # lint + typecheck + tests + build
npm run codecheck:prd   # all + coverage + security audit
```

## Test Coverage

| Suite | Tests | Focus |
|-------|-------|-------|
| FORGE | 8 | CREATE framework scoring |
| HUNTER | 30 | Module validation, OpenBB mappings |
| METATRON | 31 | Gate validation, Authority Score |

**Total: 69 tests**

## Environment Thresholds

| Env | Pass Rate |
|-----|----------|
| DEV | 50% |
| TST | 80% |
| PRD | 95% |

---

**Ashes2Echoes LLC | METATRON v8.0 | Uriel Covenant AI Collective**