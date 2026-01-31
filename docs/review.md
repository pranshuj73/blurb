# Code Review: Blurb QR Link Manager

**Review Date:** 2026-01-31
**Reviewer:** Claude Code
**Codebase Version:** Main branch (commit: 5c164a5)

---

## Executive Summary

Blurb is a well-architected React Native/Expo application with modern patterns and smooth UX. The core functionality is solid, but there are several production-readiness gaps around error handling, data integrity, and user experience polish. This review identifies 32 issues across critical bugs, performance optimizations, and enhancement opportunities.

**Overall Assessment:** ⚠️ Pre-production (needs critical fixes before production deployment)

---

## 🔴 Critical Issues

### 1. **ID Generation Collision Risk**
**Location:** lib/storage.ts:60, screens/AddEntry.tsx:144
**Severity:** Critical
**Impact:** Potential data loss from ID collisions

**Problem:** Using `Date.now()` + random string can cause collisions if users create entries rapidly.

```typescript
// Current implementation
id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
```

**Recommendation:** Use UUID or crypto-based ID generation:
```typescript
import { randomUUID } from 'expo-crypto';
id: randomUUID()
```

---

### 2. **Race Conditions in Storage**
**Location:** lib/storage.ts
**Severity:** Critical
**Impact:** Data loss on concurrent operations

**Problem:** No concurrency control. Multiple simultaneous saves can cause data loss.

**Example scenario:**
- User creates entry A
- User creates entry B before A finishes saving
- One entry might be lost due to read-modify-write race

**Recommendation:** Add mutex/lock mechanism or use a queue for storage operations.

**Example implementation:**
```typescript
class StorageQueue {
  private queue: Promise<any> = Promise.resolve();

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const promise = this.queue.then(operation);
    this.queue = promise.catch(() => {});
    return promise;
  }
}
```

---

### 3. **Missing Error Boundaries**
**Location:** app/_layout.tsx
**Severity:** Critical
**Impact:** Poor user experience on errors (full app crash)

**Problem:** No React error boundaries - app crashes on errors instead of graceful fallback.

**Recommendation:** Add error boundaries around Stack screens.

```typescript
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <View style={styles.errorContainer}>
      <Text>Something went wrong</Text>
      <Button onPress={resetErrorBoundary}>Try again</Button>
    </View>
  );
}

// Wrap app in ErrorBoundary
```

---

## ⚠️ High Priority Issues

### 4. **Memory Leak in AddEntry.tsx**
**Location:** screens/AddEntry.tsx:54-64
**Severity:** High
**Impact:** Memory leaks, potential crashes

**Problem:** Timeout not cleared if component unmounts during scraping.

```typescript
syncTimeoutRef.current = setTimeout(() => {
  setIsScraping(false);
  Alert.alert('Sync Failed', '...');
}, 5000);
```

Current cleanup only runs on unmount, but timeout can trigger state updates on unmounted component.

**Fix:**
```typescript
// Ensure timeout is cleared in finally block
finally {
  if (syncTimeoutRef.current) {
    clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = null;
  }
  setIsScraping(false);
}
```

---

### 5. **Hardcoded Navigation Delays**
**Location:** EntriesList.tsx:58-60, AddEntry.tsx:159-167
**Severity:** High
**Impact:** Navigation bugs on slower devices

**Problem:**
```typescript
setTimeout(() => {
  router.push(...);
}, 50); // or 200
```

- Brittle timing assumptions
- No guarantee animation completes
- Can cause navigation bugs on slower devices

**Recommendation:** Use Reanimated's callback after animation completes:
```typescript
drawerOffset.value = withSpring(SCREEN_HEIGHT, config, (finished) => {
  'worklet';
  if (finished) {
    runOnJS(router.push)(...);
  }
});
```

---

