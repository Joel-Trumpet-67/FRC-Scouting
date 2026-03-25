# FRC Scouting App - TODOs

## Data Storage Options
These are the main options for saving scouting data. Pick one (or combine):

### Option A: Local Storage (Browser)
- Save form data to `localStorage` automatically between sessions
- Pros: No server needed, works offline
- Cons: Data lives only on that device, no sharing

### Option B: CSV / File Download
- "Export CSV" button that downloads a `.csv` file per match
- Pros: Easy to open in Excel/Google Sheets, works offline
- Cons: Manual collection from each device

### Option C: Google Sheets (via Apps Script)
- Submit button POSTs data to a Google Apps Script Web App URL
- That script appends a row to a Google Sheet
- Pros: Centralized, shareable, original app already uses this
- Cons: Requires internet, needs Google account setup

### Option D: QR Code → Manual Scan
- Generate QR code from form data string (TSV format)
- Scout displays QR; someone scans it with another device
- Pros: No internet required on scout device
- Cons: Needs a QR reader app/station at collection point
- Library to use: `qrcode.js` or `easy.qrcode.min.js`

### Option E: SQLite (Desktop/Electron only)
- If app is wrapped in Electron, use SQLite for local DB
- Pros: Structured, queryable
- Cons: Not a web app anymore

---

## Other TODOs

### Clickable Field Image (Auto Start Position)
- File needed: a top-down image of the 2026 FRC field (`field_image.png`)
- Behavior: tap on the image to place a marker showing robot start position
- Store as X/Y coordinates or a zone name

### QR Code Generation
- Add `qrcode.js` library (CDN or local file in `/resources/js/`)
- Call `new QRCode(element, { text: dataString })` on the QR page
- Uncomment QR render code in `match.js` once library is added

### Google Sheets Integration
- Set up a Google Apps Script Web App:
  1. Create a new Google Sheet
  2. Go to Extensions → Apps Script
  3. Write a `doPost(e)` function that appends `e.postData.contents` as a row
  4. Deploy as Web App (Anyone can access)
  5. Paste the Web App URL into `match.js` → `sendToSheets()`
- Update `sendToSheets()` in `match.js` with the actual URL and fetch call

### Pit Scouting Page
- Original repo also has `pit.html` — add a pit scouting form if needed

### Input Validation
- Warn if required fields (Scouter, Match #, Robot, Team #) are empty before advancing to QR page
