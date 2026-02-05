# AP Legal Tracker

A desktop application for tracking legal case status across Andhra Pradesh courts, including High Court of AP, District Courts, and Supreme Court of India.

## Features

- **Case Management**: Add, edit, and track multiple cases across different courts
- **Real-time Status**: Fetch case status from official eCourts portals
- **Hearing Calendar**: Track upcoming hearing dates with reminders
- **Order Tracking**: View recent orders and judgments
- **Desktop Notifications**: Get alerts for hearing reminders and case updates
- **Offline Support**: All data stored locally in SQLite database
- **Quick Search**: Search across all your cases instantly

## Supported Courts

- Supreme Court of India
- High Court of Andhra Pradesh
- All District Courts in Andhra Pradesh:
  - Vijayawada, Guntur, Visakhapatnam, Tirupati, Nellore
  - Kurnool, Anantapur, Kadapa, Rajahmundry, Kakinada
  - Eluru, Ongole, Srikakulam, Vizianagaram, and more

## Prerequisites

Before building the application, ensure you have:

1. **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
2. **npm** (comes with Node.js)
3. **For macOS builds**: macOS with Xcode Command Line Tools

## Installation

### 1. Clone or Download

```bash
cd ap-legal-tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run in Development Mode

```bash
npm run dev
```

### 4. Build for macOS

```bash
npm run build
```

This creates:
- `dist/AP Legal Tracker-{version}.dmg` - Installer DMG
- `dist/AP Legal Tracker-{version}-mac.zip` - Portable ZIP

## Usage

### Adding a Case

1. Click the **"+ Add Case"** button
2. Select the court (Supreme Court, High Court AP, or a District Court)
3. Enter the case number (e.g., WP No. 12345/2024)
4. Fill in petitioner and respondent details
5. Add optional details: CNR number, filing date, advocate names
6. Set priority (High/Normal/Low) for important cases
7. Click **Save**

### Fetching Case Status

The app can fetch case status from official eCourts portals:

1. Open a case by clicking on it
2. Click **"Fetch Latest Status"**
3. For portals with CAPTCHA, you'll be prompted to open the portal in your browser

> **Note**: Government eCourts portals use CAPTCHA protection. For fully automated updates, the app provides links to manually verify and update status.

### Quick Links to eCourts Portals

- [High Court of AP](https://hcservices.ecourts.gov.in/ecourtindiaHC/index_highcourt.php?state_cd=2&dist_cd=1&stateNm=Andhra+Pradesh)
- [District Courts](https://services.ecourts.gov.in/)
- [Supreme Court](https://www.sci.gov.in/case-status-case-no/)

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd + N` | Add new case |
| `Cmd + R` | Refresh all cases |
| `Cmd + 1` | View Dashboard |
| `Cmd + 2` | View All Cases |
| `Cmd + 3` | View Hearings |
| `Cmd + 4` | View Orders |
| `Cmd + ,` | Open Settings |

## Data Storage

All data is stored locally on your Mac:

```
~/Library/Application Support/ap-legal-tracker/
├── ap-legal-tracker.db    # SQLite database with all cases
├── config.json            # App settings
└── logs/                  # Application logs
```

## Project Structure

```
ap-legal-tracker/
├── package.json           # Dependencies and build config
├── src/
│   ├── main/
│   │   ├── main.js        # Electron main process
│   │   └── preload.js     # Context bridge for security
│   ├── renderer/
│   │   ├── index.html     # Main UI
│   │   ├── styles.css     # Styling
│   │   └── app.js         # Frontend logic
│   ├── database/
│   │   └── database.js    # SQLite operations
│   └── services/
│       ├── ecourts-service.js    # eCourts data fetching
│       └── scheduler-service.js  # Background updates
├── assets/
│   ├── icon.icns          # macOS app icon
│   ├── icon.png           # General icon
│   └── tray-icon.png      # System tray icon
└── dist/                  # Built application
```

## Creating App Icons

Before building, add your icons to the `assets/` folder:

1. Create a 512x512 (or 1024x1024) PNG image
2. Convert to .icns for macOS:

```bash
# Using iconutil (macOS)
mkdir icon.iconset
sips -z 512 512 icon.png --out icon.iconset/icon_512x512.png
iconutil -c icns icon.iconset -o assets/icon.icns
```

Or use an online converter like [CloudConvert](https://cloudconvert.com/png-to-icns).

## Troubleshooting

### "App is damaged and can't be opened"

This happens because the app isn't signed. To fix:

```bash
xattr -cr "/Applications/AP Legal Tracker.app"
```

Or right-click the app and select "Open" to bypass Gatekeeper.

### Database errors

If you encounter database issues:

1. Quit the app
2. Delete `~/Library/Application Support/ap-legal-tracker/ap-legal-tracker.db`
3. Restart the app (a fresh database will be created)

### eCourts portal not loading

The government eCourts portals sometimes have downtime. Check:
- [eCourts Status](https://ecourts.gov.in/)
- Try again after some time

## Future Enhancements

- [ ] Automated CAPTCHA handling using browser automation
- [ ] Push notifications via mobile app
- [ ] PDF export of case summaries
- [ ] Integration with third-party legal APIs
- [ ] Cloud sync across devices
- [ ] Calendar integration (Google Calendar, Apple Calendar)

## License

MIT License - Feel free to modify and use for personal purposes.

## Acknowledgments

- Data sourced from official [eCourts India](https://ecourts.gov.in/) portals
- Built with [Electron](https://www.electronjs.org/)

---

**Developed for personal legal case tracking in Andhra Pradesh courts.**
