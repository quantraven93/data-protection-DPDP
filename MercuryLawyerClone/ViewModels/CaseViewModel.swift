//
//  CaseViewModel.swift
//  MercuryLawyerClone
//
//  ViewModel for managing cases
//

import Foundation
import Combine

@MainActor
class CaseViewModel: ObservableObject {
    // MARK: - Published Properties
    @Published var cases: [Case] = []
    @Published var filteredCases: [Case] = []
    @Published var selectedFilter: CaseFilter = .all
    @Published var sortOrder: CaseSortOrder = .nextHearing
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var upcomingHearings: [Case] = []
    @Published var statistics: CaseStatistics = CaseStatistics()

    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private let dataService = DataService.shared
    private let webScrapingService = WebScrapingService.shared

    // MARK: - Initialization
    init() {
        setupBindings()
        loadCases()
    }

    // MARK: - Setup
    private func setupBindings() {
        // Filter cases when search text or filter changes
        Publishers.CombineLatest3($cases, $searchText, $selectedFilter)
            .debounce(for: .milliseconds(300), scheduler: RunLoop.main)
            .map { [weak self] cases, searchText, filter in
                self?.filterCases(cases, searchText: searchText, filter: filter) ?? []
            }
            .assign(to: &$filteredCases)

        // Update statistics when cases change
        $cases
            .map { CaseStatistics(from: $0) }
            .assign(to: &$statistics)

        // Update upcoming hearings
        $cases
            .map { cases in
                cases.filter { $0.nextHearingDate != nil && $0.nextHearingDate! >= Date() }
                    .sorted { ($0.nextHearingDate ?? .distantFuture) < ($1.nextHearingDate ?? .distantFuture) }
            }
            .assign(to: &$upcomingHearings)
    }

    // MARK: - Data Operations
    func loadCases() {
        isLoading = true
        Task {
            do {
                cases = try await dataService.loadCases()
                isLoading = false
            } catch {
                errorMessage = "Failed to load cases: \(error.localizedDescription)"
                isLoading = false
            }
        }
    }

    func addCase(_ newCase: Case) async throws {
        isLoading = true
        defer { isLoading = false }

        try await dataService.saveCase(newCase)
        cases.append(newCase)
        sortCases()
    }

    func updateCase(_ updatedCase: Case) async throws {
        guard let index = cases.firstIndex(where: { $0.id == updatedCase.id }) else {
            throw CaseError.caseNotFound
        }

        try await dataService.saveCase(updatedCase)
        cases[index] = updatedCase
    }

    func deleteCase(_ caseToDelete: Case) async throws {
        try await dataService.deleteCase(caseToDelete)
        cases.removeAll { $0.id == caseToDelete.id }
    }

    func deleteCases(_ casesToDelete: [Case]) async throws {
        for c in casesToDelete {
            try await deleteCase(c)
        }
    }

    func toggleFavorite(_ caseItem: Case) async throws {
        var updated = caseItem
        updated.isFavorite.toggle()
        try await updateCase(updated)
    }

    // MARK: - Sync Operations
    func refreshAllCases() async {
        isLoading = true
        defer { isLoading = false }

        for (index, caseItem) in cases.enumerated() {
            do {
                if let updatedCase = try await webScrapingService.fetchCaseDetails(for: caseItem) {
                    cases[index] = updatedCase
                    try await dataService.saveCase(updatedCase)
                }
            } catch {
                print("Failed to refresh case \(caseItem.displayTitle): \(error)")
            }
        }
    }

    func refreshCase(_ caseItem: Case) async throws -> Case {
        guard let updatedCase = try await webScrapingService.fetchCaseDetails(for: caseItem) else {
            throw CaseError.fetchFailed
        }
        try await updateCase(updatedCase)
        return updatedCase
    }

    // MARK: - Search & Filter
    private func filterCases(_ cases: [Case], searchText: String, filter: CaseFilter) -> [Case] {
        var filtered = cases

        // Apply filter
        switch filter {
        case .all:
            break
        case .pending:
            filtered = filtered.filter { $0.status == .pending }
        case .disposed:
            filtered = filtered.filter { $0.status == .disposed }
        case .favorites:
            filtered = filtered.filter { $0.isFavorite }
        case .court(let courtCode):
            filtered = filtered.filter { $0.court.code == courtCode }
        case .tag(let tag):
            filtered = filtered.filter { $0.tags.contains(tag) }
        }

        // Apply search
        if !searchText.isEmpty {
            let lowercasedSearch = searchText.lowercased()
            filtered = filtered.filter { caseItem in
                caseItem.caseNumber.lowercased().contains(lowercasedSearch) ||
                caseItem.petitioner.lowercased().contains(lowercasedSearch) ||
                caseItem.respondent.lowercased().contains(lowercasedSearch) ||
                caseItem.advocate?.lowercased().contains(lowercasedSearch) == true ||
                caseItem.court.name.lowercased().contains(lowercasedSearch)
            }
        }

        return sortCases(filtered)
    }

