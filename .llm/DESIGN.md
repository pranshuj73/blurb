# Blurb

## One‑line definition

Blurb is a minimalist, offline‑first digital business card that lets a person selectively share parts of their online identity through clean, full‑screen QR codes—without exchanging phone numbers, contacts, or personal data.

---

## Core idea

Blurb is **not** a wallet, network, or profile platform. The Google Wallet reference is purely mechanical: a list of items, each opening into a focused, full‑screen view. Each item represents a *single shareable identity surface* (LinkedIn, website, GitHub, calendar, portfolio, etc.).

The user controls:

* what exists
* what is shown
* what is shared
* when it is shared

No accounts. No sync. No cloud. No branding on output. The app exists to disappear while the user’s identity remains.

---

## Mental model

Think of Blurb as a **deck of personal cards** stored on your phone:

* You open the app → you see your deck
* Each card = one destination
* You pull out only the card you want to hand over

No single “master profile.” No forced aggregation. Identity is modular.

---

## Primary use cases

* Share LinkedIn without sharing a phone number
* Share a portfolio without saving contacts
* Share GitHub at a hackathon
* Share a booking link in a professional setting
* Maintain separate surfaces for different contexts (work / personal / side projects)

---

## App flow (baseline)

### 1. App launch

* Opens directly into the **Entries List**
* First launch state: empty list + subtle guidance (no tutorial screens)

### 2. Entries list

* Vertical list of entries
* Each entry shows:

  * Icon (favicon or custom)
  * Title
  * Subtitle (optional)
* Dark theme, high contrast, zero decoration

### 3. Add entry gesture

* Swipe right anywhere on the list to open **Add Entry** screen
* No floating buttons, no clutter

### 4. Add entry screen

User inputs:

* URL (required)

System behavior:

* Scrape metadata from URL
* Auto‑populate:

  * Title (LinkedIn, GitHub, YouTube, Website, etc.)
  * Subtitle (handle / channel name if available)
  * Icon (favicon / brand mark)

User controls:

* Edit title
* Edit or clear subtitle
* Replace icon (upload image)
* Change link anytime

Primary action:

* **Preview**

### 5. Entry preview

Preview screen shows:

* Title
* Subtitle
* Large QR code (generated from link)
* Divider
* Raw link + metadata

This preview is exactly what the full‑screen share view will look like.

### 6. Entry interactions (list)

* **Tap** → Full‑screen QR view
* **Long press** → Context menu:

  * Edit entry
  * Share QR
  * Share link
  * Duplicate entry
  * Delete entry

### 7. Full‑screen QR view

* Full height, centered QR
* Title + subtitle at top
* No buttons visible by default
* Single‑tap toggles minimal controls (share / brightness / close)

### 8. Storage model

* Everything stored locally
* No accounts
* No analytics
* No sync
* App is fully functional offline

---

## Technical constraints

* React Native
* Expo
* No backend
* Local storage only (AsyncStorage / SQLite)
* QR generation on device

### Project structure

```
/components
  /ui        // shadcn‑style primitive components
  /entry     // entry‑specific composed components
/screens
  EntriesList
  AddEntry
  Preview
  FullscreenQR
/lib
  scraping
  qr
  storage
/theme
```

---

## Dark theme direction

Blurb is **quiet, confident, and invisible**.

Design principles:

* True dark background (near‑black, not gray)
* Large touch targets
* Typography > color
* No gradients
* No shadows unless functional
* QR codes rendered for maximum scanner reliability

The app should feel like a professional tool, not a social product.

---

## Value‑add features (approved direction)

### 1. Contextual grouping (local only)

Allow optional grouping of entries:

* Work
* Personal
* Side projects

Purely organizational. No sharing logic attached.

---

### 2. Temporary sharing mode

* Generate a time‑limited QR (e.g. 5 minutes)
* After expiry, QR becomes invalid
* Useful in high‑trust but short interactions

Still offline: expiration enforced locally.

---

### 3. Scan optimization mode

* Max brightness toggle in full‑screen QR view
* Locks brightness while QR is visible

---

### 4. Duplicate & fork

* Duplicate an entry
* Change link / title
* Useful for multiple variants (e.g. different portfolios)

---

### 5. Entry‑level theming (subtle)

* Optional per‑entry accent (line, dot, border)
* Never affects QR readability
* Helps distinguish similar links visually

---

### 6. Read‑only lock

* Lock an entry
* Prevent accidental edits in high‑usage scenarios

---

### 7. Export / import (manual)

* Export all entries as encrypted local file
* Manual import on new device
* No cloud involvement

---

## Explicit non‑goals

These are intentionally excluded:

* Profiles
* Social feeds
* Public discovery
* Contact syncing
* Analytics
* Branding on shared QR pages
* Accounts or sign‑in

Blurb does not want to be known by the recipient. Only the user matters.

---

## Success criteria

If built correctly:

* App can be explained in one sentence
* App opens instantly
* Sharing requires ≤2 interactions
* Recipient sees only what the user chose
* User never thinks about Blurb after opening it

---

## Best practices & performance guidelines

### Rendering & performance

* Use FlatList with stable keys for the entries list
* Memoize entry rows and QR components
* Generate QR codes only when needed (on preview / fullscreen), not in list view
* Avoid re-renders on brightness toggles and share actions
* Pre-calculate QR size based on device dimensions to avoid layout thrashing

### Storage

* Prefer SQLite over AsyncStorage once entry count > ~20
* Normalize entry schema (id, title, subtitle, link, iconUri, createdAt, updatedAt)
* Lazy-load icons

### Scraping & metadata

* Perform metadata scraping asynchronously
* Show skeleton state while scraping
* Cache scraped results per URL locally
* Never block UI thread on network or parsing work

### Images & icons

* Enforce max icon size and resolution
* Store resized assets locally
* Use square icons with safe padding

### Offline-first guarantees

* App must fully function with zero connectivity
* All QR generation must be deterministic and local
* Network access only used for metadata scraping, never required

### UX discipline

* No modal chains
* No toast spam
* One primary action per screen
* Back gesture always works

### Code structure

* Keep /components/ui free of business logic
* Entry logic lives in domain-level hooks or services
* Screens compose, never compute

### Expo considerations

* Avoid heavy native dependencies
* Test cold start performance
* Lock QR rendering to tested libraries only

---

## Guiding principle

Blurb is an identity *tool*, not an identity *platform*. It exists to reduce friction, not create presence.
