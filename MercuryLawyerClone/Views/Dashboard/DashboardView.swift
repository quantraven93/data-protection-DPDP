//
//  DashboardView.swift
//  MercuryLawyerClone
//
//  Main dashboard with statistics and overview
//

import SwiftUI

struct DashboardView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var caseViewModel: CaseViewModel
    @EnvironmentObject var notificationManager: NotificationManager

    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible())
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Dashboard")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        Text("Overview of your legal practice")
                            .foregroundColor(.secondary)
                    }
                    Spacer()

                    Button {
                        Task {
                            await caseViewModel.refreshAllCases()
                        }
                    } label: {
                        Label("Sync All", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(caseViewModel.isLoading)
                }
                .padding(.horizontal)

                // Statistics Cards
                LazyVGrid(columns: columns, spacing: 16) {
                    StatCard(
                        title: "Total Cases",
                        value: "\(caseViewModel.statistics.totalCases)",
                        icon: "folder.fill",
                        color: .blue
                    )

                    StatCard(
                        title: "Pending",
                        value: "\(caseViewModel.statistics.pendingCases)",
                        icon: "clock.fill",
                        color: .orange
                    )

                    StatCard(
                        title: "This Week",
                        value: "\(caseViewModel.statistics.hearingsThisWeek)",
                        icon: "calendar",
                        color: .green
                    )

                    StatCard(
                        title: "Disposed",
                        value: "\(caseViewModel.statistics.disposedCases)",
                        icon: "checkmark.circle.fill",
                        color: .purple
                    )
                }
                .padding(.horizontal)

                HStack(spacing: 20) {
                    // Upcoming Hearings
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Upcoming Hearings")
                                .font(.headline)
                            Spacer()
                            Button("View All") {
                                appState.selectedSidebarItem = .upcomingHearings
                            }
                            .buttonStyle(.plain)
                            .foregroundColor(.accentColor)
                        }

                        if caseViewModel.upcomingHearings.isEmpty {
                            EmptyStateCard(
                                icon: "calendar.badge.clock",
                                title: "No Upcoming Hearings",
                                message: "Add cases to see their hearing dates"
                            )
                        } else {
                            VStack(spacing: 8) {
                                ForEach(caseViewModel.upcomingHearings.prefix(5)) { caseItem in
                                    UpcomingHearingRow(caseItem: caseItem)
                                        .onTapGesture {
                                            appState.selectedCase = caseItem
                                        }
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color(nsColor: .controlBackgroundColor))
                    .cornerRadius(12)

                    // Recent Notifications
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Recent Updates")
                                .font(.headline)
                            Spacer()
                            if notificationManager.unreadCount > 0 {
                                Text("\(notificationManager.unreadCount) new")
                                    .font(.caption)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.accentColor)
                                    .cornerRadius(8)
                            }
                        }

                        if notificationManager.notifications.isEmpty {
                            EmptyStateCard(
                                icon: "bell",
                                title: "No Notifications",
                                message: "Updates will appear here"
                            )
                        } else {
                            VStack(spacing: 8) {
                                ForEach(notificationManager.notifications.prefix(5)) { notification in
                                    NotificationRow(notification: notification)
                                }
                            }
                        }
                    }
                    .padding()
                    .background(Color(nsColor: .controlBackgroundColor))
                    .cornerRadius(12)
                }
                .padding(.horizontal)

                // Cases by Court Chart
                VStack(alignment: .leading, spacing: 12) {
                    Text("Cases by Court")
                        .font(.headline)

                    if caseViewModel.statistics.casesByCourt.isEmpty {
                        EmptyStateCard(
                            icon: "chart.bar",
                            title: "No Data Available",
                            message: "Add cases to see distribution"
                        )
                    } else {
                        VStack(spacing: 8) {
                            ForEach(Array(caseViewModel.statistics.casesByCourt.keys.sorted()), id: \.self) { court in
                                CourtBarRow(
                                    courtName: court,
                                    count: caseViewModel.statistics.casesByCourt[court] ?? 0,
                                    total: caseViewModel.statistics.totalCases
                                )
                            }
                        }
                    }
                }
                .padding()
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(12)
                .padding(.horizontal)

                // Quick Actions
                VStack(alignment: .leading, spacing: 12) {
                    Text("Quick Actions")
                        .font(.headline)

                    HStack(spacing: 16) {
                        QuickActionButton(
                            title: "Add Case",
                            icon: "plus.circle.fill",
                            color: .blue
                        ) {
                            appState.showAddCaseSheet = true
                        }

                        QuickActionButton(
                            title: "Import Cases",
                            icon: "square.and.arrow.down.fill",
                            color: .green
                        ) {
                            appState.showImportSheet = true
                        }

                        QuickActionButton(
                            title: "Export Report",
                            icon: "square.and.arrow.up.fill",
                            color: .orange
                        ) {
                            appState.showExportSheet = true
                        }

                        QuickActionButton(
                            title: "Search Cases",
                            icon: "magnifyingglass",
                            color: .purple
                        ) {
                            appState.selectedSidebarItem = .caseList
                        }
                    }
                }
                .padding()
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(12)
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Spacer()
            }

            Text(value)
                .font(.system(size: 32, weight: .bold, design: .rounded))

            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Upcoming Hearing Row
