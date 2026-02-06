//
//  User.swift
//  MercuryLawyerClone
//
//  Model representing a user
//

import Foundation

// MARK: - User Model
struct User: Identifiable, Codable {
    var id: UUID
    var email: String
    var name: String
    var phone: String?
    var barCouncilNumber: String?
    var designation: UserDesignation
    var organization: String?
    var address: String?
    var preferredCourts: [String]
    var subscriptionPlan: SubscriptionPlan
    var subscriptionExpiryDate: Date?
    var notificationPreferences: NotificationPreferences
    var createdAt: Date
    var lastLoginAt: Date?

    init(
        id: UUID = UUID(),
        email: String,
        name: String,
        phone: String? = nil,
        barCouncilNumber: String? = nil,
        designation: UserDesignation = .advocate,
        organization: String? = nil,
        address: String? = nil,
        preferredCourts: [String] = [],
        subscriptionPlan: SubscriptionPlan = .free,
        subscriptionExpiryDate: Date? = nil,
        notificationPreferences: NotificationPreferences = NotificationPreferences(),
        createdAt: Date = Date(),
        lastLoginAt: Date? = nil
    ) {
        self.id = id
        self.email = email
        self.name = name
        self.phone = phone
        self.barCouncilNumber = barCouncilNumber
        self.designation = designation
        self.organization = organization
        self.address = address
        self.preferredCourts = preferredCourts
        self.subscriptionPlan = subscriptionPlan
        self.subscriptionExpiryDate = subscriptionExpiryDate
        self.notificationPreferences = notificationPreferences
        self.createdAt = createdAt
        self.lastLoginAt = lastLoginAt
    }

    var isSubscriptionActive: Bool {
        guard let expiryDate = subscriptionExpiryDate else {
            return subscriptionPlan == .free
        }
        return expiryDate > Date()
    }

    var initials: String {
        let components = name.split(separator: " ")
        if components.count >= 2 {
            return String(components[0].prefix(1) + components[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

// MARK: - User Designation
enum UserDesignation: String, Codable, CaseIterable {
    case advocate = "Advocate"
    case seniorAdvocate = "Senior Advocate"
    case juniorAdvocate = "Junior Advocate"
    case litigant = "Litigant"
    case lawFirm = "Law Firm"
    case legalAssistant = "Legal Assistant"
    case paralegal = "Paralegal"
    case judge = "Judge"
    case other = "Other"
}

// MARK: - Subscription Plan
enum SubscriptionPlan: String, Codable, CaseIterable {
    case free = "Free"
    case basic = "Basic"
    case professional = "Professional"
    case enterprise = "Enterprise"

    var maxCases: Int {
        switch self {
        case .free: return 10
        case .basic: return 100
        case .professional: return 500
        case .enterprise: return Int.max
        }
    }

    var features: [String] {
        switch self {
        case .free:
            return [
                "Track up to 10 cases",
                "Basic notifications",
                "Manual case entry"
            ]
        case .basic:
            return [
                "Track up to 100 cases",
                "Email & push notifications",
                "Auto-sync from eCourts",
                "Calendar integration"
            ]
        case .professional:
            return [
                "Track up to 500 cases",
                "All notification types",
                "Auto-sync from eCourts",
                "Calendar integration",
                "PDF/Excel export",
                "Analytics dashboard",
                "Priority support"
            ]
        case .enterprise:
            return [
                "Unlimited cases",
                "All features included",
                "Team collaboration",
                "Custom integrations",
                "Dedicated support",
                "SLA guarantee"
            ]
        }
    }

    var monthlyPrice: Double {
        switch self {
        case .free: return 0
        case .basic: return 499
        case .professional: return 999
        case .enterprise: return 2999
        }
    }
}

// MARK: - Notification Preferences
struct NotificationPreferences: Codable {
    var enablePushNotifications: Bool
    var enableEmailNotifications: Bool
    var enableSMSNotifications: Bool
    var hearingReminders: HearingReminderSettings
    var orderAlerts: Bool
    var statusChangeAlerts: Bool
    var dailyDigest: Bool
    var dailyDigestTime: Date
    var weeklyReport: Bool
    var weeklyReportDay: Int  // 1 = Sunday, 7 = Saturday
    var quietHoursEnabled: Bool
    var quietHoursStart: Date
    var quietHoursEnd: Date

    init(
        enablePushNotifications: Bool = true,
        enableEmailNotifications: Bool = true,
        enableSMSNotifications: Bool = false,
        hearingReminders: HearingReminderSettings = HearingReminderSettings(),
        orderAlerts: Bool = true,
        statusChangeAlerts: Bool = true,
        dailyDigest: Bool = false,
        dailyDigestTime: Date = Calendar.current.date(from: DateComponents(hour: 8, minute: 0)) ?? Date(),
        weeklyReport: Bool = false,
        weeklyReportDay: Int = 1,
        quietHoursEnabled: Bool = false,
        quietHoursStart: Date = Calendar.current.date(from: DateComponents(hour: 22, minute: 0)) ?? Date(),
        quietHoursEnd: Date = Calendar.current.date(from: DateComponents(hour: 7, minute: 0)) ?? Date()
    ) {
        self.enablePushNotifications = enablePushNotifications
        self.enableEmailNotifications = enableEmailNotifications
        self.enableSMSNotifications = enableSMSNotifications
        self.hearingReminders = hearingReminders
        self.orderAlerts = orderAlerts
        self.statusChangeAlerts = statusChangeAlerts
        self.dailyDigest = dailyDigest
        self.dailyDigestTime = dailyDigestTime
        self.weeklyReport = weeklyReport
        self.weeklyReportDay = weeklyReportDay
        self.quietHoursEnabled = quietHoursEnabled
        self.quietHoursStart = quietHoursStart
        self.quietHoursEnd = quietHoursEnd
    }
}

// MARK: - Hearing Reminder Settings
struct HearingReminderSettings: Codable {
    var enabled: Bool
    var daysBefore: [Int]  // e.g., [1, 3, 7] for 1, 3, and 7 days before
    var morningOfHearing: Bool
    var morningReminderTime: Date

    init(
        enabled: Bool = true,
        daysBefore: [Int] = [1, 3],
        morningOfHearing: Bool = true,
        morningReminderTime: Date = Calendar.current.date(from: DateComponents(hour: 7, minute: 0)) ?? Date()
    ) {
        self.enabled = enabled
        self.daysBefore = daysBefore
        self.morningOfHearing = morningOfHearing
        self.morningReminderTime = morningReminderTime
    }
}