### 6. **Brightness Not Restored on Crash**
**Location:** screens/FullscreenQR.tsx:64-71
**Severity:** High
**Impact:** Poor UX (user's brightness stuck at 100%)

**Problem:** If app crashes while max brightness is on, user's brightness setting stays at 100%.

**Recommendation:**
- Store original brightness in AsyncStorage as backup
- Restore on app launch if found
- Clear after successful restoration

```typescript
// On app launch (_layout.tsx)
const restoreBrightness = async () => {
  const saved = await AsyncStorage.getItem('@blurb:savedBrightness');
  if (saved) {
    await Brightness.setBrightnessAsync(parseFloat(saved));
    await AsyncStorage.removeItem('@blurb:savedBrightness');
  }
};
```

---

## 🟡 Medium Priority Issues

### 7. **No URL Validation**
**Location:** screens/AddEntry.tsx
**Severity:** Medium
**Impact:** Users can save invalid URLs

**Problem:** No validation of URL format before saving.

**Recommendation:** Add URL validation:
```typescript
const validateUrl = (url: string): boolean => {
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch {
    return false;
  }
};

// In handlePreview/handleSave:
if (!validateUrl(link.trim())) {
  Alert.alert('Invalid URL', 'Please enter a valid URL');
  return;
}
```

---

### 8. **Google Favicon API Deprecation Risk**
**Location:** lib/scraping.ts:9
**Severity:** Medium
**Impact:** Feature breakage if API deprecated

```typescript
const FAVICON_API = 'https://www.google.com/s2/favicons?domain=';
```

**Problem:** Unofficial API, no SLA, can break anytime.

**Recommendation:**
- Use multiple fallbacks (DuckDuckGo, Favicon.io)
- Consider self-hosted favicon service
- Cache favicons locally

```typescript
const FAVICON_APIS = [
  (domain) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain) => `https://favicon.io/favicon.ico?domain=${domain}`,
];
```

---

### 9. **No Offline Indicator**
**Location:** screens/AddEntry.tsx
**Severity:** Medium
**Impact:** Confusing UX when offline

**Problem:** Scraping fails silently when offline. User doesn't know why sync doesn't work.

**Recommendation:** Check network state before scraping:
```typescript
import NetInfo from '@react-native-community/netinfo';

const handleSyncMetadata = async () => {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    Alert.alert('No Internet', 'Please check your connection');
    return;
  }
  // ... rest of sync logic
};
```

---

### 10. **TypeScript `any` Usage**
**Location:** screens/FullscreenQR.tsx:124
**Severity:** Medium
**Impact:** Loss of type safety

```typescript
} catch (error: any) {
```

**Recommendation:** Use proper error typing:
```typescript
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Error sharing:', message);
}
```

---

### 11. **Deprecated `.substr()` Method**
**Location:** lib/storage.ts:60, screens/AddEntry.tsx:144
**Severity:** Low
**Impact:** Future compatibility issues

```typescript
Math.random().toString(36).substr(2, 9)
```

**Fix:** Use `.slice()` instead (substr is deprecated):
```typescript
Math.random().toString(36).slice(2, 11)
```

---

### 12. **Missing Loading States**
**Location:** screens/EntriesList.tsx
**Severity:** Medium
**Impact:** Poor perceived performance

**Problem:** No skeleton loaders when loading entries list.

**Recommendation:** Add skeleton placeholders while data loads.

---

## 🔵 Code Quality & Architecture

### 13. **Duplicate URL Normalization Logic**
**Location:** lib/scraping.ts:12-19, screens/FullscreenQR.tsx:108-112
**Severity:** Low
**Impact:** Code duplication, maintenance burden

**Recommendation:** Extract to shared utility:
```typescript
// lib/utils/url.ts
export const normalizeUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};
```

---

### 14. **Magic Numbers**
**Location:** Multiple files
**Severity:** Low
**Impact:** Code readability

**Examples:**
- `PULL_THRESHOLD = 180` (what does 180 mean?)
- `TOP_PADDING_PERCENT = 0.25`
- QR sizing calculations

**Recommendation:** Add descriptive comments:
```typescript
const PULL_TO_ADD_THRESHOLD_PX = 180; // Distance in pixels user must pull down to trigger add entry
const TOP_PADDING_PERCENT = 0.25; // 25% of screen height for header spacing
```

---

### 15. **Inconsistent Component Organization**
**Location:** Project structure
**Severity:** Low
**Impact:** Developer confusion

**Problem:** Mixing screens in `/screens` and `/app` directories.

**Current:**
```
/screens/EntriesList.tsx  -> Used in /app/(tabs)/index.tsx
/app/add-entry.tsx        -> Direct route file
```

**Recommendation:**
- **Option A:** Keep all screen logic in `/app` files (remove `/screens`)
- **Option B:** Keep all screen components in `/screens`, use `/app` only for routing

---

### 16. **No Input Sanitization**
**Location:** screens/AddEntry.tsx
**Severity:** Medium
**Impact:** Potential XSS or display issues

**Problem:** User inputs (title, subtitle) not sanitized before storage/display.

**Risk:** Special characters could break display or cause issues if rendered in WebView.

**Recommendation:** Trim and validate all text inputs, limit length.

---

## 🟢 Performance Optimizations

### 17. **FlatList Key Extractor**
**Location:** screens/EntriesList.tsx:202
**Status:** ✅ Good

```typescript
keyExtractor={(item) => item.id}
```

Using stable IDs is correct. Ensure IDs never change after creation.

---

### 18. **Missing `useCallback` Memoization**
**Location:** screens/EntriesList.tsx:172-179
**Severity:** Low
**Impact:** Unnecessary re-renders

```typescript
const renderEmpty = () => (
  <View>...</View>
);
```

**Recommendation:** Wrap in `useCallback`:
```typescript
const renderEmpty = useCallback(() => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyTitle}>No entries yet</Text>
    <Text style={styles.emptySubtitle}>Pull down to add your first entry</Text>
  </View>
), []);
```

---

### 19. **Image Loading Performance**
**Location:** components/entry/icon-image.tsx
**Severity:** Low
**Impact:** Slow icon loading

**Problem:** No explicit caching strategy for icons.

**Recommendation:** Ensure Expo Image's disk cache is enabled (likely already is by default).

---

## 📱 UX Improvements

### 20. **No Haptic Feedback on Actions**
**Location:** Multiple screens
**Severity:** Low
**Impact:** Less polished feel

**Missing haptics for:**
- Long press to edit
- Pull threshold reached
- Delete confirmation

**Recommendation:**
```typescript
import * as Haptics from 'expo-haptics';

