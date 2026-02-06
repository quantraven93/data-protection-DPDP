//
//  Notification.swift
//  MercuryLawyerClone
//
//  Model representing notifications
//

import Foundation

// MARK: - App Notification Model
struct AppNotification: Identifiable, Codable {
    var id: UUID
    var type: NotificationType
    var title: String
    var message: String
    var caseId: UUID?
    var courtId: UUID?
    var priority: NotificationPriority
    var isRead: Bool
    var createdAt: Date
    var scheduledFor: Date?
    var actionURL: String?
    var metadata: [String: String]

    init(
        id: UUID = UUID(),
        type: NotificationType,
        title: String,
        message: String,
        caseId: UUID? = nil,
        courtId: UUID? = nil,
        priority: NotificationPriority = .normal,
        isRead: Bool = false,
        createdAt: Date = Date(),
        scheduledFor: Date? = nil,
        actionURL: String? = nil,
        metadata: [String: String] = [:]
    ) {
        self.id = id
        self.type = type
        self.title = title
        self.message = message
        self.caseId = caseId
        self.courtId = courtId
        self.priority = priority
        self.isRead = isRead
        self.createdAt = createdAt
        self.scheduledFor = scheduledFor
        self.actionURL = actionURL
        self.metadata = metadata
    }

    var icon: String {
        type.icon
    }

    var timeAgo: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: createdAt, relativeTo: Date())
    }
}

// MARK: - Notification Type
enum NotificationType: String, Codable, CaseIterable {
    case hearingReminder = "Hearing Reminder"
    case newOrder = "New Order"
    case statusChange = "Status Change"
    case caseUpdate = "Case Update"
    case judgmentPublished = "Judgment Published"
    case causeListUpdate = "Cause List Update"
    case dailyDigest = "Daily Digest"
    case weeklyReport = "Weekly Report"
    case systemAlert = "System Alert"

    var icon: String {
        switch self {
        case .hearingReminder: return "calendar.badge.clock"
        case .newOrder: return "doc.text"
        case .statusChange: return "arrow.triangle.2.circlepath"
        case .caseUpdate: return "arrow.clockwise"
        case .judgmentPublished: return "doc.badge.gearshape"
        case .causeListUpdate: return "list.bullet.clipboard"
        case .dailyDigest: return "sun.max"
        case .weeklyReport: return "chart.bar.doc.horizontal"
        case .systemAlert: return "exclamationmark.triangle"
        }
    }

    var color: String {
        switch self {
        case .hearingReminder: return "blue"
        case .newOrder: return "green"
        case .statusChange: return "orange"
        case .caseUpdate: return "purple"
        case .judgmentPublished: return "red"
        case .causeListUpdate: return "teal"
        case .dailyDigest: return "yellow"
        case .weeklyReport: return "indigo"
        case .systemAlert: return "gray"
        }
    }
}

// MARK: - Notification Priority
enum NotificationPriority: String, Codable, CaseIterable {
    case low = "Low"
    case normal = "Normal"
    case high = "High"
    case urgent = "Urgent"

    var sortOrder: Int {
        switch self {
        case .urgent: return 0
        case .high: return 1
        case .normal: return 2
        case .low: return 3
        }
    }
}

// MARK: - Notification Group
struct NotificationGroup: Identifiable {
    var id: String
    var title: String
    var notifications: [AppNotification]
    var date: Date

    var unreadCount: Int {
        notifications.filter { !$0.isRead }.count
    }
}
