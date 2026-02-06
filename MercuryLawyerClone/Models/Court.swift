//
//  Court.swift
//  MercuryLawyerClone
//
//  Model representing a court
//

import Foundation

// MARK: - Court Model
struct Court: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var code: String
    var type: CourtType
    var state: IndianState
    var district: String?
    var address: String?
    var website: String?
    var isActive: Bool

    init(
        id: UUID = UUID(),
        name: String,
        code: String,
        type: CourtType,
        state: IndianState,
        district: String? = nil,
        address: String? = nil,
        website: String? = nil,
        isActive: Bool = true
    ) {
        self.id = id
        self.name = name
        self.code = code
        self.type = type
        self.state = state
        self.district = district
        self.address = address
        self.website = website
        self.isActive = isActive
    }
}

// MARK: - Court Type
enum CourtType: String, Codable, CaseIterable {
    case supremeCourt = "Supreme Court"
    case highCourt = "High Court"
    case districtCourt = "District Court"
    case tribunals = "Tribunals"
    case consumerCourt = "Consumer Court"
    case laborCourt = "Labor Court"
    case familyCourt = "Family Court"
    case other = "Other"

    var icon: String {
        switch self {
        case .supremeCourt: return "building.columns.fill"
        case .highCourt: return "building.columns"
        case .districtCourt: return "building.2"
        case .tribunals: return "person.3"
        case .consumerCourt: return "cart"
        case .laborCourt: return "person.2"
        case .familyCourt: return "house"
        case .other: return "building"
        }
    }
}

// MARK: - Indian States
enum IndianState: String, Codable, CaseIterable {
    case andhraPradesh = "Andhra Pradesh"
    case arunachalPradesh = "Arunachal Pradesh"
    case assam = "Assam"
    case bihar = "Bihar"
    case chhattisgarh = "Chhattisgarh"
    case goa = "Goa"
    case gujarat = "Gujarat"
    case haryana = "Haryana"
    case himachalPradesh = "Himachal Pradesh"
    case jharkhand = "Jharkhand"
    case karnataka = "Karnataka"
    case kerala = "Kerala"
    case madhyaPradesh = "Madhya Pradesh"
    case maharashtra = "Maharashtra"
    case manipur = "Manipur"
    case meghalaya = "Meghalaya"
    case mizoram = "Mizoram"
    case nagaland = "Nagaland"
    case odisha = "Odisha"
    case punjab = "Punjab"
    case rajasthan = "Rajasthan"
    case sikkim = "Sikkim"
    case tamilNadu = "Tamil Nadu"
    case telangana = "Telangana"
    case tripura = "Tripura"
    case uttarPradesh = "Uttar Pradesh"
    case uttarakhand = "Uttarakhand"
    case westBengal = "West Bengal"
    case delhi = "Delhi"
    case jammuKashmir = "Jammu & Kashmir"
    case ladakh = "Ladakh"
    case puducherry = "Puducherry"
    case chandigarh = "Chandigarh"

    var highCourtName: String {
        switch self {
        case .andhraPradesh: return "High Court of Andhra Pradesh"
        case .telangana: return "High Court of Telangana"
        case .karnataka: return "High Court of Karnataka"
        case .kerala: return "High Court of Kerala"
        case .tamilNadu: return "Madras High Court"
        case .maharashtra: return "Bombay High Court"
        case .delhi: return "Delhi High Court"
        case .gujarat: return "Gujarat High Court"
        case .rajasthan: return "Rajasthan High Court"
        case .madhyaPradesh: return "Madhya Pradesh High Court"
        case .uttarPradesh: return "Allahabad High Court"
        case .bihar: return "Patna High Court"
        case .westBengal: return "Calcutta High Court"
        case .punjab, .haryana, .chandigarh: return "Punjab and Haryana High Court"
        default: return "\(self.rawValue) High Court"
        }
    }
}

