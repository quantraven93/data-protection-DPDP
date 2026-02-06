//
//  CaseDetailView.swift
//  MercuryLawyerClone
//
//  Detailed view for a single case
//

import SwiftUI

struct CaseDetailView: View {
    let caseItem: Case
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var caseViewModel: CaseViewModel
    @State private var isRefreshing = false
    @State private var showEditSheet = false
    @State private var selectedTab = 0

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Header Card
                CaseHeaderCard(caseItem: caseItem, isRefreshing: $isRefreshing)

                // Tab Selector
                Picker("", selection: $selectedTab) {
                    Text("Details").tag(0)
                    Text("Hearings").tag(1)
                    Text("Orders").tag(2)
                    Text("Notes").tag(3)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                // Content based on selected tab
                switch selectedTab {
                case 0:
                    CaseDetailsSection(caseItem: caseItem)
                case 1:
                    HearingHistorySection(caseItem: caseItem)
                case 2:
                    OrdersSection(caseItem: caseItem)
                case 3:
                    NotesSection(caseItem: caseItem)
                default:
                    EmptyView()
                }
            }
            .padding()
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .navigationTitle(caseItem.displayTitle)
        .toolbar {
            ToolbarItemGroup {
                Button {
                    Task {
                        isRefreshing = true
                        _ = try? await caseViewModel.refreshCase(caseItem)
                        isRefreshing = false
                    }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .disabled(isRefreshing)

                Button {
                    Task {
                        try? await caseViewModel.toggleFavorite(caseItem)
                    }
                } label: {
                    Image(systemName: caseItem.isFavorite ? "star.fill" : "star")
                        .foregroundColor(caseItem.isFavorite ? .yellow : nil)
                }

                Button {
                    showEditSheet = true
                } label: {
                    Image(systemName: "pencil")
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            EditCaseSheet(caseItem: caseItem)
        }
    }
}

// MARK: - Case Header Card
struct CaseHeaderCard: View {
    let caseItem: Case
    @Binding var isRefreshing: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(caseItem.displayTitle)
                        .font(.title)
                        .fontWeight(.bold)

                    Text(caseItem.partiesDisplay)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                Spacer()

                StatusBadge(status: caseItem.status)
            }

            Divider()

            // Quick Info
            HStack(spacing: 24) {
                InfoItem(icon: "building.columns", title: "Court", value: caseItem.court.name)
                InfoItem(icon: "calendar", title: "Year", value: String(caseItem.year))

                if let advocate = caseItem.advocate {
                    InfoItem(icon: "person", title: "Advocate", value: advocate)
                }
            }

            // Next Hearing
            if let hearingDate = caseItem.nextHearingDate {
                HStack {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundColor(.accentColor)

                    VStack(alignment: .leading) {
                        Text("Next Hearing")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(hearingDate, style: .date)
                            .font(.headline)
                    }

                    Spacer()

                    if let days = caseItem.daysUntilHearing {
                        HearingCountdown(days: days)
                    }
                }
                .padding()
                .background(Color.accentColor.opacity(0.1))
                .cornerRadius(8)
            }

            // Last Updated
            HStack {
                Image(systemName: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
                Text("Last updated: \(caseItem.lastUpdated, style: .relative) ago")
                    .font(.caption)
                    .foregroundColor(.secondary)

                if isRefreshing {
                    ProgressView()
                        .scaleEffect(0.7)
                }
            }
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Info Item
struct InfoItem: View {
    let icon: String
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Label(title, systemImage: icon)
                .font(.caption)
                .foregroundColor(.secondary)
            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(2)
        }
    }
}

// MARK: - Case Details Section
struct CaseDetailsSection: View {
    let caseItem: Case

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeader(title: "Case Information")

            VStack(spacing: 12) {
                DetailRow(label: "Case Type", value: caseItem.caseType.fullName)
                DetailRow(label: "Case Number", value: caseItem.caseNumber)
                DetailRow(label: "Year", value: String(caseItem.year))
                DetailRow(label: "Status", value: caseItem.status.rawValue)

                if let filingDate = caseItem.filingDate {
                    DetailRow(label: "Filing Date", value: filingDate.formatted(date: .long, time: .omitted))
                }
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .cornerRadius(12)

            SectionHeader(title: "Parties")

            VStack(spacing: 12) {
                DetailRow(label: "Petitioner", value: caseItem.petitioner)
                DetailRow(label: "Respondent", value: caseItem.respondent)
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .cornerRadius(12)

            SectionHeader(title: "Court Details")

            VStack(spacing: 12) {
                DetailRow(label: "Court", value: caseItem.court.name)
                DetailRow(label: "Court Type", value: caseItem.court.type.rawValue)

                if let courtNumber = caseItem.courtNumber {
                    DetailRow(label: "Court Number", value: courtNumber)
                }

                if let judgeName = caseItem.judgeName {
                    DetailRow(label: "Before", value: judgeName)
                }
            }
            .padding()
            .background(Color(nsColor: .controlBackgroundColor))
            .cornerRadius(12)

            // Tags
            if !caseItem.tags.isEmpty {
                SectionHeader(title: "Tags")

                FlowLayout(spacing: 8) {
                    ForEach(caseItem.tags, id: \.self) { tag in
                        Text(tag)
                            .font(.caption)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 4)
                            .background(Color.accentColor.opacity(0.2))
                            .cornerRadius(12)
                    }
                }
                .padding()
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(12)
            }
        }
    }
}

