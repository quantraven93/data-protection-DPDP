//
//  SettingsView.swift
//  MercuryLawyerClone
//
//  Application settings view
//

import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var notificationManager: NotificationManager
    @AppStorage("autoSync") private var autoSync = true
    @AppStorage("syncInterval") private var syncInterval = 30
    @AppStorage("notificationsEnabled") private var notificationsEnabled = true
    @AppStorage("dailyDigest") private var dailyDigest = false
    @AppStorage("weeklyReport") private var weeklyReport = false

    var body: some View {
        TabView {
            // General Settings
            GeneralSettingsView(
                autoSync: $autoSync,
                syncInterval: $syncInterval
            )
            .tabItem {
                Label("General", systemImage: "gear")
            }

            // Notifications
            NotificationSettingsView(
                notificationsEnabled: $notificationsEnabled,
                dailyDigest: $dailyDigest,
                weeklyReport: $weeklyReport
            )
            .tabItem {
                Label("Notifications", systemImage: "bell")
            }

            // Account
            AccountSettingsView()
                .tabItem {
                    Label("Account", systemImage: "person")
                }

            // Courts
            CourtSettingsView()
                .tabItem {
                    Label("Courts", systemImage: "building.columns")
                }

            // About
            AboutView()
                .tabItem {
                    Label("About", systemImage: "info.circle")
                }
        }
        .frame(width: 600, height: 450)
    }
}

// MARK: - General Settings
struct GeneralSettingsView: View {
    @Binding var autoSync: Bool
    @Binding var syncInterval: Int

    var body: some View {
        Form {
            Section("Sync Settings") {
                Toggle("Auto-sync cases", isOn: $autoSync)

                if autoSync {
                    Picker("Sync interval", selection: $syncInterval) {
                        Text("Every 15 minutes").tag(15)
                        Text("Every 30 minutes").tag(30)
                        Text("Every hour").tag(60)
                        Text("Every 2 hours").tag(120)
                    }
                }
            }

            Section("Data") {
                Button("Clear Local Cache") {
                    // Clear cache
                }

                Button("Export All Data") {
                    // Export
                }

                Button("Import Data") {
                    // Import
                }
            }

            Section("Appearance") {
                Picker("Theme", selection: .constant(0)) {
                    Text("System").tag(0)
                    Text("Light").tag(1)
                    Text("Dark").tag(2)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Notification Settings
struct NotificationSettingsView: View {
    @Binding var notificationsEnabled: Bool
    @Binding var dailyDigest: Bool
    @Binding var weeklyReport: Bool
    @State private var hearingReminder1Day = true
    @State private var hearingReminder3Days = true
    @State private var hearingReminderMorning = true
    @State private var orderAlerts = true
    @State private var statusAlerts = true

    var body: some View {
        Form {
            Section("General") {
                Toggle("Enable Notifications", isOn: $notificationsEnabled)
            }

            if notificationsEnabled {
                Section("Hearing Reminders") {
                    Toggle("1 day before hearing", isOn: $hearingReminder1Day)
                    Toggle("3 days before hearing", isOn: $hearingReminder3Days)
                    Toggle("Morning of hearing", isOn: $hearingReminderMorning)
                }

                Section("Case Updates") {
                    Toggle("New orders & judgments", isOn: $orderAlerts)
                    Toggle("Status changes", isOn: $statusAlerts)
                }

                Section("Reports") {
                    Toggle("Daily digest", isOn: $dailyDigest)
                    Toggle("Weekly report", isOn: $weeklyReport)
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Account Settings
struct AccountSettingsView: View {
    @State private var name = "Advocate Name"
    @State private var email = "advocate@example.com"
    @State private var phone = ""
    @State private var barCouncilNumber = ""
    @State private var organization = ""

    var body: some View {
        Form {
            Section("Profile") {
                TextField("Name", text: $name)
                TextField("Email", text: $email)
                TextField("Phone", text: $phone)
            }

            Section("Professional Details") {
                TextField("Bar Council Number", text: $barCouncilNumber)
                TextField("Organization / Law Firm", text: $organization)
            }

            Section("Subscription") {
                HStack {
                    Text("Current Plan")
                    Spacer()
                    Text("Free")
                        .foregroundColor(.secondary)
                }

                Button("Upgrade to Pro") {
                    // Show upgrade options
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - Court Settings
struct CourtSettingsView: View {
    @State private var preferredCourts: Set<String> = []

    var body: some View {
        Form {
            Section("Preferred Courts") {
                Text("Select courts you frequently practice in")
                    .font(.caption)
                    .foregroundColor(.secondary)

                ForEach(Court.allCourts) { court in
                    Toggle(court.name, isOn: Binding(
                        get: { preferredCourts.contains(court.code) },
                        set: { isSelected in
                            if isSelected {
                                preferredCourts.insert(court.code)
                            } else {
                                preferredCourts.remove(court.code)
                            }
                        }
                    ))
                }
            }

            Section("AP District Courts") {
                ForEach(Court.apDistrictCourts) { court in
                    Toggle(court.name, isOn: Binding(
                        get: { preferredCourts.contains(court.code) },
                        set: { isSelected in
                            if isSelected {
                                preferredCourts.insert(court.code)
                            } else {
                                preferredCourts.remove(court.code)
                            }
                        }
                    ))
                }
            }
        }
        .formStyle(.grouped)
        .padding()
    }
}

// MARK: - About View
struct AboutView: View {
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "briefcase.fill")
                .font(.system(size: 60))
                .foregroundColor(.accentColor)

            Text("Mercury Lawyer Clone")
                .font(.title)
                .fontWeight(.bold)

            Text("Version 1.0.0")
                .foregroundColor(.secondary)

            Divider()
                .frame(width: 200)

            VStack(spacing: 8) {
                Text("A powerful case management application")
                Text("for Indian legal professionals")
            }
            .foregroundColor(.secondary)

            Spacer()

            VStack(spacing: 8) {
                Link("View on GitHub", destination: URL(string: "https://github.com")!)
                Link("Report an Issue", destination: URL(string: "https://github.com")!)
                Link("Privacy Policy", destination: URL(string: "https://example.com")!)
            }
            .font(.caption)

            Text("© 2024 All Rights Reserved")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

// MARK: - Preview
struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
            .environmentObject(AppState())
            .environmentObject(NotificationManager())
    }
}