// On pull threshold
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// On delete
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
```

---

### 21. **No Search/Filter**
**Location:** screens/EntriesList.tsx
**Severity:** Medium
**Impact:** Poor UX with many entries

**Problem:** No way to search entries when list gets long.

**Recommendation:** Add search bar in EntriesList header with fuzzy search.

---

### 22. **No Entry Reordering**
**Location:** screens/EntriesList.tsx
**Severity:** Low
**Impact:** Limited organization options

**Problem:** Entries can't be manually sorted (only by creation date).

**Recommendation:** Add drag-to-reorder using `react-native-draggable-flatlist`.

---

### 23. **No Undo for Delete**
**Location:** screens/AddEntry.tsx:215-252
**Severity:** Medium
**Impact:** Accidental data loss

**Problem:** Accidental deletes are permanent.

**Recommendation:** Add Toast with "Undo" button (5-second window before permanent delete).

---

## 🧪 Testing & DevOps

### 24. **No Tests**
**Location:** Project-wide
**Severity:** High
**Impact:** High risk of regressions

**Problem:** Zero test coverage.

**Recommendation:** Add:
- Unit tests for `lib/storage.ts` and `lib/scraping.ts` using Jest
- Component tests for screens using React Native Testing Library
- E2E tests with Detox or Maestro

---

### 25. **No CI/CD**
**Location:** Project-wide
**Severity:** Medium
**Impact:** Manual deployment burden

**Recommendation:** Add GitHub Actions for:
- Linting (`npm run lint`)
- TypeScript checks (`tsc --noEmit`)
- Test runs
- EAS builds on PR

---

### 26. **No Environment Configuration**
**Location:** Project-wide
**Severity:** Low
**Impact:** Hard to manage environments

**Problem:** No `.env` for API keys or feature flags.

**Recommendation:** Use `expo-constants` with `app.config.js` for environment variables.

---

## 🔒 Security

### 27. **No QR Code Content Validation**
**Location:** screens/AddEntry.tsx, screens/Preview.tsx
**Severity:** Medium
**Impact:** Potential phishing/malware distribution

**Problem:** Users can create QR codes with malicious content (javascript: URLs, phishing links).

**Recommendation:** Validate and warn about suspicious URLs:
```typescript
const SUSPICIOUS_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:'];

