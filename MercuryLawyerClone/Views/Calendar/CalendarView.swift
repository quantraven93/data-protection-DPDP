//
//  CalendarView.swift
//  MercuryLawyerClone
//
//  Calendar view for hearing dates
//

import SwiftUI

struct CalendarView: View {
    @EnvironmentObject var caseViewModel: CaseViewModel
    @EnvironmentObject var appState: AppState
    @State private var selectedDate = Date()
    @State private var currentMonth = Date()

    private let calendar = Calendar.current
    private let daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

    var body: some View {
        HSplitView {
            // Calendar
            VStack(spacing: 16) {
                // Month Navigation
                HStack {
                    Button {
                        withAnimation {
                            currentMonth = calendar.date(byAdding: .month, value: -1, to: currentMonth) ?? currentMonth
                        }
                    } label: {
                        Image(systemName: "chevron.left")
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    Text(monthYearString(from: currentMonth))
                        .font(.title2)
                        .fontWeight(.bold)

                    Spacer()

                    Button {
                        withAnimation {
                            currentMonth = calendar.date(byAdding: .month, value: 1, to: currentMonth) ?? currentMonth
                        }
                    } label: {
                        Image(systemName: "chevron.right")
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal)

                // Day Headers
                HStack(spacing: 0) {
                    ForEach(daysOfWeek, id: \.self) { day in
                        Text(day)
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity)
                    }
                }

                // Calendar Grid
                LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 7), spacing: 8) {
                    ForEach(daysInMonth(), id: \.self) { date in
                        if let date = date {
                            CalendarDayCell(
                                date: date,
                                isSelected: calendar.isDate(date, inSameDayAs: selectedDate),
                                isToday: calendar.isDateInToday(date),
                                hearingCount: caseViewModel.casesForDate(date).count
                            ) {
                                selectedDate = date
                            }
                        } else {
                            Color.clear
                                .frame(height: 40)
                        }
                    }
                }
                .padding(.horizontal)

                Spacer()

                // Today Button
                Button {
                    withAnimation {
                        selectedDate = Date()
                        currentMonth = Date()
                    }
                } label: {
                    Label("Today", systemImage: "calendar")
                }
                .buttonStyle(.bordered)
            }
            .frame(minWidth: 300)
            .padding()

            // Selected Date Hearings
            VStack(alignment: .leading, spacing: 16) {
                Text(selectedDateString)
                    .font(.title2)
                    .fontWeight(.bold)

                let casesForDay = caseViewModel.casesForDate(selectedDate)

                if casesForDay.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "calendar.badge.exclamationmark")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No hearings scheduled")
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        VStack(spacing: 12) {
                            ForEach(casesForDay) { caseItem in
                                CalendarCaseCard(caseItem: caseItem)
                                    .onTapGesture {
                                        appState.selectedCase = caseItem
                                    }
                            }
                        }
                    }
                }
            }
            .frame(minWidth: 300)
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
        }
        .navigationTitle("Calendar")
    }

    var selectedDateString: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .full
        return formatter.string(from: selectedDate)
    }

    func monthYearString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date)
    }

    func daysInMonth() -> [Date?] {
        guard let monthInterval = calendar.dateInterval(of: .month, for: currentMonth),
              let monthFirstWeek = calendar.dateInterval(of: .weekOfMonth, for: monthInterval.start) else {
            return []
        }

        let startDate = monthFirstWeek.start
        var dates: [Date?] = []

        for i in 0..<42 {
            if let date = calendar.date(byAdding: .day, value: i, to: startDate) {
                if calendar.isDate(date, equalTo: currentMonth, toGranularity: .month) {
                    dates.append(date)
                } else if dates.isEmpty || dates.last != nil {
                    dates.append(nil)
                }
            }
        }

        // Trim trailing nils
        while dates.last == nil && !dates.isEmpty {
            dates.removeLast()
        }

        return dates
    }
}

// MARK: - Calendar Day Cell
struct CalendarDayCell: View {
    let date: Date
    let isSelected: Bool
    let isToday: Bool
    let hearingCount: Int
    let action: () -> Void

    private let calendar = Calendar.current

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Text("\(calendar.component(.day, from: date))")
                    .font(.body)
                    .fontWeight(isToday ? .bold : .regular)

                if hearingCount > 0 {
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: 6, height: 6)
                }
            }
            .frame(height: 40)
            .frame(maxWidth: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(isSelected ? Color.accentColor : Color.clear)
            )
            .foregroundColor(isSelected ? .white : (isToday ? .accentColor : .primary))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Calendar Case Card
struct CalendarCaseCard: View {
    let caseItem: Case

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(caseItem.displayTitle)
                    .font(.headline)

                Text(caseItem.partiesDisplay)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(1)

                Text(caseItem.court.name)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Spacer()

            StatusBadge(status: caseItem.status)
        }
        .padding()
        .background(Color(nsColor: .textBackgroundColor))
        .cornerRadius(8)
    }
}

