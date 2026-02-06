//
//  Case.swift
//  MercuryLawyerClone
//
//  Model representing a legal case
//

import Foundation

// MARK: - Case Model
struct Case: Identifiable, Codable, Hashable {
    var id: UUID
    var caseNumber: String
    var caseType: CaseType
    var court: Court
    var year: Int
    var petitioner: String
    var respondent: String
    var status: CaseStatus
    var filingDate: Date?
    var nextHearingDate: Date?
    var lastUpdated: Date
    var advocate: String?
    var judgeName: String?
    var courtNumber: String?
    var tags: [String]
    var notes: String
    var isFavorite: Bool
    var hearingHistory: [HearingEntry]
    var orders: [CourtOrder]
    var assignedTo: String?

    init(
        id: UUID = UUID(),
        caseNumber: String,
        caseType: CaseType,
        court: Court,
        year: Int,
        petitioner: String = "",
        respondent: String = "",
        status: CaseStatus = .pending,
        filingDate: Date? = nil,
        nextHearingDate: Date? = nil,
        lastUpdated: Date = Date(),
        advocate: String? = nil,
        judgeName: String? = nil,
        courtNumber: String? = nil,
        tags: [String] = [],
        notes: String = "",
        isFavorite: Bool = false,
        hearingHistory: [HearingEntry] = [],
        orders: [CourtOrder] = [],
        assignedTo: String? = nil
    ) {
        self.id = id
        self.caseNumber = caseNumber
        self.caseType = caseType
        self.court = court
        self.year = year
        self.petitioner = petitioner
        self.respondent = respondent
        self.status = status
        self.filingDate = filingDate
        self.nextHearingDate = nextHearingDate
        self.lastUpdated = lastUpdated
        self.advocate = advocate
        self.judgeName = judgeName
        self.courtNumber = courtNumber
        self.tags = tags
        self.notes = notes
        self.isFavorite = isFavorite
        self.hearingHistory = hearingHistory
        self.orders = orders
        self.assignedTo = assignedTo
    }

    var displayTitle: String {
        "\(caseType.rawValue)/\(caseNumber)/\(year)"
    }

    var partiesDisplay: String {
        "\(petitioner) vs \(respondent)"
    }

    var daysUntilHearing: Int? {
        guard let hearingDate = nextHearingDate else { return nil }
        return Calendar.current.dateComponents([.day], from: Date(), to: hearingDate).day
    }
}

// MARK: - Case Status
enum CaseStatus: String, Codable, CaseIterable {
    case pending = "Pending"
    case disposed = "Disposed"
    case transferred = "Transferred"
    case withdrawn = "Withdrawn"
    case dismissed = "Dismissed"
    case decreed = "Decreed"
    case adjourned = "Adjourned"

    var color: String {
        switch self {
        case .pending: return "yellow"
        case .disposed: return "green"
        case .transferred: return "blue"
        case .withdrawn: return "gray"
        case .dismissed: return "red"
        case .decreed: return "purple"
        case .adjourned: return "orange"
        }
    }
}

// MARK: - Case Type
enum CaseType: String, Codable, CaseIterable {
    // High Court
    case wp = "WP"           // Writ Petition
    case wpCivil = "WP(C)"   // Writ Petition (Civil)
    case wpCriminal = "WP(Crl)" // Writ Petition (Criminal)
    case civilAppeal = "CA"  // Civil Appeal
    case criminalAppeal = "CrA" // Criminal Appeal
    case slp = "SLP"         // Special Leave Petition
    case review = "RP"       // Review Petition
    case contempt = "CC"     // Contempt Case

    // District Court
    case os = "OS"           // Original Suit
    case cs = "CS"           // Civil Suit
    case mc = "MC"           // Miscellaneous Case
    case ep = "EP"           // Execution Petition
    case op = "OP"           // Original Petition
    case crp = "CRP"         // Civil Revision Petition
    case sa = "SA"           // Second Appeal
    case fa = "FA"           // First Appeal

    // Criminal
    case criminalCase = "CrC"  // Criminal Case
    case sc = "SC"           // Sessions Case
    case crl = "Crl"         // Criminal
    case bail = "BA"         // Bail Application
    case anticipatoryBail = "ABA" // Anticipatory Bail

    case other = "Other"

    var fullName: String {
        switch self {
        case .wp: return "Writ Petition"
        case .wpCivil: return "Writ Petition (Civil)"
        case .wpCriminal: return "Writ Petition (Criminal)"
        case .civilAppeal: return "Civil Appeal"
        case .criminalAppeal: return "Criminal Appeal"
        case .slp: return "Special Leave Petition"
        case .review: return "Review Petition"
        case .contempt: return "Contempt Case"
        case .os: return "Original Suit"
        case .cs: return "Civil Suit"
        case .mc: return "Miscellaneous Case"
        case .ep: return "Execution Petition"
        case .op: return "Original Petition"
        case .crp: return "Civil Revision Petition"
        case .sa: return "Second Appeal"
        case .fa: return "First Appeal"
        case .criminalCase: return "Criminal Case"
        case .sc: return "Sessions Case"
        case .crl: return "Criminal"
        case .bail: return "Bail Application"
        case .anticipatoryBail: return "Anticipatory Bail"
        case .other: return "Other"
        }
    }
}

// MARK: - Hearing Entry
struct HearingEntry: Identifiable, Codable, Hashable {
    var id: UUID
    var date: Date
    var purpose: String
    var outcome: String?
    var nextDate: Date?
    var remarks: String?
    var courtNumber: String?
    var judgeName: String?

    init(
        id: UUID = UUID(),
        date: Date,
        purpose: String,
        outcome: String? = nil,
        nextDate: Date? = nil,
        remarks: String? = nil,
        courtNumber: String? = nil,
        judgeName: String? = nil
    ) {
        self.id = id
        self.date = date
        self.purpose = purpose
        self.outcome = outcome
        self.nextDate = nextDate
        self.remarks = remarks
        self.courtNumber = courtNumber
        self.judgeName = judgeName
    }
}

// MARK: - Court Order
struct CourtOrder: Identifiable, Codable, Hashable {
    var id: UUID
    var date: Date
    var orderType: OrderType
    var summary: String
    var documentURL: URL?
    var isRead: Bool

    init(
        id: UUID = UUID(),
        date: Date,
        orderType: OrderType,
        summary: String,
        documentURL: URL? = nil,
        isRead: Bool = false
    ) {
        self.id = id
        self.date = date
        self.orderType = orderType
        self.summary = summary
        self.documentURL = documentURL
        self.isRead = isRead
    }
}

enum OrderType: String, Codable, CaseIterable {
    case interim = "Interim Order"
    case final = "Final Order"
    case judgment = "Judgment"
    case decree = "Decree"
    case notice = "Notice"
    case summons = "Summons"
    case other = "Other"
}