const isSuspiciousUrl = (url: string): boolean => {
  const lower = url.toLowerCase().trim();
  return SUSPICIOUS_PROTOCOLS.some(proto => lower.startsWith(proto));
};

// Show warning before creating QR
if (isSuspiciousUrl(link)) {
  Alert.alert(
    'Suspicious URL',
    'This URL may be unsafe. Continue anyway?',
    [...]
  );
}
```

---

### 28. **No Rate Limiting on Scraping**
**Location:** screens/AddEntry.tsx:81-119
**Severity:** Low
**Impact:** API abuse

**Problem:** Users can spam the sync button, potentially DDoSing favicon services.

**Recommendation:** Debounce or rate-limit scraping requests (max 1 per 2 seconds).

---

## 📦 Dependencies

### 29. **Unused Dependencies**
**Location:** package.json
**Severity:** Low
**Impact:** Larger bundle size

**Check for:**
- `expo-file-system` - appears unused in codebase
- `expo-web-browser` - appears unused
- `@react-navigation/*` packages (Expo Router might handle all navigation)

**Recommendation:** Audit with `npx depcheck` and remove unused dependencies.

---

### 30. **Missing Dependencies**
**Location:** package.json
**Severity:** Medium
**Impact:** Missing functionality

**Recommended additions:**
- `expo-crypto` - For secure UUID generation
- `@react-native-community/netinfo` - Network state detection
- `react-native-toast-message` - Better user feedback
- `react-error-boundary` - Error boundary component

---

## 🎨 Design System

### 31. **Duplicate Theme Files**
**Location:** /theme/* and /constants/theme.ts
**Severity:** Low
**Impact:** Confusion, potential inconsistency

**Files:**
- `/theme/colors.ts`
- `/theme/typography.ts`
- `/constants/theme.ts` (legacy)

**Recommendation:** Consolidate into single source of truth in `/theme`, remove `/constants/theme.ts`.

---

### 32. **Hardcoded Colors**
**Location:** Multiple files
**Severity:** Low
**Impact:** Design inconsistency

**Examples:**
```typescript
borderColor: 'rgba(255, 255, 255, 0.1)', // FullscreenQR.tsx:321
color: '#FF3B30', // AddEntry.tsx:705 (delete button)
```

**Recommendation:** Add to theme:
```typescript
// theme/colors.ts
export const BlurbColors = {
  ...existing,
  destructive: '#FF3B30',
  overlayBorder: 'rgba(255, 255, 255, 0.1)',
};
```

---

## Priority Action Items

### **Do First (Critical):**
1. ✅ Fix ID generation with UUID (prevents data loss)
2. ✅ Add error boundaries (prevents app crashes)
3. ✅ Fix memory leak in timeout handling

### **Do Soon (High Impact):**
4. Replace setTimeout navigation with animation callbacks
5. Add URL validation before save
6. Implement brightness backup/restore
7. Add offline detection for scraping

### **Do Eventually (Nice to Have):**
8. Add search functionality
9. Implement haptic feedback
10. Add tests
11. Set up CI/CD
12. Add undo for deletions

---

## Summary Statistics

- **Total Issues Found:** 32
- **Critical:** 3 ❗
- **High Priority:** 3 ⚠️
- **Medium Priority:** 9 🟡
- **Low Priority:** 17 🔵

**Category Breakdown:**
- Code Quality: 4
- Performance: 3
- UX: 4
- Testing/DevOps: 3
- Security: 2
- Dependencies: 2
- Design: 2

---

## Conclusion

The codebase demonstrates strong React Native/Expo fundamentals with modern patterns and smooth animations. However, addressing the critical issues (especially ID generation and race conditions) is essential before production deployment. The high-priority items would significantly improve reliability and user experience.

**Next Steps:**
1. Address all critical issues immediately
2. Create GitHub issues for high-priority items
3. Set up basic test coverage
4. Establish CI/CD pipeline

**Estimated Effort:**
- Critical fixes: 1-2 days
- High priority: 3-5 days
- Medium priority: 5-7 days
- Total refactor: 2-3 weeks

---

*Review completed: 2026-01-31*
