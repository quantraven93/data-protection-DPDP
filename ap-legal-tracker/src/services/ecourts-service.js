const axios = require('axios');
const cheerio = require('cheerio');
const log = require('electron-log');

/**
 * eCourts Service - Fetches case data from Indian eCourts government portals
 *
 * Supported courts:
 * - High Court of Andhra Pradesh
 * - District Courts in AP
 * - Supreme Court of India
 */
class EcourtsService {
  constructor(db) {
    this.db = db;

    // Base URLs for different court portals
    this.urls = {
      highCourtAP: 'https://hcservices.ecourts.gov.in/ecourtindiaHC',
      districtCourts: 'https://services.ecourts.gov.in/ecourtindia_v6',
      supremeCourt: 'https://www.sci.gov.in',
      // Third-party API (if available)
      courtApi: 'https://court-api.kleopatra.io'
    };

    // State and court codes for AP
    this.apCodes = {
      stateCode: '2',
      stateName: 'Andhra Pradesh',
      highCourtCode: '1'
    };

    // Common headers for requests
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive'
    };
  }

  /**
   * Fetch case status from appropriate court portal
   */
  async fetchCaseStatus(caseData) {
    log.info(`Fetching case status for: ${caseData.case_number}`);

    try {
      let result;

      // Determine which court API to use
      if (caseData.court_name?.includes('Supreme Court')) {
        result = await this.fetchSupremeCourtStatus(caseData);
      } else if (caseData.court_name?.includes('High Court')) {
        result = await this.fetchHighCourtStatus(caseData);
      } else {
        result = await this.fetchDistrictCourtStatus(caseData);
      }

      // Update database with fetched data
      if (result && result.success) {
        await this.db.updateCase(caseData.id, {
          ...caseData,
          ...result.data,
          last_fetched: new Date().toISOString()
        });

        // Add proceedings if available
        if (result.proceedings && result.proceedings.length > 0) {
          for (const proc of result.proceedings) {
            await this.db.addProceeding({
              case_id: caseData.id,
              ...proc
            });
          }
        }
      }

      return result;
    } catch (error) {
      log.error(`Error fetching case status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch case status from High Court of AP eCourts portal
   */
  async fetchHighCourtStatus(caseData) {
    const baseUrl = this.urls.highCourtAP;

    try {
      // Parse case number to extract type and number
      const caseInfo = this.parseCaseNumber(caseData.case_number);

      // Note: The actual eCourts site requires CAPTCHA
      // This is a placeholder for the structure - in production,
      // you may need to use Puppeteer for CAPTCHA handling
      // or integrate with a CAPTCHA solving service

      log.info(`High Court fetch for: ${JSON.stringify(caseInfo)}`);

      // For now, return structure for manual update
      return {
        success: true,
        message: 'High Court data structure ready for manual update',
        data: {
          court_name: 'High Court of Andhra Pradesh',
          case_status: caseData.case_status || 'pending'
        },
        requiresCaptcha: true,
        portalUrl: `${baseUrl}/cases/case_no.php?state_cd=2&dist_cd=1&court_code=1&stateNm=Andhra Pradesh`
      };
    } catch (error) {
      log.error(`High Court fetch error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch case status from District Courts eCourts portal
   */
  async fetchDistrictCourtStatus(caseData) {
    try {
      // Get district code from case data or database
      const districtCode = caseData.district_code || await this.getDistrictCode(caseData.district);

      log.info(`District Court fetch for district: ${districtCode}`);

      // Similar to HC, eCourts requires CAPTCHA
      return {
        success: true,
        message: 'District Court data structure ready for manual update',
        data: {
          case_status: caseData.case_status || 'pending'
        },
        requiresCaptcha: true,
        portalUrl: `${this.urls.districtCourts}/?p=casestatus/index&state_code=2&dist_code=${districtCode}`
      };
    } catch (error) {
      log.error(`District Court fetch error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch case status from Supreme Court portal
   */
  async fetchSupremeCourtStatus(caseData) {
    try {
      const caseInfo = this.parseCaseNumber(caseData.case_number);

      log.info(`Supreme Court fetch for: ${JSON.stringify(caseInfo)}`);

      return {
        success: true,
        message: 'Supreme Court data structure ready',
        data: {
          court_name: 'Supreme Court of India',
          case_status: caseData.case_status || 'pending'
        },
        portalUrl: `${this.urls.supremeCourt}/case-status-case-no/`
      };
    } catch (error) {
      log.error(`Supreme Court fetch error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch case orders from eCourts
   */
  async fetchCaseOrders(caseData) {
    log.info(`Fetching orders for case: ${caseData.case_number}`);

    try {
      // Return structure for orders
      return {
        success: true,
        message: 'Order fetch structure ready',
        orders: [],
        portalUrl: this.getOrdersPortalUrl(caseData)
      };
    } catch (error) {
      log.error(`Error fetching orders: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Use CNR number to fetch case details (most reliable method)
   */
  async fetchByCNR(cnrNumber) {
    log.info(`Fetching by CNR: ${cnrNumber}`);

    // CNR format: XXXX00-000000-YYYY
    // First 4 chars: State+District code
    // Next 6 chars: Case sequence
    // Last 4 chars: Year

    try {
      return {
        success: true,
        message: 'CNR lookup structure ready',
        portalUrl: `${this.urls.districtCourts}/?p=casestatus/index&cnr=${cnrNumber}`
      };
    } catch (error) {
      log.error(`CNR fetch error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse case number string into components
   */
  parseCaseNumber(caseNumber) {
    // Common formats:
    // WP(C) No. 12345/2024 - Writ Petition Civil
    // CRP No. 123/2024 - Civil Revision Petition
    // CMA No. 456/2024 - Civil Miscellaneous Appeal
    // OS No. 789/2024 - Original Suit
    // AS No. 111/2024 - Appeal Suit
    // SLP(C) No. 222/2024 - Special Leave Petition (Supreme Court)

    const patterns = [
      /^([A-Z()]+)\s*(?:No\.?)\s*(\d+)\s*[\/\-]\s*(\d{4})$/i,
      /^([A-Z()]+)\s*(\d+)\s*[\/\-]\s*(\d{4})$/i,
      /^([A-Z]+)\s*\(([A-Z]+)\)\s*(?:No\.?)\s*(\d+)\s*[\/\-]\s*(\d{4})$/i
    ];

    for (const pattern of patterns) {
      const match = caseNumber.match(pattern);
      if (match) {
        if (match.length === 4) {
          return {
            caseType: match[1].trim(),
            caseNumber: match[2],
            caseYear: match[3]
          };
        } else if (match.length === 5) {
          return {
            caseType: `${match[1]}(${match[2]})`,
            caseNumber: match[3],
            caseYear: match[4]
          };
        }
      }
    }

    // Return as-is if no pattern matches
    return { raw: caseNumber };
  }

  /**
   * Get district code from district name
   */
  async getDistrictCode(districtName) {
    if (!districtName) return null;

    const districtCodes = {
      'anantapur': '1',
      'chittoor': '2',
      'east godavari': '3',
      'guntur': '7',
      'kadapa': '25',
      'krishna': '9',
      'kurnool': '10',
      'nellore': '20',
      'prakasam': '18',
      'srikakulam': '21',
      'visakhapatnam': '24',
      'vizianagaram': '23',
      'west godavari': '26',
      'vijayawada': '13',
      'tirupati': '6',
      'rajahmundry': '5',
      'kakinada': '5',
      'eluru': '26',
      'ongole': '18'
    };

    const normalized = districtName.toLowerCase().trim();
    return districtCodes[normalized] || null;
  }

  /**
   * Get portal URL for viewing orders
   */
  getOrdersPortalUrl(caseData) {
    if (caseData.court_name?.includes('Supreme Court')) {
      return `${this.urls.supremeCourt}/case-status-case-no/`;
    } else if (caseData.court_name?.includes('High Court')) {
      return `${this.urls.highCourtAP}/cases/s_kiosk_order.php?state_cd=2&dist_cd=1&court_code=1&stateNm=Andhra Pradesh`;
    } else {
      return `${this.urls.districtCourts}/?p=casestatus/index`;
    }
  }

  /**
   * Get cause list for a specific date
   */
  async getCauseList(court, date) {
    log.info(`Fetching cause list for ${court} on ${date}`);

    // Cause list URLs
    const causeListUrls = {
      highCourt: `${this.urls.highCourtAP}/cases/causelist_qry.php?state_cd=2&dist_cd=1&court_code=1`,
      supremeCourt: `${this.urls.supremeCourt}/cause-list/`
    };

    return {
      success: true,
      message: 'Cause list fetch structure ready',
      portalUrl: causeListUrls[court] || causeListUrls.highCourt
    };
  }

  /**
   * Health check for eCourts portals
   */
  async checkPortalHealth() {
    const results = {};

    for (const [name, url] of Object.entries(this.urls)) {
      try {
        const response = await axios.head(url, {
          headers: this.headers,
          timeout: 10000
        });
        results[name] = { status: 'up', statusCode: response.status };
      } catch (error) {
        results[name] = { status: 'down', error: error.message };
      }
    }

    return results;
  }
}

module.exports = EcourtsService;
