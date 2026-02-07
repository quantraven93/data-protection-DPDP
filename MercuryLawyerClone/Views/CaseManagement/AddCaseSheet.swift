//
//  AddCaseSheet.swift
//  MercuryLawyerClone
//
//  Sheet for adding new cases
//

import SwiftUI

struct AddCaseSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var caseViewModel: CaseViewModel

    @State private var selectedTab = 0
    @State private var isSubmitting = false
    @State private var errorMessage: String?

    // Case Number Form
    @State private var selectedCourt: Court?
    @State private var selectedCaseType: CaseType = .wp
    @State private var caseNumber = ""
    @State private var caseYear = Calendar.current.component(.year, from: Date())

    // Party Search Form
    @State private var partyName = ""

    // Advocate Search Form
    @State private var advocateName = ""

    // Custom Case Form
    @State private var customCourt: Court?
    @State private var customCaseType: CaseType = .wp
    @State private var customCaseNumber = ""
    @State private var customYear = Calendar.current.component(.year, from: Date())
    @State private var petitioner = ""
    @State private var respondent = ""
    @State private var advocate = ""
    @State private var nextHearingDate = Date()
    @State private var includeHearingDate = false

    let years = Array((2000...Calendar.current.component(.year, from: Date())).reversed())

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Selector
                Picker("", selection: $selectedTab) {
                    Text("By Case Number").tag(0)
                    Text("By Party Name").tag(1)
                    Text("By Advocate").tag(2)
                    Text("Custom Entry").tag(3)
                }
                .pickerStyle(.segmented)
                .padding()

                Divider()

                // Content
                ScrollView {
                    VStack(spacing: 20) {
                        switch selectedTab {
                        case 0:
                            CaseNumberForm(
                                selectedCourt: $selectedCourt,
                                selectedCaseType: $selectedCaseType,
                                caseNumber: $caseNumber,
                                caseYear: $caseYear,
                                years: years
                            )
                        case 1:
                            PartySearchForm(partyName: $partyName)
                        case 2:
                            AdvocateSearchForm(advocateName: $advocateName)
                        case 3:
                            CustomCaseForm(
                                selectedCourt: $customCourt,
                                selectedCaseType: $customCaseType,
                                caseNumber: $customCaseNumber,
                                caseYear: $customYear,
                                petitioner: $petitioner,
                                respondent: $respondent,
                                advocate: $advocate,
                                nextHearingDate: $nextHearingDate,
                                includeHearingDate: $includeHearingDate,
                                years: years
                            )
                        default:
                            EmptyView()
                        }

                        if let error = errorMessage {
                            Text(error)
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                    }
                    .padding()
                }

                Divider()

                // Footer
                HStack {
                    Button("Cancel") {
                        dismiss()
                    }
                    .keyboardShortcut(.cancelAction)

                    Spacer()

                    Button {
                        submitCase()
                    } label: {
                        if isSubmitting {
                            ProgressView()
                                .scaleEffect(0.8)
                        } else {
                            Text(selectedTab == 3 ? "Add Case" : "Search & Add")
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(!isFormValid || isSubmitting)
                    .keyboardShortcut(.defaultAction)
                }
                .padding()
            }
            .navigationTitle("Add Case")
            .frame(width: 500, height: 550)
        }
    }

    var isFormValid: Bool {
        switch selectedTab {
        case 0:
            return selectedCourt != nil && !caseNumber.isEmpty
        case 1:
            return !partyName.isEmpty
        case 2:
            return !advocateName.isEmpty
        case 3:
            return customCourt != nil && !customCaseNumber.isEmpty && !petitioner.isEmpty
        default:
            return false
        }
    }

    func submitCase() {
        isSubmitting = true
        errorMessage = nil

        Task {
            do {
                switch selectedTab {
                case 0:
                    guard let court = selectedCourt else { return }
                    let newCase = Case(
                        caseNumber: caseNumber,
                        caseType: selectedCaseType,
                        court: court,
                        year: caseYear,
                        petitioner: "To be fetched",
                        respondent: "To be fetched"
                    )
                    try await caseViewModel.addCase(newCase)
                    // Optionally trigger auto-fetch

                case 1, 2:
                    // Search functionality - would trigger web scraping
                    errorMessage = "Search functionality coming soon"
                    isSubmitting = false
                    return

                case 3:
                    guard let court = customCourt else { return }
                    let newCase = Case(
                        caseNumber: customCaseNumber,
                        caseType: customCaseType,
                        court: court,
                        year: customYear,
                        petitioner: petitioner,
                        respondent: respondent,
                        nextHearingDate: includeHearingDate ? nextHearingDate : nil,
                        advocate: advocate.isEmpty ? nil : advocate
                    )
                    try await caseViewModel.addCase(newCase)

                default:
                    break
                }

                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }

            isSubmitting = false
        }
    }
}

