//
//  CaseListView.swift
//  MercuryLawyerClone
//
//  View for displaying and managing cases
//

import SwiftUI

struct CaseListView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var caseViewModel: CaseViewModel
    @State private var selectedCases = Set<UUID>()
    @State private var showDeleteConfirmation = false

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            CaseListToolbar(selectedCases: $selectedCases, showDeleteConfirmation: $showDeleteConfirmation)

            Divider()

            // Filter Chips
            FilterChipsView()

            Divider()

            // Case List
            if caseViewModel.isLoading {
                ProgressView("Loading cases...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if caseViewModel.filteredCases.isEmpty {
                EmptyCaseListView()
            } else {
                List(selection: $selectedCases) {
                    ForEach(caseViewModel.filteredCases) { caseItem in
                        CaseRowView(caseItem: caseItem)
                            .tag(caseItem.id)
                            .onTapGesture {
                                appState.selectedCase = caseItem
                            }
                    }
                    .onDelete { indexSet in
                        deleteCases(at: indexSet)
                    }
                }
                .listStyle(.inset)
            }
        }
        .searchable(text: $caseViewModel.searchText, prompt: "Search cases...")
        .navigationTitle("All Cases")
        .toolbar {
            ToolbarItemGroup {
                Picker("Sort", selection: $caseViewModel.sortOrder) {
                    ForEach(CaseSortOrder.allCases, id: \.self) { order in
                        Text(order.rawValue).tag(order)
                    }
                }
                .pickerStyle(.menu)

                Button {
                    appState.showAddCaseSheet = true
                } label: {
                    Image(systemName: "plus")
                }
            }
        }
        .confirmationDialog(
            "Delete \(selectedCases.count) case(s)?",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                deleteSelectedCases()
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private func deleteCases(at indexSet: IndexSet) {
        let casesToDelete = indexSet.map { caseViewModel.filteredCases[$0] }
        Task {
            try? await caseViewModel.deleteCases(casesToDelete)
        }
    }

    private func deleteSelectedCases() {
        let casesToDelete = caseViewModel.cases.filter { selectedCases.contains($0.id) }
        Task {
            try? await caseViewModel.deleteCases(casesToDelete)
            selectedCases.removeAll()
        }
    }
}

// MARK: - Case List Toolbar
struct CaseListToolbar: View {
    @EnvironmentObject var caseViewModel: CaseViewModel
    @Binding var selectedCases: Set<UUID>
    @Binding var showDeleteConfirmation: Bool

    var body: some View {
        HStack(spacing: 16) {
            // Selection info
            if !selectedCases.isEmpty {
                Text("\(selectedCases.count) selected")
                    .font(.subheadline)
                    .foregroundColor(.secondary)

                Button(role: .destructive) {
                    showDeleteConfirmation = true
                } label: {
                    Label("Delete", systemImage: "trash")
                }

                Button {
                    selectedCases.removeAll()
                } label: {
                    Text("Clear Selection")
                }
            }

            Spacer()

            // Stats
            HStack(spacing: 16) {
                Label("\(caseViewModel.statistics.totalCases) total", systemImage: "folder")
                Label("\(caseViewModel.statistics.pendingCases) pending", systemImage: "clock")
            }
            .font(.caption)
            .foregroundColor(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(nsColor: .controlBackgroundColor))
    }
}

// MARK: - Filter Chips View
struct FilterChipsView: View {
    @EnvironmentObject var caseViewModel: CaseViewModel

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(title: "All", isSelected: caseViewModel.selectedFilter == .all) {
                    caseViewModel.selectedFilter = .all
                }

                FilterChip(title: "Pending", isSelected: caseViewModel.selectedFilter == .pending) {
                    caseViewModel.selectedFilter = .pending
                }

                FilterChip(title: "Disposed", isSelected: caseViewModel.selectedFilter == .disposed) {
                    caseViewModel.selectedFilter = .disposed
                }

                FilterChip(title: "Favorites", isSelected: caseViewModel.selectedFilter == .favorites) {
                    caseViewModel.selectedFilter = .favorites
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }
}

// MARK: - Filter Chip
struct FilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.accentColor : Color(nsColor: .controlBackgroundColor))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Case Row View
struct CaseRowView: View {
    let caseItem: Case
    @EnvironmentObject var caseViewModel: CaseViewModel

    var body: some View {
        HStack(spacing: 12) {
            // Favorite indicator
            Button {
                Task {
                    try? await caseViewModel.toggleFavorite(caseItem)
                }
            } label: {
                Image(systemName: caseItem.isFavorite ? "star.fill" : "star")
                    .foregroundColor(caseItem.isFavorite ? .yellow : .secondary)
            }
            .buttonStyle(.plain)

            // Case info
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(caseItem.displayTitle)
                        .font(.headline)

                    StatusBadge(status: caseItem.status)
                }

                Text(caseItem.partiesDisplay)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                HStack {
                    Label(caseItem.court.name, systemImage: caseItem.court.type.icon)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(1)

                    if let advocate = caseItem.advocate {
                        Text("•")
                            .foregroundColor(.secondary)
                        Text(advocate)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }

            Spacer()

            // Next hearing
            if let hearingDate = caseItem.nextHearingDate {
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Next Hearing")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(hearingDate, style: .date)
                        .font(.caption)
                        .fontWeight(.medium)

                    if let days = caseItem.daysUntilHearing {
                        HearingCountdown(days: days)
                    }
                }
            }

            // Chevron
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }
}

// MARK: - Status Badge
struct StatusBadge: View {
    let status: CaseStatus

    var color: Color {
        switch status {
        case .pending: return .yellow
        case .disposed: return .green
        case .transferred: return .blue
        case .withdrawn: return .gray
        case .dismissed: return .red
        case .decreed: return .purple
        case .adjourned: return .orange
        }
    }

    var body: some View {
        Text(status.rawValue)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(4)
    }
}

// MARK: - Hearing Countdown
struct HearingCountdown: View {
    let days: Int

    var color: Color {
        if days <= 0 { return .red }
        if days <= 3 { return .orange }
        return .green
    }

    var text: String {
        if days == 0 { return "Today" }
        if days == 1 { return "Tomorrow" }
        return "In \(days) days"
    }

    var body: some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.2))
            .foregroundColor(color)
            .cornerRadius(4)
    }
}

// MARK: - Empty Case List View
struct EmptyCaseListView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "folder.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(.secondary)

            Text("No Cases Found")
                .font(.title2)
                .fontWeight(.semibold)

            Text("Add your first case to start tracking")
                .foregroundColor(.secondary)

            Button {
                appState.showAddCaseSheet = true
            } label: {
                Label("Add Case", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Preview
struct CaseListView_Previews: PreviewProvider {
    static var previews: some View {
        CaseListView()
            .environmentObject(AppState())
            .environmentObject(CaseViewModel())
            .frame(width: 600, height: 500)
    }
}
