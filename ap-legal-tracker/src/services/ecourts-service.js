const log = require('electron-log');

/**
 * eCourts Service - Helper functions for case data
 * Browser integration is handled by embedded webview in the renderer process
 */
class EcourtsService {
  constructor(db) {
    this.db = db;

    // Base URLs for different court portals (for reference)
    this.urls = {
      highCourtAP: 'https://hcservices.ecourts.gov.in/hcservices/main.php',
      districtCourts: 'https://services.ecourts.gov.in/ecourtindia_v6/',
      supremeCourt: 'https://main.sci.gov.in/case-status'
    };

    // District court configurations for AP
    this.districtCourts = {
      'Anantapur': { stateCode: '2', distCode: '1' },
      'Chittoor': { stateCode: '2', distCode: '2' },
      'East Godavari': { stateCode: '2', distCode: '3' },
      'Guntur': { stateCode: '2', distCode: '4' },
      'Krishna': { stateCode: '2', distCode: '5' },
      'Kurnool': { stateCode: '2', distCode: '6' },
      'Nellore': { stateCode: '2', distCode: '7' },
      'Prakasam': { stateCode: '2', distCode: '8' },
      'Srikakulam': { stateCode: '2', distCode: '9' },
      'Visakhapatnam': { stateCode: '2', distCode: '10' },
      'Vizianagaram': { stateCode: '2', distCode: '11' },
      'West Godavari': { stateCode: '2', distCode: '12' },
      'YSR Kadapa': { stateCode: '2', distCode: '13' },
      'Vijayawada': { stateCode: '2', distCode: '5', courtComplex: 'Vijayawada' },
      'Tirupati': { stateCode: '2', distCode: '2', courtComplex: 'Tirupati' },
      'Rajahmundry': { stateCode: '2', distCode: '3', courtComplex: 'Rajahmundry' },
      'Kakinada': { stateCode: '2', distCode: '3', courtComplex: 'Kakinada' },
      'Eluru': { stateCode: '2', distCode: '12', courtComplex: 'Eluru' },
      'Ongole': { stateCode: '2', distCode: '8', courtComplex: 'Ongole' }
    };

    // Case types mapping
    this.caseTypes = {
      // High Court case types
      'WP': 'Writ Petition',
      'WPMP': 'WP Miscellaneous Petition',
      'CRP': 'Civil Revision Petition',
      'CMA': 'Civil Miscellaneous Appeal',
      'AS': 'Appeal Suit',
      'SA': 'Second Appeal',
      'CRLP': 'Criminal Petition',
      'CRLA': 'Criminal Appeal',
      'CRLMP': 'Criminal Miscellaneous Petition',
      'PIL': 'Public Interest Litigation',
      'OP': 'Original Petition',
      'AAO': 'Arb. Application Original',
      // District Court case types
      'OS': 'Original Suit',
      'EP': 'Execution Petition',
      'IA': 'Interlocutory Application',
      'CMP': 'Civil Miscellaneous Petition',
      'MC': 'Miscellaneous Case',
      'CC': 'Civil Case',
      'SC': 'Sessions Case',
      'CRL': 'Criminal Case',
      // Supreme Court
      'SLP': 'Special Leave Petition',
      'WPC': 'Writ Petition Civil',
      'WPCRL': 'Writ Petition Criminal',
      'CA': 'Civil Appeal',
      'TC': 'Transfer Case',
      'TP': 'Transfer Petition'
    };
  }

  /**
   * Get available case types for a court
   */
  getCaseTypes(courtType) {
    if (courtType === 'high') {
      return [
        { code: 'WP', name: 'Writ Petition (WP)' },
        { code: 'WPMP', name: 'WP Misc Petition (WPMP)' },
        { code: 'CRP', name: 'Civil Revision Petition (CRP)' },
        { code: 'CMA', name: 'Civil Misc Appeal (CMA)' },
        { code: 'SA', name: 'Second Appeal (SA)' },
        { code: 'AS', name: 'Appeal Suit (AS)' },
        { code: 'CRLP', name: 'Criminal Petition (CRLP)' },
        { code: 'CRLA', name: 'Criminal Appeal (CRLA)' },
        { code: 'PIL', name: 'Public Interest Litigation (PIL)' },
        { code: 'OP', name: 'Original Petition (OP)' },
        { code: 'AAO', name: 'Arbitration Application (AAO)' }
      ];
    } else if (courtType === 'supreme') {
      return [
        { code: 'SLP(C)', name: 'Special Leave Petition Civil' },
        { code: 'SLP(CRL)', name: 'Special Leave Petition Criminal' },
        { code: 'WP(C)', name: 'Writ Petition Civil' },
        { code: 'WP(CRL)', name: 'Writ Petition Criminal' },
        { code: 'CA', name: 'Civil Appeal' },
        { code: 'CRA', name: 'Criminal Appeal' },
        { code: 'TC', name: 'Transfer Case' },
        { code: 'TP', name: 'Transfer Petition' }
      ];
    } else {
      // District courts
      return [
        { code: 'OS', name: 'Original Suit (OS)' },
        { code: 'AS', name: 'Appeal Suit (AS)' },
        { code: 'EP', name: 'Execution Petition (EP)' },
        { code: 'CMP', name: 'Civil Misc Petition (CMP)' },
        { code: 'IA', name: 'Interlocutory Application (IA)' },
        { code: 'MC', name: 'Miscellaneous Case (MC)' },
        { code: 'SC', name: 'Sessions Case (SC)' },
        { code: 'CC', name: 'Criminal Case (CC)' },
        { code: 'CRL', name: 'Criminal (CRL)' }
      ];
    }
  }

  /**
   * Get districts list for AP
   */
  getDistricts() {
    return Object.keys(this.districtCourts);
  }

  /**
   * Get URL for a specific court
   */
  getCourtUrl(courtName) {
    const courtLower = courtName.toLowerCase();
    if (courtLower.includes('high court')) {
      return this.urls.highCourtAP;
    } else if (courtLower.includes('supreme court')) {
      return this.urls.supremeCourt;
    } else {
      return this.urls.districtCourts;
    }
  }

  /**
   * Fetch case status - returns URL for embedded browser
   * Actual fetching happens via webview in renderer
   */
  async fetchCaseStatus(caseData) {
    log.info('Fetching case status for:', caseData.case_number);

    // Return the appropriate URL for the case
    const url = this.getCourtUrl(caseData.court_name);

    return {
      success: true,
      url: url,
      message: 'Open this URL in the embedded browser to fetch case status'
    };
  }

  /**
   * Fetch case orders - returns URL for embedded browser
   */
  async fetchCaseOrders(caseData) {
    log.info('Fetching case orders for:', caseData.case_number);

    return {
      success: true,
      orders: [],
      message: 'Use the embedded browser to view and download orders'
    };
  }

  /**
   * No browser to close - webview is managed by renderer
   */
  async closeBrowser() {
    // No-op - webview is managed by the renderer process
    return;
  }
}

module.exports = EcourtsService;
