//
//  ContentView.swift
//  MercuryLawyerClone
//
//  Main content view with three-pane layout
//

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var caseViewModel: CaseViewModel
    @EnvironmentObject var notificationManager: NotificationManager
    @State private var showErrorAlert = false

    var body: some View {
        NavigationSplitView {
            SidebarView()
        } content: {
            MainContentView()
        } detail: {
            DetailView()
        }
        .navigationSplitViewStyle(.balanced)
        .sheet(isPresented: $appState.showAddCaseSheet) {
            AddCaseSheet()
        }
        .sheet(isPresented: $appState.showImportSheet) {
            ImportCasesSheet()
        }
        .sheet(isPresented: $appState.showExportSheet) {
            ExportSheet()
        }
        .alert("Error", isPresented: $showErrorAlert) {
            Button("OK") {
                appState.errorMessage = nil
            }
        } message: {
            Text(appState.errorMessage ?? "An error occurred")
        }
        .onChange(of: appState.errorMessage) { _, newValue in
            showErrorAlert = newValue != nil
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Sidebar View
struct SidebarView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var caseViewModel: CaseViewModel
    @EnvironmentObject var notificationManager: NotificationManager

    var body: some View {
        List(selection: $appState.selectedSidebarItem) {
            Section {
                ForEach([SidebarItem.dashboard, .allCases, .upcomingHearings]) { item in
                    NavigationLink(value: item) {
                        Label(item.rawValue, systemImage: item.icon)
                    }
                    .badge(badgeCount(for: item))
                }
            }

            Section("Tools") {
                ForEach([SidebarItem.calendar, .displayBoard, .reports]) { item in
                    NavigationLink(value: item) {
                        Label(item.rawValue, systemImage: item.icon)
                    }
                }
            }

            Section("Courts") {
                ForEach(Court.allCourts.prefix(5)) { court in
                    NavigationLink(value: SidebarItem.allCases) {
                        Label(court.name, systemImage: court.type.icon)
                            .lineLimit(1)
                    }
                }
            }

            Section {
                NavigationLink(value: SidebarItem.settings) {
                    Label("Settings", systemImage: "gear")
                }
            }
        }
        .listStyle(.sidebar)
        .frame(minWidth: 220)
        .toolbar {
            ToolbarItem {
                Button {
                    appState.showAddCaseSheet = true
                } label: {
                    Image(systemName: "plus")
                }
                .help("Add New Case")
            }
        }
        .navigationTitle("Mercury Lawyer")
    }

    private func badgeCount(for item: SidebarItem) -> Int {
        switch item {
        case .allCases:
            return caseViewModel.cases.count
        case .upcomingHearings:
            return caseViewModel.upcomingHearings.count
        default:
            return 0
        }
    }
}

// MARK: - Main Content View
struct MainContentView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var caseViewModel: CaseViewModel

    var body: some View {
        Group {
            switch appState.selectedSidebarItem {
            case .dashboard:
                DashboardView()
            case .allCases:
                CaseListView()
            case .upcomingHearings:
                UpcomingHearingsView()
            case .calendar:
                CalendarView()
            case .displayBoard:
                DisplayBoardView()
            case .reports:
                ReportsView()
            case .settings:
                SettingsView()
            }
        }
        .frame(minWidth: 400)
    }
}

// MARK: - Detail View
struct DetailView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if let selectedCase = appState.selectedCase {
                CaseDetailView(caseItem: selectedCase)
            } else {
                EmptyDetailView()
            }
        }
        .frame(minWidth: 300)
    }
}

// MARK: - Empty Detail View
struct EmptyDetailView: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("Select a Case")
                .font(.title2)
                .foregroundColor(.secondary)

            Text("Choose a case from the list to view its details")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

// MARK: - Preview
struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(AppState())
            .environmentObject(CaseViewModel())
            .environmentObject(NotificationManager())
    }
}