// MARK: - Predefined Courts
extension Court {
    static let allCourts: [Court] = [
        // Supreme Court
        Court(
            name: "Supreme Court of India",
            code: "SCI",
            type: .supremeCourt,
            state: .delhi,
            address: "Tilak Marg, New Delhi - 110001",
            website: "https://main.sci.gov.in"
        ),

        // Andhra Pradesh High Court
        Court(
            name: "High Court of Andhra Pradesh",
            code: "APHC",
            type: .highCourt,
            state: .andhraPradesh,
            address: "Nelapadu, Amaravati, Andhra Pradesh",
            website: "https://hc.ap.nic.in"
        ),

        // Telangana High Court
        Court(
            name: "High Court of Telangana",
            code: "TSHC",
            type: .highCourt,
            state: .telangana,
            address: "High Court Complex, Hyderabad",
            website: "https://tshc.gov.in"
        ),

        // Delhi High Court
        Court(
            name: "Delhi High Court",
            code: "DHC",
            type: .highCourt,
            state: .delhi,
            address: "Sher Shah Road, New Delhi",
            website: "https://delhihighcourt.nic.in"
        ),

        // Bombay High Court
        Court(
            name: "Bombay High Court",
            code: "BHC",
            type: .highCourt,
            state: .maharashtra,
            address: "Fort, Mumbai",
            website: "https://bombayhighcourt.nic.in"
        ),

        // Madras High Court
        Court(
            name: "Madras High Court",
            code: "MHC",
            type: .highCourt,
            state: .tamilNadu,
            address: "High Court Campus, Chennai",
            website: "https://hcmadras.tn.nic.in"
        ),

        // Karnataka High Court
        Court(
            name: "High Court of Karnataka",
            code: "KHC",
            type: .highCourt,
            state: .karnataka,
            address: "High Court Buildings, Bangalore",
            website: "https://karnatakajudiciary.kar.nic.in"
        ),

        // Calcutta High Court
        Court(
            name: "Calcutta High Court",
            code: "CHC",
            type: .highCourt,
            state: .westBengal,
            address: "High Court, Kolkata",
            website: "https://calcuttahighcourt.gov.in"
        ),

        // Allahabad High Court
        Court(
            name: "Allahabad High Court",
            code: "AHC",
            type: .highCourt,
            state: .uttarPradesh,
            address: "High Court, Allahabad",
            website: "https://allahabadhighcourt.in"
        ),

        // Gujarat High Court
        Court(
            name: "Gujarat High Court",
            code: "GHC",
            type: .highCourt,
            state: .gujarat,
            address: "Sola, Ahmedabad",
            website: "https://gujarathighcourt.nic.in"
        ),

        // Kerala High Court
        Court(
            name: "High Court of Kerala",
            code: "KLHC",
            type: .highCourt,
            state: .kerala,
            address: "Kochi",
            website: "https://highcourtofkerala.nic.in"
        ),

        // Punjab and Haryana High Court
        Court(
            name: "Punjab and Haryana High Court",
            code: "PHHC",
            type: .highCourt,
            state: .chandigarh,
            address: "Sector 1, Chandigarh",
            website: "https://phhc.gov.in"
        ),

        // Rajasthan High Court
        Court(
            name: "Rajasthan High Court",
            code: "RHC",
            type: .highCourt,
            state: .rajasthan,
            address: "Jodhpur",
            website: "https://hcraj.nic.in"
        ),

        // Patna High Court
        Court(
            name: "Patna High Court",
            code: "PHC",
            type: .highCourt,
            state: .bihar,
            address: "Patna",
            website: "https://patnahighcourt.gov.in"
        )
    ]

    // AP District Courts
    static let apDistrictCourts: [Court] = [
        Court(name: "Anantapur District Court", code: "AP-ATP", type: .districtCourt, state: .andhraPradesh, district: "Anantapur"),
        Court(name: "Chittoor District Court", code: "AP-CTR", type: .districtCourt, state: .andhraPradesh, district: "Chittoor"),
        Court(name: "East Godavari District Court", code: "AP-EG", type: .districtCourt, state: .andhraPradesh, district: "East Godavari"),
        Court(name: "Guntur District Court", code: "AP-GNT", type: .districtCourt, state: .andhraPradesh, district: "Guntur"),
        Court(name: "Krishna District Court", code: "AP-KRS", type: .districtCourt, state: .andhraPradesh, district: "Krishna"),
        Court(name: "Kurnool District Court", code: "AP-KNL", type: .districtCourt, state: .andhraPradesh, district: "Kurnool"),
        Court(name: "Nellore District Court", code: "AP-NLR", type: .districtCourt, state: .andhraPradesh, district: "Nellore"),
        Court(name: "Prakasam District Court", code: "AP-PKM", type: .districtCourt, state: .andhraPradesh, district: "Prakasam"),
        Court(name: "Srikakulam District Court", code: "AP-SKM", type: .districtCourt, state: .andhraPradesh, district: "Srikakulam"),
        Court(name: "Visakhapatnam District Court", code: "AP-VSP", type: .districtCourt, state: .andhraPradesh, district: "Visakhapatnam"),
        Court(name: "Vizianagaram District Court", code: "AP-VZM", type: .districtCourt, state: .andhraPradesh, district: "Vizianagaram"),
        Court(name: "West Godavari District Court", code: "AP-WG", type: .districtCourt, state: .andhraPradesh, district: "West Godavari"),
        Court(name: "YSR Kadapa District Court", code: "AP-KDP", type: .districtCourt, state: .andhraPradesh, district: "YSR Kadapa")
    ]
}