// MARK: - Detail Row
struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - Section Header
struct SectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline)
            .padding(.top, 8)
    }
}

// MARK: - Hearing History Section
struct HearingHistorySection: View {
    let caseItem: Case

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if caseItem.hearingHistory.isEmpty {
                EmptyStateCard(
                    icon: "calendar",
                    title: "No Hearing History",
                    message: "Hearing records will appear here"
                )
                .padding()
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(12)
            } else {
                ForEach(caseItem.hearingHistory) { hearing in
                    HearingCard(hearing: hearing)
                }
            }
        }
    }
}

// MARK: - Hearing Card
struct HearingCard: View {
    let hearing: HearingEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.accentColor)
                Text(hearing.date, style: .date)
                    .font(.headline)
                Spacer()
                if let courtNumber = hearing.courtNumber {
                    Text("Court \(courtNumber)")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.secondary.opacity(0.2))
                        .cornerRadius(4)
                }
            }

            Text(hearing.purpose)
                .font(.subheadline)

            if let outcome = hearing.outcome {
                HStack {
                    Text("Outcome:")
                        .foregroundColor(.secondary)
                    Text(outcome)
                }
                .font(.caption)
            }

            if let remarks = hearing.remarks {
                Text(remarks)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            if let nextDate = hearing.nextDate {
                HStack {
                    Image(systemName: "arrow.right")
                        .font(.caption)
                    Text("Next: \(nextDate, style: .date)")
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundColor(.accentColor)
            }
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Orders Section
struct OrdersSection: View {
    let caseItem: Case

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            if caseItem.orders.isEmpty {
                EmptyStateCard(
                    icon: "doc.text",
                    title: "No Orders",
                    message: "Court orders will appear here"
                )
                .padding()
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(12)
            } else {
                ForEach(caseItem.orders) { order in
                    OrderCard(order: order)
                }
            }
        }
    }
}

// MARK: - Order Card
struct OrderCard: View {
    let order: CourtOrder

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "doc.text")
                    .foregroundColor(.accentColor)

                VStack(alignment: .leading) {
                    Text(order.orderType.rawValue)
                        .font(.headline)
                    Text(order.date, style: .date)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Spacer()

                if !order.isRead {
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: 8, height: 8)
                }
            }

            Text(order.summary)
                .font(.subheadline)

            if order.documentURL != nil {
                Button {
                    // Open document
                } label: {
                    Label("View Document", systemImage: "arrow.up.right.square")
                        .font(.caption)
                }
            }
        }
        .padding()
        .background(Color(nsColor: .controlBackgroundColor))
        .cornerRadius(12)
    }
}

// MARK: - Notes Section
struct NotesSection: View {
    let caseItem: Case
    @State private var notes: String = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            TextEditor(text: $notes)
                .font(.body)
                .frame(minHeight: 200)
                .padding(8)
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(12)
                .onAppear {
                    notes = caseItem.notes
                }

            HStack {
                Spacer()
                Button("Save Notes") {
                    // Save notes
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }
}

// MARK: - Flow Layout
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return CGSize(width: proposal.width ?? 0, height: result.height)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var positions: [CGPoint] = []
        var height: CGFloat = 0

        init(in width: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > width && x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }

            height = y + lineHeight
        }
    }
}

// MARK: - Edit Case Sheet (placeholder)
struct EditCaseSheet: View {
    let caseItem: Case
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            Text("Edit Case: \(caseItem.displayTitle)")
                .navigationTitle("Edit Case")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Save") { dismiss() }
                    }
                }
        }
        .frame(width: 500, height: 600)
    }
}

// MARK: - Preview
struct CaseDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let sampleCase = Case(
            caseNumber: "12345",
            caseType: .wp,
            court: Court.allCourts.first!,
            year: 2024,
            petitioner: "ABC Pvt Ltd",
            respondent: "State of AP",
            nextHearingDate: Date().addingTimeInterval(86400 * 3),
            advocate: "Adv. Sharma"
        )

        CaseDetailView(caseItem: sampleCase)
            .environmentObject(AppState())
            .environmentObject(CaseViewModel())
            .frame(width: 400, height: 700)
    }
}
