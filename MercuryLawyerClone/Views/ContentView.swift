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
                ForEach([SidebarItem.dashboard, .caseList, .upcomingHearings]) { item in
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
                    NavigationLink(value: SidebarItem.caseList) {
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
        .toolbar(id: "sidebar") {
            ToolbarItem(id: "addCase", placement: .primaryAction) {
                Button {
                    appState.showAddCaseSheet = true
                } label: {
                    Image(systemName: "plus")
                }
                .help("Add New Case")
            }
        }
        .toolbarRole(.editor)
        .navigationTitle("Mercury Lawyer")
    }

    private func badgeCount(for item: SidebarItem) -> Int {
        switch item {
        case .caseList:
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
            case .caseList:
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