// MARK: - Case Number Form
struct CaseNumberForm: View {
    @Binding var selectedCourt: Court?
    @Binding var selectedCaseType: CaseType
    @Binding var caseNumber: String
    @Binding var caseYear: Int
    let years: [Int]
    @FocusState private var isCaseNumberFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Search for a case by its number")
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Court Selection
            VStack(alignment: .leading, spacing: 8) {
                Text("Court")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Picker("Court", selection: $selectedCourt) {
                    Text("Select Court").tag(nil as Court?)

                    Section("Supreme Court") {
                        ForEach(Court.allCourts.filter { $0.type == .supremeCourt }) { court in
                            Text(court.name).tag(court as Court?)
                        }
                    }

                    Section("High Courts") {
                        ForEach(Court.allCourts.filter { $0.type == .highCourt }) { court in
                            Text(court.name).tag(court as Court?)
                        }
                    }

                    Section("AP District Courts") {
                        ForEach(Court.apDistrictCourts) { court in
                            Text(court.name).tag(court as Court?)
                        }
                    }
                }
                .pickerStyle(.menu)
            }

            // Case Type
            VStack(alignment: .leading, spacing: 8) {
                Text("Case Type")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Picker("Case Type", selection: $selectedCaseType) {
                    ForEach(CaseType.allCases, id: \.self) { type in
                        Text("\(type.rawValue) - \(type.fullName)").tag(type)
                    }
                }
                .pickerStyle(.menu)
            }

            // Case Number
            VStack(alignment: .leading, spacing: 8) {
                Text("Case Number")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextField("Enter case number", text: $caseNumber)
                    .textFieldStyle(.roundedBorder)
                    .focused($isCaseNumberFocused)
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                            isCaseNumberFocused = true
                        }
                    }
            }

            // Year
            VStack(alignment: .leading, spacing: 8) {
                Text("Year")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Picker("Year", selection: $caseYear) {
                    ForEach(years, id: \.self) { year in
                        Text(String(year)).tag(year)
                    }
                }
                .pickerStyle(.menu)
            }
        }
    }
}

// MARK: - Party Search Form
struct PartySearchForm: View {
    @Binding var partyName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Search for cases by party name")
                .font(.subheadline)
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                Text("Party Name")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextField("Enter petitioner or respondent name", text: $partyName)
                    .textFieldStyle(.roundedBorder)
            }

            InfoBox(
                icon: "info.circle",
                message: "This will search across all courts for cases involving this party."
            )
        }
    }
}

// MARK: - Advocate Search Form
struct AdvocateSearchForm: View {
    @Binding var advocateName: String

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Search for cases by advocate name")
                .font(.subheadline)
                .foregroundColor(.secondary)

            VStack(alignment: .leading, spacing: 8) {
                Text("Advocate Name")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextField("Enter advocate name", text: $advocateName)
                    .textFieldStyle(.roundedBorder)
            }

            InfoBox(
                icon: "info.circle",
                message: "This will search for all cases where this advocate appears on record."
            )
        }
    }
}

// MARK: - Custom Case Form
struct CustomCaseForm: View {
    @Binding var selectedCourt: Court?
    @Binding var selectedCaseType: CaseType
    @Binding var caseNumber: String
    @Binding var caseYear: Int
    @Binding var petitioner: String
    @Binding var respondent: String
    @Binding var advocate: String
    @Binding var nextHearingDate: Date
    @Binding var includeHearingDate: Bool
    let years: [Int]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Manually enter case details")
                .font(.subheadline)
                .foregroundColor(.secondary)

            // Court Selection
            VStack(alignment: .leading, spacing: 8) {
                Text("Court *")
                    .font(.caption)
                    .foregroundColor(.secondary)

                Picker("Court", selection: $selectedCourt) {
                    Text("Select Court").tag(nil as Court?)

                    Section("Supreme Court") {
                        ForEach(Court.allCourts.filter { $0.type == .supremeCourt }) { court in
                            Text(court.name).tag(court as Court?)
                        }
                    }

                    Section("High Courts") {
                        ForEach(Court.allCourts.filter { $0.type == .highCourt }) { court in
                            Text(court.name).tag(court as Court?)
                        }
                    }

                    Section("AP District Courts") {
                        ForEach(Court.apDistrictCourts) { court in
                            Text(court.name).tag(court as Court?)
                        }
                    }
                }
                .pickerStyle(.menu)
            }

