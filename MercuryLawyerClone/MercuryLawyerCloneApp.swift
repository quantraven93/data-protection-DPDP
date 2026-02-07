//
//  MercuryLawyerCloneApp.swift
//  MercuryLawyerClone
//
//  A macOS application for Indian legal professionals to track court cases
//

import SwiftUI

@main
struct MercuryLawyerCloneApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var caseViewModel = CaseViewModel()
    @StateObject private var notificationManager = NotificationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(caseViewModel)
                .environmentObject(notificationManager)
                .frame(minWidth: 1200, minHeight: 700)
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Case") {
                    appState.showAddCaseSheet = true
                }
                .keyboardShortcut("n", modifiers: .command)

                Button("Import Cases...") {
                    appState.showImportSheet = true
                }
                .keyboardShortcut("i", modifiers: [.command, .shift])
            }

            CommandMenu("Cases") {
                Button("Refresh All Cases") {
                    Task {
                        await caseViewModel.refreshAllCases()
                    }
                }
                .keyboardShortcut("r", modifiers: .command)

                Divider()

                Button("Export to PDF...") {
                    appState.showExportSheet = true
                }
                .keyboardShortcut("e", modifiers: [.command, .shift])

                Button("Export to Excel...") {
                    appState.exportFormat = .excel
                    appState.showExportSheet = true
                }
            }
        }

        Settings {
            SettingsView()
                .environmentObject(appState)
                .environmentObject(notificationManager)
        }
    }
}

// MARK: - App State
class AppState: ObservableObject {
    @Published var selectedSidebarItem: SidebarItem = .dashboard
    @Published var selectedCase: Case?
    @Published var showAddCaseSheet = false
    @Published var showImportSheet = false
    @Published var showExportSheet = false
    @Published var exportFormat: ExportFormat = .pdf
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var errorMessage: String?

    enum ExportFormat {
        case pdf, excel, csv
    }
}

// MARK: - Sidebar Items
enum SidebarItem: String, CaseIterable, Identifiable {
    case dashboard = "Dashboard"
    case caseList = "All Cases"
    case upcomingHearings = "Upcoming Hearings"
    case calendar = "Calendar"
    case displayBoard = "Display Board"
    case reports = "Reports"
    case settings = "Settings"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .dashboard: return "square.grid.2x2"
        case .caseList: return "folder"
        case .upcomingHearings: return "clock"
        case .calendar: return "calendar"
        case .displayBoard: return "tv"
        case .reports: return "chart.bar"
        case .settings: return "gear"
        }
    }
}
