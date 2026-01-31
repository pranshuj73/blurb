# Blurb - TODO List

**Last Updated:** 2026-01-31
**Status:** Pre-production

---

## 🔴 CRITICAL (Do Immediately)

### [ ] 1. Fix ID Generation Collision Risk
**Files:** `lib/storage.ts:60`, `screens/AddEntry.tsx:144`
**Priority:** P0
**Effort:** 30 minutes

- [ ] Install `expo-crypto` package
- [ ] Replace `Date.now() + Math.random()` with `randomUUID()`
- [ ] Test ID uniqueness under rapid entry creation

**Code:**
```typescript
import { randomUUID } from 'expo-crypto';

// Replace all instances of:
id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// With:
id: randomUUID()
```

---

### [ ] 2. Add Storage Concurrency Protection
**Files:** `lib/storage.ts`
**Priority:** P0
**Effort:** 2 hours

- [ ] Create storage queue/mutex to prevent race conditions
- [ ] Wrap all storage operations in queue
- [ ] Add tests for concurrent saves

**Implementation:**
```typescript
class StorageQueue {
  private queue: Promise<any> = Promise.resolve();

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.queue.then(operation);
    this.queue = promise.catch(() => {});
    return promise;
  }
}

const storageQueue = new StorageQueue();

// Wrap operations:
async saveEntry(entry: Entry) {
  return storageQueue.enqueue(() => this._saveEntry(entry));
}
```

---

### [ ] 3. Add Error Boundaries
**Files:** `app/_layout.tsx`
**Priority:** P0
**Effort:** 1 hour

- [ ] Install `react-error-boundary`
- [ ] Create error fallback component
- [ ] Wrap app navigation in ErrorBoundary
- [ ] Add error reporting (Sentry optional)

---

## ⚠️ HIGH PRIORITY (Do This Week)

### [ ] 4. Fix Memory Leak in Scraping Timeout
**Files:** `screens/AddEntry.tsx:54-119`
**Priority:** P1
**Effort:** 30 minutes

- [ ] Clear timeout in `finally` block, not just unmount
- [ ] Add cleanup for all async operations
- [ ] Test component unmount during scraping

---

### [ ] 5. Replace setTimeout with Animation Callbacks
**Files:** `screens/EntriesList.tsx:58-60`, `screens/AddEntry.tsx:159-167`
**Priority:** P1
**Effort:** 1 hour

- [ ] Use Reanimated's `runOnJS` callback after animations
- [ ] Remove all hardcoded `setTimeout` navigation delays
- [ ] Test on slower devices

**Example:**
```typescript
drawerOffset.value = withSpring(SCREEN_HEIGHT, config, (finished) => {
  'worklet';
  if (finished) {
    runOnJS(handleDismiss)();
  }
});
```

---

### [ ] 6. Implement Brightness Backup/Restore
**Files:** `screens/FullscreenQR.tsx`, `app/_layout.tsx`
**Priority:** P1
**Effort:** 1 hour

- [ ] Store original brightness in AsyncStorage when changed
- [ ] Restore brightness on app launch if backup exists
- [ ] Clear backup after successful restoration
- [ ] Handle app crash scenarios

---

### [ ] 7. Add URL Validation
**Files:** `screens/AddEntry.tsx`
**Priority:** P1
**Effort:** 30 minutes

- [ ] Create `validateUrl()` function
- [ ] Show error for invalid URLs before save
- [ ] Add visual feedback (red border on invalid input)

---

### [ ] 8. Add Offline Detection
**Files:** `screens/AddEntry.tsx`
**Priority:** P1
**Effort:** 1 hour

- [ ] Install `@react-native-community/netinfo`
- [ ] Check connection before scraping metadata
- [ ] Show offline indicator in UI
- [ ] Queue scraping requests when offline

---

## 🟡 MEDIUM PRIORITY (Do This Month)

### [ ] 9. Fix Favicon API Reliability
**Files:** `lib/scraping.ts`
**Priority:** P2
**Effort:** 2 hours

- [ ] Add multiple favicon API fallbacks
- [ ] Implement retry logic
- [ ] Cache favicons locally
- [ ] Handle API failures gracefully

---

### [ ] 10. Add TypeScript Error Handling
**Files:** `screens/FullscreenQR.tsx:124`, others
**Priority:** P2
**Effort:** 30 minutes

- [ ] Remove all `error: any` usages
- [ ] Use proper error type guards
- [ ] Create typed error utilities

---

### [ ] 11. Replace Deprecated `.substr()`
**Files:** `lib/storage.ts:60`, `screens/AddEntry.tsx:144`
**Priority:** P2
**Effort:** 10 minutes

