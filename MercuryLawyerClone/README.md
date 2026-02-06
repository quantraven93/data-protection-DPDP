# Mercury Lawyer Clone

A native macOS application for Indian legal professionals to track court cases across Supreme Court, High Courts, and District Courts.

## Features

- **Dashboard**: Overview of all cases with statistics and quick actions
- **Case Management**: Add, edit, and track cases from multiple courts
- **Calendar View**: Visual calendar with hearing dates
- **Notifications**: Reminders for upcoming hearings and case updates
- **Reports**: Analytics and export capabilities
- **Display Board**: Real-time court status (when available)
- **Dark Mode**: Full dark mode support

## Requirements

- macOS 13.0 (Ventura) or later
- Xcode 15.0 or later
- Swift 5.9 or later

## Setup Instructions

### Option 1: Create Xcode Project

1. Open Xcode
2. Create a new project: **File > New > Project**
3. Select **macOS > App**
4. Configure:
   - Product Name: `MercuryLawyerClone`
   - Organization Identifier: `com.yourcompany`
   - Interface: **SwiftUI**
   - Language: **Swift**
   - Uncheck "Include Tests"

5. Copy all files from this directory into your project:
   - `MercuryLawyerCloneApp.swift` → Replace the generated App file
   - `Models/` → Create group and add files
   - `Views/` → Create group and add files
   - `ViewModels/` → Create group and add files
   - `Services/` → Create group and add files

6. In project settings:
   - Set Deployment Target to **macOS 13.0**
   - Enable **Hardened Runtime**
   - Add capabilities: **App Sandbox**, **Network (Outgoing)**

### Option 2: Swift Package Manager

```bash
cd MercuryLawyerClone
swift build
swift run
```

## Project Structure

```
MercuryLawyerClone/
├── MercuryLawyerCloneApp.swift    # Main app entry point
├── Models/
│   ├── Case.swift                  # Case model with types and status
│   ├── Court.swift                 # Court model with all Indian courts
│   ├── User.swift                  # User and subscription models
│   └── Notification.swift          # Notification models
├── Views/
│   ├── ContentView.swift           # Main three-pane layout
│   ├── Dashboard/
│   │   └── DashboardView.swift     # Dashboard with statistics
│   ├── CaseManagement/
│   │   ├── CaseListView.swift      # Case listing and filtering
│   │   ├── CaseDetailView.swift    # Case details and history
│   │   └── AddCaseSheet.swift      # Add new case modal
│   ├── Calendar/
│   │   └── CalendarView.swift      # Calendar and upcoming hearings
│   └── Settings/
│       └── SettingsView.swift      # App settings
├── ViewModels/
│   ├── CaseViewModel.swift         # Case management logic
│   └── NotificationManager.swift   # Notification handling
├── Services/
│   ├── DataService.swift           # Data persistence
│   └── WebScrapingService.swift    # Court website scraping
└── Resources/
```

## Supported Courts

### Supreme Court
- Supreme Court of India

### High Courts
- Andhra Pradesh High Court
- Telangana High Court
- Karnataka High Court
- Kerala High Court
- Madras High Court (Tamil Nadu)
- Bombay High Court
- Delhi High Court
- Gujarat High Court
- Calcutta High Court
- Allahabad High Court
- And more...

### District Courts (Andhra Pradesh)
- All 13 district courts in AP

## Usage

### Adding a Case

1. Click the **+** button or press **⌘N**
2. Select search method:
   - **By Case Number**: Enter court, case type, number, and year
   - **By Party Name**: Search by petitioner/respondent name
   - **By Advocate**: Search by advocate name
   - **Custom Entry**: Manual entry with all details
3. Click **Submit** to add the case

### Syncing Cases

- Cases automatically sync when added
- Click **Sync All** on the dashboard to refresh all cases
- Sync respects court website rate limits

### Exporting Data

1. Go to **Cases > Export to PDF/Excel**
2. Select format
3. Choose save location

## Building for Distribution

1. In Xcode, select **Product > Archive**
2. In the Organizer, click **Distribute App**
3. Choose **Developer ID** for direct distribution
4. Sign and notarize the app
5. Export the `.app` file

## Technical Notes

### Web Scraping

The app uses respectful web scraping with:
- 2-second minimum delay between requests
- Proper User-Agent headers
- Error handling for website changes

### Data Storage

- Cases are stored locally in JSON format
- Data location: `~/Library/Application Support/MercuryLawyerClone/`
- Automatic backup recommended

### Notifications

- Uses UserNotifications framework
- Supports:
  - Hearing reminders (1 day, 3 days before)
  - Order/judgment alerts
  - Status change notifications
  - Daily digest
  - Weekly reports

## License

This project is for educational purposes. Please respect court website terms of service.

## Contributing

Contributions welcome! Please read the contributing guidelines first.
