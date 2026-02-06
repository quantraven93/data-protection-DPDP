//
//  NotificationManager.swift
//  MercuryLawyerClone
//
//  ViewModel for managing notifications
//

import Foundation
import UserNotifications
import Combine

@MainActor
class NotificationManager: ObservableObject {
    // MARK: - Published Properties
    @Published var notifications: [AppNotification] = []
    @Published var unreadCount: Int = 0
    @Published var isAuthorized = false
    @Published var groupedNotifications: [NotificationGroup] = []

    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    private let notificationCenter = UNUserNotificationCenter.current()

    // MARK: - Initialization
    init() {
        setupBindings()
        requestAuthorization()
        loadNotifications()
    }

    // MARK: - Setup
    private func setupBindings() {
        $notifications
            .map { $0.filter { !$0.isRead }.count }
            .assign(to: &$unreadCount)

        $notifications
            .map { notifications in
                self.groupNotificationsByDate(notifications)
            }
            .assign(to: &$groupedNotifications)
    }

    // MARK: - Authorization
    func requestAuthorization() {
        notificationCenter.requestAuthorization(options: [.alert, .sound, .badge]) { [weak self] granted, error in
            DispatchQueue.main.async {
                self?.isAuthorized = granted
                if let error = error {
                    print("Notification authorization error: \(error)")
                }
            }
        }
    }

    // MARK: - Data Operations
    func loadNotifications() {
        // Load from persistent storage
        // For now, use sample data
        notifications = Self.sampleNotifications
    }

    func addNotification(_ notification: AppNotification) {
        notifications.insert(notification, at: 0)
        if isAuthorized {
            scheduleLocalNotification(notification)
        }
    }

    func markAsRead(_ notification: AppNotification) {
        guard let index = notifications.firstIndex(where: { $0.id == notification.id }) else { return }
        notifications[index].isRead = true
    }

    func markAllAsRead() {
        for index in notifications.indices {
            notifications[index].isRead = true
        }
    }

    func deleteNotification(_ notification: AppNotification) {
        notifications.removeAll { $0.id == notification.id }
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [notification.id.uuidString])
    }

    func clearAllNotifications() {
        notifications.removeAll()
        notificationCenter.removeAllPendingNotificationRequests()
        notificationCenter.removeAllDeliveredNotifications()
    }

    // MARK: - Scheduling
    func scheduleHearingReminder(for caseItem: Case, daysBefore: Int) {
        guard let hearingDate = caseItem.nextHearingDate else { return }

        let reminderDate = Calendar.current.date(byAdding: .day, value: -daysBefore, to: hearingDate) ?? hearingDate

        let notification = AppNotification(
            type: .hearingReminder,
            title: "Upcoming Hearing",
            message: "\(caseItem.displayTitle) - Hearing in \(daysBefore) day(s)",
            caseId: caseItem.id,
            priority: daysBefore <= 1 ? .high : .normal,
            scheduledFor: reminderDate
        )

        addNotification(notification)
    }

    func scheduleOrderNotification(for caseItem: Case, order: CourtOrder) {
        let notification = AppNotification(
            type: .newOrder,
            title: "New \(order.orderType.rawValue)",
            message: "\(caseItem.displayTitle): \(order.summary)",
            caseId: caseItem.id,
            priority: .high
        )

        addNotification(notification)
    }

    func scheduleStatusChangeNotification(for caseItem: Case, oldStatus: CaseStatus, newStatus: CaseStatus) {
        let notification = AppNotification(
            type: .statusChange,
            title: "Case Status Changed",
            message: "\(caseItem.displayTitle) changed from \(oldStatus.rawValue) to \(newStatus.rawValue)",
            caseId: caseItem.id,
            priority: newStatus == .disposed ? .high : .normal
        )

        addNotification(notification)
    }

    // MARK: - Local Notifications
    private func scheduleLocalNotification(_ notification: AppNotification) {
        let content = UNMutableNotificationContent()
        content.title = notification.title
        content.body = notification.message
        content.sound = .default

        switch notification.priority {
        case .urgent, .high:
            content.interruptionLevel = .timeSensitive
        case .normal:
            content.interruptionLevel = .active
        case .low:
            content.interruptionLevel = .passive
        }

        let trigger: UNNotificationTrigger
        if let scheduledDate = notification.scheduledFor {
            let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: scheduledDate)
            trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        } else {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        }

        let request = UNNotificationRequest(
            identifier: notification.id.uuidString,
            content: content,
            trigger: trigger
        )

        notificationCenter.add(request) { error in
            if let error = error {
                print("Failed to schedule notification: \(error)")
            }
        }
    }

    // MARK: - Helpers
    private func groupNotificationsByDate(_ notifications: [AppNotification]) -> [NotificationGroup] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: notifications) { notification in
            calendar.startOfDay(for: notification.createdAt)
        }

        return grouped.map { date, notifications in
            NotificationGroup(
                id: date.ISO8601Format(),
                title: formatGroupTitle(for: date),
                notifications: notifications.sorted { $0.createdAt > $1.createdAt },
                date: date
            )
        }
        .sorted { $0.date > $1.date }
    }

    private func formatGroupTitle(for date: Date) -> String {
        let calendar = Calendar.current
        if calendar.isDateInToday(date) {
            return "Today"
        } else if calendar.isDateInYesterday(date) {
            return "Yesterday"
        } else {
            let formatter = DateFormatter()
            formatter.dateStyle = .medium
            return formatter.string(from: date)
        }
    }

    // MARK: - Sample Data
    static var sampleNotifications: [AppNotification] {
        [
            AppNotification(
                type: .hearingReminder,
                title: "Hearing Tomorrow",
                message: "WP/123/2024 - High Court of AP - Hearing scheduled for tomorrow",
                priority: .high,
                createdAt: Date().addingTimeInterval(-3600)
            ),
            AppNotification(
                type: .newOrder,
                title: "New Interim Order",
                message: "CS/456/2023 - District Court Visakhapatnam - Interim injunction granted",
                priority: .high,
                createdAt: Date().addingTimeInterval(-7200)
            ),
            AppNotification(
                type: .statusChange,
                title: "Case Disposed",
                message: "OS/789/2022 - Case has been disposed after final hearing",
                priority: .normal,
                createdAt: Date().addingTimeInterval(-86400)
            ),
            AppNotification(
                type: .causeListUpdate,
                title: "Cause List Updated",
                message: "Tomorrow's cause list for High Court of AP is now available",
                priority: .normal,
                createdAt: Date().addingTimeInterval(-172800)
            )
        ]
    }
}
