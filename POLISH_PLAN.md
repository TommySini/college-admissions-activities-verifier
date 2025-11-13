# 🎨 Opportunities Platform Polish Plan

## 📋 Inventory Results

**Found Components:**
- ✅ Sort dropdown: `OpportunitiesListing.tsx` line 277-289 (needs contrast fix + label improvements)
- ✅ Filter button: `OpportunitiesListing.tsx` line 238-241 (NOT WIRED - needs sheet component)
- ✅ Search input: `OpportunitiesListing.tsx` line 249-259 (needs contrast fix)
- ✅ Quick filters: `FilterChips` component (working)
- ✅ Calendar utils: `lib/calendar.ts` (working)
- ✅ Finance tab: `app/dashboard/page.tsx` line 392-397 (to be removed)
- ❌ Opportunity detail page: **MISSING** (need to create `/opportunities/[slug]`)
- ❌ Filters drawer: **MISSING** (need to create FilterPanel component)

---

## 🛠️ Implementation Plan (Minimal Diffs)

### 1. Accessibility Fixes (~50 lines)
**Files**: `OpportunitiesListing.tsx`, `app/opportunities/petition/new/page.tsx`
- Replace `text-white` → `text-slate-800 dark:text-slate-200`
- Replace `placeholder-white` → `placeholder:text-slate-500 dark:placeholder:text-slate-400`
- Update sort dropdown, filter button, search input
- Update petition form inputs

### 2. Filters Drawer (~300 lines NEW)
**Files**: 
- NEW: `components/opportunities/FilterPanel.tsx` (full filter UI)
- NEW: `components/ui/sheet.tsx` (shadcn Sheet component)
- UPDATE: `OpportunitiesListing.tsx` (wire button to open sheet, pass filters)

**Controls to implement:**
- Social: Done at school, Popular, Trending, Duration slider
- Modality/Format: 3 checkboxes + 7 types + structure + team size
- Domain: Multi-select (20+ options)
- Eligibility: Grade range, dates, rolling toggle, status
- Location: Geography + country/state/city dropdowns
- Awards: Types + alumni toggle

### 3. Sort Labels (~5 lines)
**File**: `OpportunitiesListing.tsx` line 282-289
- Update option text to be more descriptive

### 4. Opportunity Detail Page (~200 lines NEW)
**Files**:
- NEW: `app/opportunities/[slug]/page.tsx` (SSR detail page)
- UPDATE: `OpportunityCard.tsx` (add onClick navigation)

**Features:**
- Fetch opp + current edition
- Display all fields, social proof
- Save/Follow buttons
- Calendar export buttons (reg deadline + event dates)

### 5. Calendar on Detail (~50 lines)
**File**: Detail page component
- "Add Registration Deadline" button
- "Add Event Dates" button
- Reuse `downloadICalFile()` from lib

### 6. Remove Finance Tab (~10 lines)
**File**: `app/dashboard/page.tsx`
- Delete finance-competitions link
- Keep main Opportunities link

### 7. Seed Data (~1500 lines NEW)
**File**: NEW `prisma/seed-comprehensive.ts`
- 10 categories × 4-10 opportunities = ~80 opportunities
- Varying statuses, dates, domains, awards
- Keep existing 4 opportunities, add new ones

### 8. Tests (~400 lines NEW)
**Files**:
- NEW: `tests/e2e/filters-drawer.spec.ts`
- NEW: `tests/e2e/opportunity-detail.spec.ts`
- UPDATE: Existing test files

### 9. Cool Features (~300 lines NEW)
**Files**:
- NEW: `app/compare/page.tsx` (compare view)
- NEW: `app/api/saved-searches/route.ts` (saved searches API)
- NEW: `components/opportunities/CompareCheckbox.tsx`
- Flag gating in each component

### 10. Summary Script
- Run migrations (if needed)
- Re-seed database
- Run tests
- Generate report

---

## 📊 Estimated Changes

| Category | New Files | Modified Files | Lines Added | Lines Changed |
|----------|-----------|----------------|-------------|---------------|
| Accessibility | 0 | 2 | 0 | 50 |
| Filters Drawer | 2 | 1 | 350 | 20 |
| Sort Labels | 0 | 1 | 0 | 5 |
| Detail Page | 1 | 1 | 250 | 10 |
| Calendar | 0 | 1 | 50 | 0 |
| Remove Tab | 0 | 1 | 0 | 10 |
| Seed Data | 1 | 0 | 1500 | 0 |
| Tests | 3 | 1 | 450 | 0 |
| Cool Features | 5 | 0 | 350 | 0 |
| **TOTAL** | **12** | **8** | **~2950** | **~95** |

---

## 🚀 Execution Order

1. ✅ Accessibility (quick wins)
2. ✅ Sort labels (quick wins)
3. ✅ Remove Finance tab (quick win)
4. ✅ Detail page (unblocks testing)
5. ✅ Calendar on detail (completes detail page)
6. ✅ Filters drawer (biggest chunk)
7. ✅ Seed data (enables proper testing)
8. ✅ Tests (validation)
9. ✅ Cool features (behind flags)
10. ✅ Run & report

---

## ⚠️ Critical Notes

- **No breaking changes** to existing functionality
- **SSR compatibility** for all new components
- **Deterministic rendering** (no hydration mismatches)
- **URL state preservation** for all filters
- **Backward compatible** seed (upsert pattern)
- **Feature flags** for optional features

---

Ready to implement! 🎯