struct UpcomingHearingRow: View {
    let caseItem: Case

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(caseItem.displayTitle)
                    .font(.subheadline)
                    .fontWeight(.medium)
                Text(caseItem.court.name)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if let hearingDate = caseItem.nextHearingDate {
                VStack(alignment: .trailing, spacing: 4) {
                    Text(hearingDate, style: .date)
                        .font(.caption)
                        .fontWeight(.medium)

                    if let daysUntil = caseItem.daysUntilHearing {
                        Text(daysUntil == 0 ? "Today" : "\(daysUntil)d")
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(daysUntil <= 1 ? Color.red : Color.orange)
                            .cornerRadius(4)
                    }
                }
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(Color(nsColor: .textBackgroundColor))
        .cornerRadius(8)
    }
}

// MARK: - Notification Row
struct NotificationRow: View {
    let notification: AppNotification

    var body: some View {
        HStack {
            Image(systemName: notification.icon)
                .foregroundColor(.accentColor)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: 2) {
                Text(notification.title)
                    .font(.subheadline)
                    .fontWeight(notification.isRead ? .regular : .medium)
                Text(notification.message)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }

            Spacer()

            Text(notification.timeAgo)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(notification.isRead ? Color.clear : Color.accentColor.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Court Bar Row
struct CourtBarRow: View {
    let courtName: String
    let count: Int
    let total: Int

    var percentage: CGFloat {
        total > 0 ? CGFloat(count) / CGFloat(total) : 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(courtName)
                    .font(.caption)
                    .lineLimit(1)
                Spacer()
                Text("\(count)")
                    .font(.caption)
                    .fontWeight(.medium)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 8)
                        .cornerRadius(4)

                    Rectangle()
                        .fill(Color.accentColor)
                        .frame(width: geometry.size.width * percentage, height: 8)
                        .cornerRadius(4)
                }
            }
            .frame(height: 8)
        }
    }
}

// MARK: - Empty State Card
struct EmptyStateCard: View {
    let icon: String
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundColor(.secondary)

            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)

            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
    }
}

// MARK: - Quick Action Button
struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundColor(color)
                Text(title)
                    .font(.caption)
                    .foregroundColor(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(nsColor: .textBackgroundColor))
            .cornerRadius(8)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Preview
struct DashboardView_Previews: PreviewProvider {
    static var previews: some View {
        DashboardView()
            .environmentObject(AppState())
            .environmentObject(CaseViewModel())
            .environmentObject(NotificationManager())
            .frame(width: 800, height: 600)
    }
}