            HStack(spacing: 16) {
                // Case Type
                VStack(alignment: .leading, spacing: 8) {
                    Text("Case Type *")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Picker("Case Type", selection: $selectedCaseType) {
                        ForEach(CaseType.allCases, id: \.self) { type in
                            Text(type.rawValue).tag(type)
                        }
                    }
                    .pickerStyle(.menu)
                }

                // Case Number
                VStack(alignment: .leading, spacing: 8) {
                    Text("Case Number *")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    TextField("Number", text: $caseNumber)
                        .textFieldStyle(.roundedBorder)
                }

                // Year
                VStack(alignment: .leading, spacing: 8) {
                    Text("Year *")
                        .font(.caption)
                        .foregroundColor(.secondary)

                    Picker("Year", selection: $caseYear) {
                        ForEach(years, id: \.self) { year in
                            Text(String(year)).tag(year)
                        }
                    }
                    .pickerStyle(.menu)
                }
            }

            // Petitioner
            VStack(alignment: .leading, spacing: 8) {
                Text("Petitioner *")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextField("Enter petitioner name", text: $petitioner)
                    .textFieldStyle(.roundedBorder)
            }

            // Respondent
            VStack(alignment: .leading, spacing: 8) {
                Text("Respondent")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextField("Enter respondent name", text: $respondent)
                    .textFieldStyle(.roundedBorder)
            }

            // Advocate
            VStack(alignment: .leading, spacing: 8) {
                Text("Advocate")
                    .font(.caption)
                    .foregroundColor(.secondary)

                TextField("Enter advocate name", text: $advocate)
                    .textFieldStyle(.roundedBorder)
            }

            // Next Hearing Date
            Toggle(isOn: $includeHearingDate) {
                Text("Add next hearing date")
            }

            if includeHearingDate {
                DatePicker(
                    "Next Hearing",
                    selection: $nextHearingDate,
                    displayedComponents: .date
                )
            }
        }
    }
}

// MARK: - Info Box
struct InfoBox: View {
    let icon: String
    let message: String

    var body: some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.accentColor)
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.accentColor.opacity(0.1))
        .cornerRadius(8)
    }
}

// MARK: - Import Cases Sheet
struct ImportCasesSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var caseViewModel: CaseViewModel
    @State private var isImporting = false
    @State private var importResult: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "square.and.arrow.down")
                    .font(.system(size: 60))
                    .foregroundColor(.accentColor)

                Text("Import Cases")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Import cases from CSV or Excel files")
                    .foregroundColor(.secondary)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Expected format:")
                        .font(.caption)
                        .fontWeight(.medium)
                    Text("Case Number, Case Type, Court, Year, Petitioner, Respondent")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(nsColor: .controlBackgroundColor))
                .cornerRadius(8)

                Button {
                    selectFile()
                } label: {
                    Label("Select File", systemImage: "folder")
                }
                .buttonStyle(.borderedProminent)
                .disabled(isImporting)

                if let result = importResult {
                    Text(result)
                        .foregroundColor(.green)
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Import")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .frame(width: 400, height: 400)
    }

    func selectFile() {
        let panel = NSOpenPanel()
        panel.allowedContentTypes = [.commaSeparatedText, .plainText]
        panel.allowsMultipleSelection = false

        if panel.runModal() == .OK, let url = panel.url {
            isImporting = true
            Task {
                do {
                    let count = try await caseViewModel.importCases(from: url)
                    importResult = "Successfully imported \(count) cases"
                } catch {
                    importResult = "Error: \(error.localizedDescription)"
                }
                isImporting = false
            }
        }
    }
}

// MARK: - Export Sheet
struct ExportSheet: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var caseViewModel: CaseViewModel
    @State private var selectedFormat: ExportFormat = .pdf
    @State private var isExporting = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "square.and.arrow.up")
                    .font(.system(size: 60))
                    .foregroundColor(.accentColor)

                Text("Export Cases")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Export \(caseViewModel.cases.count) cases")
                    .foregroundColor(.secondary)

                Picker("Format", selection: $selectedFormat) {
                    Text("PDF").tag(ExportFormat.pdf)
                    Text("Excel (CSV)").tag(ExportFormat.excel)
                    Text("CSV").tag(ExportFormat.csv)
                }
                .pickerStyle(.segmented)

                Button {
                    exportCases()
                } label: {
                    if isExporting {
                        ProgressView()
                    } else {
                        Label("Export", systemImage: "arrow.down.doc")
                    }
                }
                .buttonStyle(.borderedProminent)
                .disabled(isExporting)

                Spacer()
            }
            .padding()
            .navigationTitle("Export")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .frame(width: 400, height: 350)
    }

    func exportCases() {
        isExporting = true
        Task {
            do {
                let url = try await caseViewModel.exportCases(format: selectedFormat)
                NSWorkspace.shared.selectFile(url.path, inFileViewerRootedAtPath: url.deletingLastPathComponent().path)
                dismiss()
            } catch {
                appState.errorMessage = error.localizedDescription
            }
            isExporting = false
        }
    }
}

// MARK: - Preview
struct AddCaseSheet_Previews: PreviewProvider {
    static var previews: some View {
        AddCaseSheet()
            .environmentObject(CaseViewModel())
    }
}