- [ ] Replace all `.substr()` with `.slice()`
- [ ] Run tests to verify no breakage

---

### [ ] 12. Add Loading Skeletons
**Files:** `screens/EntriesList.tsx`
**Priority:** P2
**Effort:** 2 hours

- [ ] Create skeleton component for entry rows
- [ ] Show skeletons during initial load
- [ ] Add shimmer animation

---

### [ ] 13. Extract URL Normalization to Utility
**Files:** `lib/scraping.ts`, `screens/FullscreenQR.tsx`
**Priority:** P2
**Effort:** 20 minutes

- [ ] Create `lib/utils/url.ts`
- [ ] Move `normalizeUrl()` to utility
- [ ] Update all imports

---

### [ ] 14. Add Input Sanitization
**Files:** `screens/AddEntry.tsx`
**Priority:** P2
**Effort:** 1 hour

- [ ] Trim all text inputs
- [ ] Add max length validation
- [ ] Sanitize special characters
- [ ] Add character count UI

---

### [ ] 15. Add QR Content Security Validation
**Files:** `screens/AddEntry.tsx`
**Priority:** P2
**Effort:** 1 hour

- [ ] Create suspicious URL detector
- [ ] Warn users about dangerous protocols (javascript:, data:, etc.)
- [ ] Add confirmation dialog for suspicious URLs

---

### [ ] 16. Add Rate Limiting for Scraping
**Files:** `screens/AddEntry.tsx`
**Priority:** P2
**Effort:** 30 minutes

- [ ] Debounce sync button (max 1 request per 2 seconds)
- [ ] Disable button during cooldown
- [ ] Show countdown timer

---

## 🔵 LOW PRIORITY (Nice to Have)

### [ ] 17. Add Haptic Feedback
**Files:** Multiple screens
**Priority:** P3
**Effort:** 1 hour

- [ ] Import `expo-haptics`
- [ ] Add haptics for:
  - [ ] Long press to edit
  - [ ] Pull threshold reached
  - [ ] Delete confirmation
  - [ ] Save success

---

### [ ] 18. Implement Search/Filter
**Files:** `screens/EntriesList.tsx`
**Priority:** P3
**Effort:** 4 hours

- [ ] Add search bar to header
- [ ] Implement fuzzy search on title/subtitle/link
- [ ] Add filter persistence
- [ ] Show search results count

---

### [ ] 19. Add Entry Reordering
**Files:** `screens/EntriesList.tsx`
**Priority:** P3
**Effort:** 3 hours

- [ ] Install `react-native-draggable-flatlist`
- [ ] Add drag handles to entries
- [ ] Persist custom order
- [ ] Add "Reset to date order" option

---

### [ ] 20. Implement Undo for Delete
**Files:** `screens/AddEntry.tsx`
**Priority:** P3
**Effort:** 2 hours

- [ ] Install `react-native-toast-message`
- [ ] Soft delete with 5-second undo window
- [ ] Add permanent delete after timeout
- [ ] Show toast with undo button

---

### [ ] 21. Add Entry Duplication UI
**Files:** `screens/EntriesList.tsx`
**Priority:** P3
**Effort:** 1 hour

- [ ] Add swipe actions to entry row
- [ ] Show "Duplicate" option
- [ ] Use existing `storage.duplicateEntry()` method

---

### [ ] 22. Optimize Render Performance
**Files:** `screens/EntriesList.tsx`
**Priority:** P3
**Effort:** 1 hour

- [ ] Wrap `renderEmpty` in `useCallback`
- [ ] Memoize other render functions
- [ ] Profile re-renders with React DevTools

---

### [ ] 23. Add Comments and Documentation
**Files:** All magic numbers
**Priority:** P3
**Effort:** 1 hour

- [ ] Document all magic numbers (180, 0.25, etc.)
- [ ] Add JSDoc comments to complex functions
- [ ] Create architecture documentation

---

## 🧪 TESTING & DEVOPS

### [ ] 24. Add Unit Tests
**Files:** `lib/storage.ts`, `lib/scraping.ts`
**Priority:** P1
**Effort:** 4 hours

- [ ] Set up Jest configuration
- [ ] Write tests for storage CRUD operations
- [ ] Write tests for URL normalization and scraping
- [ ] Achieve >80% coverage for lib/

---

### [ ] 25. Add Component Tests
**Files:** `screens/*`
**Priority:** P2
**Effort:** 6 hours

