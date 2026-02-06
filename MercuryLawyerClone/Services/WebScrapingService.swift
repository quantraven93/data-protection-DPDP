//
//  WebScrapingService.swift
//  MercuryLawyerClone
//
//  Service for scraping court websites
//

import Foundation

actor WebScrapingService {
    static let shared = WebScrapingService()

    private let session: URLSession
    private let rateLimiter = RateLimiter()

    // eCourts URLs
    private let eCourtsBaseURL = "https://services.ecourts.gov.in"
    private let eCourtsCNRURL = "https://services.ecourts.gov.in/ecourtindia_v6/"
    private let scIndiaURL = "https://main.sci.gov.in"
    private let apHighCourtURL = "https://hc.ap.nic.in"

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        config.httpAdditionalHeaders = [
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9"
        ]
        session = URLSession(configuration: config)
    }

    // MARK: - Case Details Fetching
    func fetchCaseDetails(for caseItem: Case) async throws -> Case? {
        // Rate limit requests
        await rateLimiter.waitIfNeeded()

        switch caseItem.court.type {
        case .supremeCourt:
            return try await fetchSupremeCourtCase(caseItem)
        case .highCourt:
            return try await fetchHighCourtCase(caseItem)
        case .districtCourt:
            return try await fetchDistrictCourtCase(caseItem)
        default:
            return try await fetchECourtsCase(caseItem)
        }
    }

    // MARK: - Supreme Court
    private func fetchSupremeCourtCase(_ caseItem: Case) async throws -> Case? {
        let urlString = "\(scIndiaURL)/php/case_status/case_status.php"

        guard let url = URL(string: urlString) else {
            throw ScrapingError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let params = [
            "case_no": caseItem.caseNumber,
            "case_type": caseItem.caseType.rawValue,
            "case_year": String(caseItem.year)
        ]
        request.httpBody = params.map { "\($0)=\($1)" }.joined(separator: "&").data(using: .utf8)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ScrapingError.requestFailed
        }

        return parseSupremeCourtResponse(data, for: caseItem)
    }

    private func parseSupremeCourtResponse(_ data: Data, for caseItem: Case) -> Case? {
        guard let html = String(data: data, encoding: .utf8) else { return nil }

        var updatedCase = caseItem
        updatedCase.lastUpdated = Date()

        // Parse HTML to extract case details
        // This is a simplified parser - real implementation would use proper HTML parsing

        // Extract next hearing date
        if let dateRange = html.range(of: "Next Hearing Date:</td><td>([^<]+)</td>", options: .regularExpression) {
            let dateString = String(html[dateRange])
            if let date = parseIndianDate(dateString) {
                updatedCase.nextHearingDate = date
            }
        }

        // Extract status
        if html.contains("Disposed") {
            updatedCase.status = .disposed
        } else if html.contains("Pending") {
            updatedCase.status = .pending
        }

        // Extract judge name
        if let judgeRange = html.range(of: "Coram:</td><td>([^<]+)</td>", options: .regularExpression) {
            updatedCase.judgeName = String(html[judgeRange])
                .replacingOccurrences(of: "Coram:</td><td>", with: "")
                .replacingOccurrences(of: "</td>", with: "")
        }

        return updatedCase
    }

    // MARK: - High Court (AP)
    private func fetchHighCourtCase(_ caseItem: Case) async throws -> Case? {
        // Construct URL based on court
        let baseURL: String
        switch caseItem.court.state {
        case .andhraPradesh:
            baseURL = "https://aphc.gov.in/casestatus"
        case .telangana:
            baseURL = "https://tshc.gov.in/hctsserv"
        default:
            baseURL = eCourtsCNRURL
        }

        guard let url = URL(string: baseURL) else {
            throw ScrapingError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        let params = [
            "case_type": caseItem.caseType.rawValue,
            "case_no": caseItem.caseNumber,
            "year": String(caseItem.year)
        ]
        request.httpBody = params.map { "\($0)=\($1)" }.joined(separator: "&").data(using: .utf8)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ScrapingError.requestFailed
        }

        return parseHighCourtResponse(data, for: caseItem)
    }

    private func parseHighCourtResponse(_ data: Data, for caseItem: Case) -> Case? {
        guard let html = String(data: data, encoding: .utf8) else { return nil }

        var updatedCase = caseItem
        updatedCase.lastUpdated = Date()

        // Parse HTML for case details
        // Extract parties if available
        if let petitionerRange = html.range(of: "Petitioner[^<]*<[^>]*>([^<]+)", options: .regularExpression) {
            let petitioner = String(html[petitionerRange])
            updatedCase.petitioner = petitioner.components(separatedBy: ">").last?.trimmingCharacters(in: .whitespaces) ?? updatedCase.petitioner
        }

        // Extract next hearing
        if let hearingRange = html.range(of: "\\d{2}/\\d{2}/\\d{4}", options: .regularExpression) {
            let dateString = String(html[hearingRange])
            if let date = parseIndianDate(dateString) {
                updatedCase.nextHearingDate = date
            }
        }

        return updatedCase
    }

    // MARK: - District Court (eCourts)
    private func fetchDistrictCourtCase(_ caseItem: Case) async throws -> Case? {
        return try await fetchECourtsCase(caseItem)
    }

    private func fetchECourtsCase(_ caseItem: Case) async throws -> Case? {
        let urlString = "\(eCourtsCNRURL)?p=casestatus/index"

        guard let url = URL(string: urlString) else {
            throw ScrapingError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")

        // eCourts specific parameters
        let stateCode = getStateCode(for: caseItem.court.state)
        let districtCode = getDistrictCode(for: caseItem.court.district ?? "")

        let params = [
            "state_code": stateCode,
            "dist_code": districtCode,
            "case_type": caseItem.caseType.rawValue,
            "case_no": caseItem.caseNumber,
            "rgyear": String(caseItem.year)
        ]

        request.httpBody = params.map { "\($0)=\($1)" }.joined(separator: "&").data(using: .utf8)

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw ScrapingError.requestFailed
        }

        return parseECourtsResponse(data, for: caseItem)
    }

    private func parseECourtsResponse(_ data: Data, for caseItem: Case) -> Case? {
        guard let html = String(data: data, encoding: .utf8) else { return nil }

        var updatedCase = caseItem
        updatedCase.lastUpdated = Date()

        // Parse eCourts specific HTML structure
        // This would need to handle CAPTCHA in a real implementation

        if html.contains("Case Details") {
            // Extract relevant fields using regex patterns
            // This is simplified - real implementation needs proper HTML parsing
        }

        return updatedCase
    }

    // MARK: - Search Operations
    func searchByPartyName(name: String, court: Court) async throws -> [Case] {
        await rateLimiter.waitIfNeeded()

        // Implementation would vary by court
        return []
    }

    func searchByAdvocate(name: String, court: Court) async throws -> [Case] {
        await rateLimiter.waitIfNeeded()

        // Implementation would vary by court
        return []
    }

    func searchByCNR(cnrNumber: String) async throws -> Case? {
        await rateLimiter.waitIfNeeded()

        // CNR search through eCourts
        let urlString = "\(eCourtsCNRURL)?p=casestatus/searchByCNR"

        guard let url = URL(string: urlString) else {
            throw ScrapingError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = "cino=\(cnrNumber)".data(using: .utf8)

        let (data, _) = try await session.data(for: request)

        // Parse response
        return parseCNRResponse(data)
    }

    private func parseCNRResponse(_ data: Data) -> Case? {
        guard let _ = String(data: data, encoding: .utf8) else { return nil }

        // Parse CNR search results
        // This would need proper implementation

        return nil
    }

    // MARK: - Cause List
    func fetchCauseList(for court: Court, date: Date) async throws -> [CauseListItem] {
        await rateLimiter.waitIfNeeded()

        // Fetch and parse cause list
        return []
    }

    // MARK: - Helper Functions
    private func parseIndianDate(_ dateString: String) -> Date? {
        let formatters = [
            "dd/MM/yyyy",
            "dd-MM-yyyy",
            "yyyy-MM-dd",
            "dd.MM.yyyy"
        ]

        for format in formatters {
            let formatter = DateFormatter()
            formatter.dateFormat = format
            if let date = formatter.date(from: dateString) {
                return date
            }
        }
        return nil
    }

    private func getStateCode(for state: IndianState) -> String {
        switch state {
        case .andhraPradesh: return "2"
        case .telangana: return "36"
        case .karnataka: return "3"
        case .tamilNadu: return "33"
        case .kerala: return "32"
        case .maharashtra: return "27"
        case .delhi: return "7"
        case .gujarat: return "24"
        case .rajasthan: return "8"
        case .uttarPradesh: return "9"
        case .bihar: return "10"
        case .westBengal: return "19"
        default: return "0"
        }
    }

    private func getDistrictCode(for district: String) -> String {
        // AP District codes
        let districtCodes: [String: String] = [
            "Anantapur": "1",
            "Chittoor": "2",
            "East Godavari": "3",
            "Guntur": "4",
            "Krishna": "5",
            "Kurnool": "6",
            "Nellore": "7",
            "Prakasam": "8",
            "Srikakulam": "9",
            "Visakhapatnam": "10",
            "Vizianagaram": "11",
            "West Godavari": "12",
            "YSR Kadapa": "13"
        ]
        return districtCodes[district] ?? "0"
    }
}

