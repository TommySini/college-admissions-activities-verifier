# 📋 Inventory Findings

## Existing Files

### ✅ Listing Page & Components
- `app/opportunities/page.tsx` - Wrapper
- `app/opportunities/OpportunitiesListing.tsx` - Main listing (line 291-298: sort dropdown)
- `components/opportunities/OpportunityCard.tsx` - Card component

### ✅ Detail Page (Already Created)
- `app/opportunities/[slug]/page.tsx` - SSR wrapper
- `app/opportunities/[slug]/OpportunityDetail.tsx` - Detail implementation

### 🔍 Key Components Locations

**Sort Dropdown**: Line 291-298 in `OpportunitiesListing.tsx`
```tsx
<select
  value={currentFilters.sort || "relevance"}
  onChange={(e) => updateFilters({ sort: e.target.value as any })}
  className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 bg-white dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-300"
>
```

**Search Input**: Line 251-257 in `OpportunitiesListing.tsx`
```tsx
<input
  type="text"
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
  placeholder="Search opportunities by name, organizer, or topic..."
  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-300 focus:border-blue-500 text-sm text-slate-800 placeholder:text-slate-500 dark:bg-slate-900 dark:text-slate-200 dark:placeholder:text-slate-400 dark:border-slate-700"
/>
```

**Filters Button**: Line 247-255 in `OpportunitiesListing.tsx`
```tsx
<Button variant="outline" onClick={() => setFilterDrawerOpen(true)}>
  <Filter className="h-4 w-4" />
  Filters
  {/* badge */}
</Button>
```

**List/Grid Toggle**: Line 244-246 in `OpportunitiesListing.tsx`
```tsx
<Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
  {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
</Button>
```

**Card Linking**: Currently uses `onClick` prop, NOT href with slug

## 🔧 Work Needed

### 1. UI Color Fixes
- ✅ Sort dropdown - Already has `text-slate-800`
- ✅ Search input - Already has `text-slate-800 placeholder:text-slate-500`
- ⚠️ Need to verify FilterPanel title/labels

### 2. Button Emblem Darkening
- ❌ Filters button - Currently `variant="outline"` (light)
- ❌ List/Grid toggle - Currently `variant="outline"` (light)
- Need to apply: `bg-slate-900 text-white hover:bg-slate-800`

### 3. Detail Page Issues
- ✅ Detail page files exist
- ❌ Card links use `onClick` instead of `href` with slug
- ❌ Need slugify utility
- ❌ Need to update OpportunityCard to link properly

### 4. Seeding
- Need to add 33 opportunities (3 per category × 11 categories)
- Need slugify utility for consistency

### 5. Calendar Buttons
- ✅ Already implemented in OpportunityDetail.tsx (lines ~270-285)

## 📝 Implementation Plan

1. **Create slugify utility** (`lib/slugify.ts`)
2. **Update OpportunityCard** - Change onClick to Link with proper slug
3. **Darken button emblems** - Filters button + toggle buttons
4. **Comprehensive seed** - Add 33 opportunities with proper slugs
5. **QA verification** - Test all flows

### Files to Touch:
1. NEW: `lib/slugify.ts`
2. UPDATE: `components/opportunities/OpportunityCard.tsx`
3. UPDATE: `app/opportunities/OpportunitiesListing.tsx`
4. UPDATE: `prisma/seed-opportunities.ts`
5. UPDATE: `components/opportunities/FilterPanel.tsx` (verify text colors)