- [ ] Install React Native Testing Library
- [ ] Test EntriesList rendering and interactions
- [ ] Test AddEntry form validation
- [ ] Test FullscreenQR controls

---

### [ ] 26. Set Up CI/CD
**Files:** `.github/workflows/`
**Priority:** P2
**Effort:** 3 hours

- [ ] Create GitHub Actions workflow
- [ ] Add linting job (`npm run lint`)
- [ ] Add TypeScript check (`tsc --noEmit`)
- [ ] Add test runner
- [ ] Add EAS build on PR

---

### [ ] 27. Add E2E Tests
**Files:** `e2e/`
**Priority:** P3
**Effort:** 8 hours

- [ ] Choose E2E framework (Detox or Maestro)
- [ ] Write critical path tests:
  - [ ] Create entry
  - [ ] Edit entry
  - [ ] Delete entry
  - [ ] View QR code
  - [ ] Share link

---

## 🎨 DESIGN & ARCHITECTURE

### [ ] 28. Consolidate Theme Files
**Files:** `/theme/*`, `/constants/theme.ts`
**Priority:** P2
**Effort:** 1 hour

- [ ] Remove `/constants/theme.ts` (legacy)
- [ ] Ensure all components use `/theme/*`
- [ ] Add missing colors to theme (destructive, overlayBorder, etc.)

---

### [ ] 29. Reorganize Component Structure
**Files:** Project structure
**Priority:** P3
**Effort:** 2 hours

- [ ] Decide on `/screens` vs `/app` organization
- [ ] Move screen components consistently
- [ ] Update imports

**Options:**
- A: Keep logic in `/app`, remove `/screens`
- B: Keep components in `/screens`, `/app` for routing only

---

### [ ] 30. Add Environment Configuration
**Files:** `app.config.js`, `.env`
**Priority:** P2
**Effort:** 1 hour

- [ ] Create `app.config.js` for environment variables
- [ ] Add `.env.example` file
- [ ] Document environment setup in README

---

## 📦 DEPENDENCIES

### [ ] 31. Audit & Remove Unused Dependencies
**Files:** `package.json`
**Priority:** P2
**Effort:** 1 hour

- [ ] Run `npx depcheck`
- [ ] Remove unused packages:
  - [ ] `expo-file-system` (verify usage)
  - [ ] `expo-web-browser` (verify usage)
  - [ ] Check `@react-navigation/*` packages
- [ ] Test app after removal

---

### [ ] 32. Add Missing Dependencies
**Files:** `package.json`
**Priority:** P1
**Effort:** 30 minutes

- [ ] `expo-crypto` - UUID generation
- [ ] `@react-native-community/netinfo` - Network detection
- [ ] `react-native-toast-message` - User feedback
- [ ] `react-error-boundary` - Error handling

---

## 📊 Progress Tracking

### By Priority
- **P0 (Critical):** 0/3 completed (0%)
- **P1 (High):** 0/7 completed (0%)
- **P2 (Medium):** 0/11 completed (0%)
- **P3 (Low):** 0/11 completed (0%)

### By Category
- **Bug Fixes:** 0/8 completed
- **Features:** 0/7 completed
- **Testing:** 0/4 completed
- **DevOps:** 0/2 completed
- **Refactoring:** 0/6 completed
- **Dependencies:** 0/2 completed
- **Documentation:** 0/3 completed

### Overall Progress
**Total Tasks:** 32
**Completed:** 0
**In Progress:** 0
**Remaining:** 32

---

## Estimated Timeline

### Week 1 (Critical + High Priority)
- Day 1-2: Critical issues (#1-3)
- Day 3-4: High priority bugs (#4-6)
- Day 5: High priority features (#7-8)

### Week 2 (Testing + Medium Priority)
- Day 1-2: Unit tests (#24)
- Day 3-4: Medium priority fixes (#9-12)
- Day 5: CI/CD setup (#26)

### Week 3-4 (Polish + Features)
- Medium priority features (#13-16)
- Low priority UX improvements (#17-21)
- Component tests (#25)

### Ongoing (Low Priority)
- E2E tests (#27)
- Documentation (#23)
- Architecture improvements (#28-30)

---

## Quick Wins (< 30 min each)

1. [ ] Replace `.substr()` with `.slice()` (#11)
2. [ ] Extract URL normalization utility (#13)
3. [ ] Fix TypeScript `any` usage (#10)
4. [ ] Add validation to URL input (#7)
5. [ ] Add haptic feedback (#17)
6. [ ] Install missing dependencies (#32)

---

*Last updated: 2026-01-31*
*Next review: After completing P0/P1 items*