// MARK: - Rate Limiter
actor RateLimiter {
    private var lastRequestTime: Date?
    private let minimumInterval: TimeInterval = 2.0 // 2 seconds between requests

    func waitIfNeeded() async {
        if let lastTime = lastRequestTime {
            let elapsed = Date().timeIntervalSince(lastTime)
            if elapsed < minimumInterval {
                try? await Task.sleep(nanoseconds: UInt64((minimumInterval - elapsed) * 1_000_000_000))
            }
        }
        lastRequestTime = Date()
    }
}

// MARK: - Supporting Types
struct CauseListItem: Identifiable, Codable {
    var id: UUID = UUID()
    var serialNumber: Int
    var caseNumber: String
    var caseType: String
    var parties: String
    var advocate: String
    var courtNumber: String
    var judge: String
    var hearingPurpose: String
    var estimatedTime: String?
}

// MARK: - Errors
enum ScrapingError: LocalizedError {
    case invalidURL
    case requestFailed
    case parsingFailed
    case captchaRequired
    case rateLimited
    case courtWebsiteDown

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .requestFailed: return "Request failed"
        case .parsingFailed: return "Failed to parse response"
        case .captchaRequired: return "CAPTCHA verification required"
        case .rateLimited: return "Too many requests, please wait"
        case .courtWebsiteDown: return "Court website is unavailable"
        }
    }
}