    private func sortCases(_ cases: [Case]? = nil) -> [Case] {
        let casesToSort = cases ?? self.cases
        switch sortOrder {
        case .nextHearing:
            return casesToSort.sorted {
                ($0.nextHearingDate ?? .distantFuture) < ($1.nextHearingDate ?? .distantFuture)
            }
        case .caseNumber:
            return casesToSort.sorted { $0.caseNumber < $1.caseNumber }
        case .recentlyUpdated:
            return casesToSort.sorted { $0.lastUpdated > $1.lastUpdated }
        case .court:
            return casesToSort.sorted { $0.court.name < $1.court.name }
        case .status:
            return casesToSort.sorted { $0.status.rawValue < $1.status.rawValue }
        }
    }

    func sortCases() {
        filteredCases = sortCases(filteredCases)
    }

    // MARK: - Bulk Import
    func importCases(from url: URL) async throws -> Int {
        let importedCases = try await dataService.importCases(from: url)
        for newCase in importedCases {
            if !cases.contains(where: { $0.caseNumber == newCase.caseNumber && $0.court.code == newCase.court.code }) {
                cases.append(newCase)
            }
        }
        return importedCases.count
    }

    // MARK: - Export
    func exportCases(format: ExportFormat, cases: [Case]? = nil) async throws -> URL {
        let casesToExport = cases ?? self.cases
        return try await dataService.exportCases(casesToExport, format: format)
    }

    // MARK: - Helpers
    func casesForDate(_ date: Date) -> [Case] {
        let calendar = Calendar.current
        return cases.filter { caseItem in
            guard let hearingDate = caseItem.nextHearingDate else { return false }
            return calendar.isDate(hearingDate, inSameDayAs: date)
        }
    }

    func getCasesByStatus() -> [CaseStatus: [Case]] {
        Dictionary(grouping: cases, by: { $0.status })
    }

    func getCasesByCourt() -> [String: [Case]] {
        Dictionary(grouping: cases, by: { $0.court.name })
    }
}

// MARK: - Supporting Types
enum CaseFilter: Equatable, Hashable {
    case all
    case pending
    case disposed
    case favorites
    case court(String)
    case tag(String)

    var title: String {
        switch self {
        case .all: return "All Cases"
        case .pending: return "Pending"
        case .disposed: return "Disposed"
        case .favorites: return "Favorites"
        case .court(let name): return name
        case .tag(let tag): return tag
        }
    }
}

enum CaseSortOrder: String, CaseIterable {
    case nextHearing = "Next Hearing"
    case caseNumber = "Case Number"
    case recentlyUpdated = "Recently Updated"
    case court = "Court"
    case status = "Status"
}

enum ExportFormat {
    case pdf
    case excel
    case csv
}

struct CaseStatistics {
    var totalCases: Int = 0
    var pendingCases: Int = 0
    var disposedCases: Int = 0
    var upcomingHearings: Int = 0
    var hearingsThisWeek: Int = 0
    var hearingsThisMonth: Int = 0
    var casesByStatus: [CaseStatus: Int] = [:]
    var casesByCourt: [String: Int] = [:]

    init() {}

    init(from cases: [Case]) {
        totalCases = cases.count
        pendingCases = cases.filter { $0.status == .pending }.count
        disposedCases = cases.filter { $0.status == .disposed }.count

        let now = Date()
        let calendar = Calendar.current
        let weekFromNow = calendar.date(byAdding: .day, value: 7, to: now) ?? now
        let monthFromNow = calendar.date(byAdding: .month, value: 1, to: now) ?? now

        upcomingHearings = cases.filter {
            guard let date = $0.nextHearingDate else { return false }
            return date >= now
        }.count

        hearingsThisWeek = cases.filter {
            guard let date = $0.nextHearingDate else { return false }
            return date >= now && date <= weekFromNow
        }.count

        hearingsThisMonth = cases.filter {
            guard let date = $0.nextHearingDate else { return false }
            return date >= now && date <= monthFromNow
        }.count

        casesByStatus = Dictionary(grouping: cases, by: { $0.status })
            .mapValues { $0.count }

        casesByCourt = Dictionary(grouping: cases, by: { $0.court.name })
            .mapValues { $0.count }
    }
}

enum CaseError: LocalizedError {
    case caseNotFound
    case fetchFailed
    case saveFailed
    case deleteFailed

    var errorDescription: String? {
        switch self {
        case .caseNotFound: return "Case not found"
        case .fetchFailed: return "Failed to fetch case details"
        case .saveFailed: return "Failed to save case"
        case .deleteFailed: return "Failed to delete case"
        }
    }
}