// MARK: - Upcoming Hearings View
struct UpcomingHearingsView: View {
    @EnvironmentObject var caseViewModel: CaseViewModel
    @EnvironmentObject var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            if caseViewModel.upcomingHearings.isEmpty {
                VStack(spacing: 20) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: 60))
                        .foregroundColor(.secondary)

                    Text("No Upcoming Hearings")
                        .font(.title2)

                    Text("Add cases with hearing dates to see them here")
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(groupedHearings(), id: \.0) { date, cases in
                        Section {
                            ForEach(cases) { caseItem in
                                UpcomingHearingRow(caseItem: caseItem)
                                    .onTapGesture {
                                        appState.selectedCase = caseItem
                                    }
                            }
                        } header: {
                            Text(formatSectionDate(date))
                                .font(.headline)
                        }
                    }
                }
                .listStyle(.inset)
            }
        }
        .navigationTitle("Upcoming Hearings")
        .toolbar {
            ToolbarItem {
                Menu {
                    Button("Next 7 Days") {}
                    Button("Next 30 Days") {}
                    Button("All Upcoming") {}
                } label: {
                    Label("Filter", systemImage: "line.3.horizontal.decrease.circle")
                }
            }
        }
    }

    func groupedHearings() -> [(Date, [Case])] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: caseViewModel.upcomingHearings) { caseItem in
            calendar.startOfDay(for: caseItem.nextHearingDate ?? Date())
        }
        return grouped.sorted { $0.key < $1.key }
    }

    func formatSectionDate(_ date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInTomorrow(date) {
            return "Tomorrow"
        } else {
            let formatter = DateFormatter()
            formatter.dateStyle = .full
            return formatter.string(from: date)
        }
    }
}

// MARK: - Display Board View
struct DisplayBoardView: View {
    @State private var selectedCourt: Court?

    var body: some View {
        VStack(spacing: 20) {
            // Court Selector
            Picker("Select Court", selection: $selectedCourt) {
                Text("Select a Court").tag(nil as Court?)
                ForEach(Court.allCourts.filter { $0.type == .highCourt }) { court in
                    Text(court.name).tag(court as Court?)
                }
            }
            .pickerStyle(.menu)
            .frame(width: 300)

            if selectedCourt != nil {
                // Placeholder for real-time court status
                VStack(spacing: 16) {
                    Image(systemName: "tv")
                        .font(.system(size: 60))
                        .foregroundColor(.secondary)

                    Text("Display Board")
                        .font(.title2)

                    Text("Real-time court status will be displayed here")
                        .foregroundColor(.secondary)

                    Text("This feature requires integration with court display systems")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "tv.slash")
                        .font(.system(size: 60))
                        .foregroundColor(.secondary)

                    Text("Select a Court")
                        .font(.title2)

                    Text("Choose a court to view its live display board")
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
        .navigationTitle("Display Board")
    }
}

// MARK: - Reports View
struct ReportsView: View {
    @EnvironmentObject var caseViewModel: CaseViewModel

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Summary Cards
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 16) {
                    ReportCard(
                        title: "Total Cases",
                        value: "\(caseViewModel.statistics.totalCases)",
                        icon: "folder.fill",
                        color: .blue
                    )

                    ReportCard(
                        title: "Pending",
                        value: "\(caseViewModel.statistics.pendingCases)",
                        icon: "clock.fill",
                        color: .orange
                    )

                    ReportCard(
                        title: "Disposed",
                        value: "\(caseViewModel.statistics.disposedCases)",
                        icon: "checkmark.circle.fill",
                        color: .green
                    )

                    ReportCard(
                        title: "This Month",
                        value: "\(caseViewModel.statistics.hearingsThisMonth)",
                        icon: "calendar",
                        color: .purple
                    )
                }

                // Cases by Status
                VStack(alignment: .leading, spacing: 12) {
                    Text("Cases by Status")
                        .font(.headline)

                    VStack(spacing: 8) {
                        ForEach(CaseStatus.allCases, id: \.self) { status in
                            let count = caseViewModel.statistics.casesByStatus[status] ?? 0
                            if count > 0 {
                                HStack {
                                    StatusBadge(status: status)
                                    Spacer()
                                    Text("\(count)")
                                        .fontWeight(.medium)
                                }
                            }
                        }
                    }
                }
                .padding()
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(12)

                // Cases by Court
                VStack(alignment: .leading, spacing: 12) {
                    Text("Cases by Court")
                        .font(.headline)

                    if caseViewModel.statistics.casesByCourt.isEmpty {
                        Text("No data available")
                            .foregroundColor(.secondary)
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
            }
            .padding()
        }
        .navigationTitle("Reports")
        .toolbar {
            ToolbarItem {
                Button {
                    // Export report
                } label: {
                    Label("Export", systemImage: "square.and.arrow.up")
                }
            }
        }
    }
}

// MARK: - Report Card
struct ReportCard: View {
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
                .font(.system(size: 36, weight: .bold, design: .rounded))

            Text(title)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Preview
struct CalendarView_Previews: PreviewProvider {
    static var previews: some View {
        CalendarView()
            .environmentObject(CaseViewModel())
            .environmentObject(AppState())
            .frame(width: 800, height: 600)
    }
}
