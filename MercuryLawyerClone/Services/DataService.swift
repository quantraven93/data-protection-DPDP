//
//  DataService.swift
//  MercuryLawyerClone
//
//  Service for data persistence and management
//

import Foundation

actor DataService {
    static let shared = DataService()

    private let fileManager = FileManager.default
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private var casesURL: URL {
        getDocumentsDirectory().appendingPathComponent("cases.json")
    }

    private var notificationsURL: URL {
        getDocumentsDirectory().appendingPathComponent("notifications.json")
    }

    private var userURL: URL {
        getDocumentsDirectory().appendingPathComponent("user.json")
    }

    private init() {
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
        createDirectoryIfNeeded()
    }

    // MARK: - Directory Management
    private nonisolated func getDocumentsDirectory() -> URL {
        let fm = FileManager.default
        let paths = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        let appSupport = paths[0].appendingPathComponent("MercuryLawyerClone")
        return appSupport
    }

    private nonisolated func createDirectoryIfNeeded() {
        let fm = FileManager.default
        let directory = getDocumentsDirectory()
        if !fm.fileExists(atPath: directory.path) {
            try? fm.createDirectory(at: directory, withIntermediateDirectories: true)
        }
    }

    // MARK: - Case Operations
    func loadCases() async throws -> [Case] {
        guard fileManager.fileExists(atPath: casesURL.path) else {
            return Self.sampleCases
        }

        let data = try Data(contentsOf: casesURL)
        return try decoder.decode([Case].self, from: data)
    }

    func saveCase(_ caseItem: Case) async throws {
        var cases = try await loadCases()

        if let index = cases.firstIndex(where: { $0.id == caseItem.id }) {
            cases[index] = caseItem
        } else {
            cases.append(caseItem)
        }

        let data = try encoder.encode(cases)
        try data.write(to: casesURL)
    }

    func saveCases(_ cases: [Case]) async throws {
        let data = try encoder.encode(cases)
        try data.write(to: casesURL)
    }

    func deleteCase(_ caseItem: Case) async throws {
        var cases = try await loadCases()
        cases.removeAll { $0.id == caseItem.id }
        try await saveCases(cases)
    }

    // MARK: - Import Operations
    func importCases(from url: URL) async throws -> [Case] {
        let data = try Data(contentsOf: url)

        // Try JSON first
        if let cases = try? decoder.decode([Case].self, from: data) {
            return cases
        }

        // Try CSV
        if let csvString = String(data: data, encoding: .utf8) {
            return parseCSV(csvString)
        }

        throw DataServiceError.unsupportedFormat
    }

    private func parseCSV(_ csvString: String) -> [Case] {
        var cases: [Case] = []
        let lines = csvString.components(separatedBy: .newlines)

        guard lines.count > 1 else { return cases }

        // Skip header line
        for line in lines.dropFirst() {
            let columns = line.components(separatedBy: ",")
            guard columns.count >= 5 else { continue }

            let caseNumber = columns[0].trimmingCharacters(in: .whitespaces)
            let caseTypeRaw = columns[1].trimmingCharacters(in: .whitespaces)
            let courtName = columns[2].trimmingCharacters(in: .whitespaces)
            let yearString = columns[3].trimmingCharacters(in: .whitespaces)
            let petitioner = columns[4].trimmingCharacters(in: .whitespaces)
            let respondent = columns.count > 5 ? columns[5].trimmingCharacters(in: .whitespaces) : ""

            guard let year = Int(yearString) else { continue }

            let caseType = CaseType(rawValue: caseTypeRaw) ?? .other
            let court = Court.allCourts.first { $0.name.contains(courtName) } ??
                Court(name: courtName, code: "CUSTOM", type: .other, state: .andhraPradesh)

            let newCase = Case(
                caseNumber: caseNumber,
                caseType: caseType,
                court: court,
                year: year,
                petitioner: petitioner,
                respondent: respondent
            )
            cases.append(newCase)
        }

        return cases
    }

    // MARK: - Export Operations
    func exportCases(_ cases: [Case], format: ExportFormat) async throws -> URL {
        let fileName: String
        let data: Data

        switch format {
        case .json:
            fileName = "cases_export.json"
            data = try encoder.encode(cases)

        case .csv:
            fileName = "cases_export.csv"
            data = generateCSV(from: cases).data(using: .utf8) ?? Data()

        case .pdf:
            fileName = "cases_export.pdf"
            data = try await generatePDF(from: cases)

        case .excel:
            // For Excel, we'll export as CSV which can be opened in Excel
            fileName = "cases_export.csv"
            data = generateCSV(from: cases).data(using: .utf8) ?? Data()
        }

        let exportURL = getDocumentsDirectory().appendingPathComponent(fileName)
        try data.write(to: exportURL)
        return exportURL
    }

    private func generateCSV(from cases: [Case]) -> String {
        var csv = "Case Number,Case Type,Court,Year,Petitioner,Respondent,Status,Next Hearing\n"

        for caseItem in cases {
            let nextHearing = caseItem.nextHearingDate.map {
                ISO8601DateFormatter().string(from: $0)
            } ?? ""

            let row = [
                caseItem.caseNumber,
                caseItem.caseType.rawValue,
                caseItem.court.name,
                String(caseItem.year),
                caseItem.petitioner,
                caseItem.respondent,
                caseItem.status.rawValue,
                nextHearing
            ].map { "\"\($0)\"" }.joined(separator: ",")

            csv += row + "\n"
        }

        return csv
    }

    private func generatePDF(from cases: [Case]) async throws -> Data {
        // Basic PDF generation
        // In a real app, you'd use PDFKit for proper formatting
        var content = "Legal Cases Report\n"
        content += "Generated: \(Date())\n"
        content += "Total Cases: \(cases.count)\n\n"

        for caseItem in cases {
            content += "---\n"
            content += "Case: \(caseItem.displayTitle)\n"
            content += "Court: \(caseItem.court.name)\n"
            content += "Parties: \(caseItem.partiesDisplay)\n"
            content += "Status: \(caseItem.status.rawValue)\n"
            if let nextHearing = caseItem.nextHearingDate {
                content += "Next Hearing: \(nextHearing)\n"
            }
            content += "\n"
        }

        return content.data(using: .utf8) ?? Data()
    }

    // MARK: - User Operations
    func loadUser() async throws -> User? {
        guard fileManager.fileExists(atPath: userURL.path) else {
            return nil
        }

        let data = try Data(contentsOf: userURL)
        return try decoder.decode(User.self, from: data)
    }

    func saveUser(_ user: User) async throws {
        let data = try encoder.encode(user)
        try data.write(to: userURL)
    }

    // MARK: - Sample Data
    static var sampleCases: [Case] {
        let apHighCourt = Court.allCourts.first { $0.code == "APHC" }!
        let supremeCourt = Court.allCourts.first { $0.code == "SCI" }!
        let vizagCourt = Court.apDistrictCourts.first { $0.district == "Visakhapatnam" }!

        return [
            Case(
                caseNumber: "12345",
                caseType: .wp,
                court: apHighCourt,
                year: 2024,
                petitioner: "ABC Private Ltd",
                respondent: "State of Andhra Pradesh",
                status: .pending,
                nextHearingDate: Calendar.current.date(byAdding: .day, value: 3, to: Date()),
                advocate: "Adv. Sharma",
                judgeName: "Hon'ble Justice Rao"
            ),
            Case(
                caseNumber: "5678",
                caseType: .civilAppeal,
                court: supremeCourt,
                year: 2023,
                petitioner: "XYZ Corporation",
                respondent: "Union of India",
                status: .pending,
                nextHearingDate: Calendar.current.date(byAdding: .day, value: 7, to: Date()),
                advocate: "Sr. Adv. Mehta"
            ),
            Case(
                caseNumber: "9012",
                caseType: .os,
                court: vizagCourt,
                year: 2024,
                petitioner: "John Doe",
                respondent: "Jane Doe",
                status: .pending,
                nextHearingDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()),
                advocate: "Adv. Reddy"
            ),
            Case(
                caseNumber: "3456",
                caseType: .wpCivil,
                court: apHighCourt,
                year: 2022,
                petitioner: "PQR Industries",
                respondent: "Commissioner of Taxes",
                status: .disposed,
                filingDate: Calendar.current.date(byAdding: .year, value: -2, to: Date()),
                advocate: "Adv. Kumar",
                isFavorite: true
            )
        ]
    }
}

// MARK: - Export Format (extended)
extension ExportFormat {
    static var json: ExportFormat { .csv } // Placeholder
}

// MARK: - Errors
enum DataServiceError: LocalizedError {
    case unsupportedFormat
    case fileNotFound
    case encodingFailed
    case decodingFailed

    var errorDescription: String? {
        switch self {
        case .unsupportedFormat: return "Unsupported file format"
        case .fileNotFound: return "File not found"
        case .encodingFailed: return "Failed to encode data"
        case .decodingFailed: return "Failed to decode data"
        }
    }
}
