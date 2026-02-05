const axios = require('axios');
const cheerio = require('cheerio');
const log = require('electron-log');
const puppeteer = require('puppeteer-core');
const path = require('path');

/**
 * eCourts Service - Fetches case data from Indian eCourts government portals
 * With auto-fetch capability like Mercury Lawyer
 */
class EcourtsService {
  constructor(db) {
    this.db = db;
    this.browser = null;
    this.page = null;

    // Base URLs for different court portals
    this.urls = {
      highCourtAP: 'https://hcservices.ecourts.gov.in/ecourtindiaHC',
      districtCourts: 'https://services.ecourts.gov.in/ecourtindia_v6',
      supremeCourt: 'https://www.sci.gov.in',
      // eCourts API endpoints
      ecourtsCaseStatus: 'https://services.ecourts.gov.in/ecourtindia_v6/index.php',
      ecourtsHCStatus: 'https://hcservices.ecourts.gov.in/ecourtindiaHC'
    };

    // Court configurations for AP
    this.courtConfig = {
      'High Court of Andhra Pradesh': {
        stateCode: '2',
        distCode: '1',
        courtCode: '1',
        type: 'high',
        baseUrl: 'https://hcservices.ecourts.gov.in/ecourtindiaHC'
      },
      'Supreme Court of India': {
        type: 'supreme',
        baseUrl: 'https://www.sci.gov.in'
      }
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
      'Tirupati': { stateCode: '2', distCode: '2', courtComplex: 'Tirupati' }
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
      'CRLA': 'Criminal Appeal',
      'TC': 'Transfer Case',
      'TP': 'Transfer Petition'
    };
  }

  /**
   * Initialize Puppeteer browser for web scraping
   */
  async initBrowser() {
    if (this.browser) return;

    try {
      // Find Chrome/Chromium path based on OS
      const chromePaths = {
        darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        linux: '/usr/bin/google-chrome',
        win32: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      };

      const executablePath = chromePaths[process.platform];

      this.browser = await puppeteer.launch({
        headless: false, // Show browser for CAPTCHA
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--window-size=1200,800'
        ],
        defaultViewport: { width: 1200, height: 800 }
      });

      log.info('Browser initialized for eCourts scraping');
    } catch (error) {
      log.error('Failed to initialize browser:', error);
      throw new Error('Could not launch browser. Please ensure Google Chrome is installed.');
    }
  }

  /**
   * Close browser
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }

  /**
   * Search case by case number - AUTO FETCH like Mercury Lawyer
   */
  async searchCase(searchParams) {
    const { court, caseType, caseNumber, caseYear, district } = searchParams;
    log.info(`Searching case: ${caseType} ${caseNumber}/${caseYear} in ${court}`);

    try {
      if (court === 'High Court of Andhra Pradesh') {
        return await this.searchHighCourtCase(searchParams);
      } else if (court === 'Supreme Court of India') {
        return await this.searchSupremeCourtCase(searchParams);
      } else {
        return await this.searchDistrictCourtCase(searchParams);
      }
    } catch (error) {
      log.error('Search error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Search High Court of AP case
   */
  async searchHighCourtCase(params) {
    const { caseType, caseNumber, caseYear } = params;

    await this.initBrowser();
    const page = await this.browser.newPage();

    try {
      // Navigate to High Court case status page
      const url = `${this.urls.ecourtsHCStatus}/cases/case_no.php?state_cd=2&dist_cd=1&court_code=1&stateNm=Andhra%20Pradesh`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      log.info('Navigated to HC case status page');

      // Wait for form to load
      await page.waitForSelector('select[name="case_type"]', { timeout: 10000 });

      // Select case type
      await page.select('select[name="case_type"]', caseType);
      await page.waitForTimeout(500);

      // Enter case number
      await page.type('input[name="search_case_no"]', caseNumber.toString());

      // Select year
      await page.select('select[name="search_case_year"]', caseYear.toString());

      // Wait for user to solve CAPTCHA
      log.info('Waiting for CAPTCHA to be solved...');

      // Show instruction to user
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.id = 'captcha-instruction';
        overlay.innerHTML = `
          <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
                      background: #1a472a; color: white; padding: 15px 25px; border-radius: 8px;
                      font-family: Arial; font-size: 14px; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            Please solve the CAPTCHA and click "Go" button. The case details will be fetched automatically.
          </div>
        `;
        document.body.appendChild(overlay);
      });

      // Wait for results table to appear (user solved CAPTCHA and clicked Go)
      await page.waitForSelector('table.case_details_table, .case_history_table, #disposedList, .alert-danger', {
        timeout: 120000 // 2 minutes for user to solve CAPTCHA
      });

      // Check if case found
      const notFound = await page.$('.alert-danger');
      if (notFound) {
        const errorText = await page.evaluate(el => el.textContent, notFound);
        if (errorText.includes('not found') || errorText.includes('No record')) {
          await page.close();
          return { success: false, error: 'Case not found' };
        }
      }

      // Extract case details
      const caseData = await this.extractHighCourtCaseData(page);

      await page.close();

      return {
        success: true,
        data: caseData,
        source: 'High Court of AP eCourts'
      };

    } catch (error) {
      log.error('High Court search error:', error);
      await page.close();
      throw error;
    }
  }

  /**
   * Extract case data from High Court page
   */
  async extractHighCourtCaseData(page) {
    return await page.evaluate(() => {
      const data = {
        court_name: 'High Court of Andhra Pradesh'
      };

      // Helper to get text content safely
      const getText = (selector) => {
        const el = document.querySelector(selector);
        return el ? el.textContent.trim() : '';
      };

      // Try to extract from case details table
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 2) {
            const label = cells[0].textContent.trim().toLowerCase();
            const value = cells[1].textContent.trim();

            if (label.includes('case number') || label.includes('case no')) {
              data.case_number = value;
            } else if (label.includes('cnr')) {
              data.cnr_number = value;
            } else if (label.includes('petitioner') && !label.includes('advocate')) {
              data.petitioner = value;
            } else if (label.includes('respondent') && !label.includes('advocate')) {
              data.respondent = value;
            } else if (label.includes('petitioner advocate') || label.includes('pet. adv')) {
              data.advocate_petitioner = value;
            } else if (label.includes('respondent advocate') || label.includes('res. adv')) {
              data.advocate_respondent = value;
            } else if (label.includes('filing date') || label.includes('date of filing')) {
              data.filing_date = value;
            } else if (label.includes('registration date')) {
              data.registration_date = value;
            } else if (label.includes('next hearing') || label.includes('next date')) {
              data.next_hearing_date = value;
            } else if (label.includes('status') || label.includes('case status')) {
              data.case_status = value.toLowerCase().includes('disposed') ? 'disposed' : 'pending';
            } else if (label.includes('stage')) {
              data.case_stage = value;
            } else if (label.includes('judge') || label.includes('bench')) {
              data.judge_name = value;
            } else if (label.includes('act') || label.includes('section')) {
              data.act_sections = value;
            }
          }
        });
      });

      return data;
    });
  }

  /**
   * Search District Court case
   */
  async searchDistrictCourtCase(params) {
    const { caseType, caseNumber, caseYear, district } = params;

    const districtConfig = this.districtCourts[district];
    if (!districtConfig) {
      return { success: false, error: 'District not configured' };
    }

    await this.initBrowser();
    const page = await this.browser.newPage();

    try {
      // Navigate to district court case status page
      const url = `https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index&state_code=${districtConfig.stateCode}&dist_code=${districtConfig.distCode}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      log.info('Navigated to District Court page');

      // Click on "Case Number" tab
      await page.waitForSelector('a[href*="case_no"]', { timeout: 10000 });
      await page.click('a[href*="case_no"]');
      await page.waitForTimeout(1000);

      // Fill the form
      await page.waitForSelector('select[name="case_type"]', { timeout: 10000 });
      await page.select('select[name="case_type"]', caseType);
      await page.type('input[name="case_no"]', caseNumber.toString());
      await page.select('select[name="case_year"]', caseYear.toString());

      // Show CAPTCHA instruction
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.innerHTML = `
          <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
                      background: #1a472a; color: white; padding: 15px 25px; border-radius: 8px;
                      font-family: Arial; font-size: 14px; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            Please solve the CAPTCHA and click "Search" button.
          </div>
        `;
        document.body.appendChild(overlay);
      });

      // Wait for results
      await page.waitForSelector('.case_details, .case-details, .alert-danger, #case_history', {
        timeout: 120000
      });

      // Extract case details
      const caseData = await this.extractDistrictCourtCaseData(page);
      caseData.district = district;
      caseData.court_name = `District Court ${district}`;

      await page.close();

      return {
        success: true,
        data: caseData,
        source: 'eCourts District Services'
      };

    } catch (error) {
      log.error('District Court search error:', error);
      await page.close();
      throw error;
    }
  }

  /**
   * Extract case data from District Court page
   */
  async extractDistrictCourtCaseData(page) {
    return await page.evaluate(() => {
      const data = {};

      // Find all tables with case information
      const tables = document.querySelectorAll('table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const label = cells[0].textContent.trim().toLowerCase();
            const value = cells[1].textContent.trim();

            if (label.includes('case number') || label.includes('case no')) {
              data.case_number = value;
            } else if (label.includes('cnr')) {
              data.cnr_number = value;
            } else if (label.includes('petitioner') && !label.includes('advocate')) {
              data.petitioner = value;
            } else if (label.includes('respondent') && !label.includes('advocate')) {
              data.respondent = value;
            } else if (label.includes('pet') && label.includes('adv')) {
              data.advocate_petitioner = value;
            } else if (label.includes('res') && label.includes('adv')) {
              data.advocate_respondent = value;
            } else if (label.includes('filing')) {
              data.filing_date = value;
            } else if (label.includes('registration')) {
              data.registration_date = value;
            } else if (label.includes('next') && label.includes('date')) {
              data.next_hearing_date = value;
            } else if (label.includes('status')) {
              data.case_status = value.toLowerCase().includes('disposed') ? 'disposed' : 'pending';
            } else if (label.includes('stage')) {
              data.case_stage = value;
            } else if (label.includes('judge') || label.includes('court no')) {
              data.judge_name = value;
            } else if (label.includes('act')) {
              data.act_sections = value;
            }
          }
        });
      });

      return data;
    });
  }

  /**
   * Search Supreme Court case
   */
  async searchSupremeCourtCase(params) {
    const { caseType, caseNumber, caseYear } = params;

    await this.initBrowser();
    const page = await this.browser.newPage();

    try {
      // Navigate to Supreme Court case status page
      await page.goto('https://www.sci.gov.in/case-status-case-no/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      log.info('Navigated to Supreme Court page');

      // Wait for form
      await page.waitForSelector('select, input[type="text"]', { timeout: 10000 });

      // Show instruction
      await page.evaluate(() => {
        const overlay = document.createElement('div');
        overlay.innerHTML = `
          <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
                      background: #1a472a; color: white; padding: 15px 25px; border-radius: 8px;
                      font-family: Arial; font-size: 14px; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            Please select Case Type: ${caseType}, enter Number: ${caseNumber}, Year: ${caseYear}, solve CAPTCHA and click Search.
          </div>
        `;
        document.body.appendChild(overlay);
      });

      // Wait for results (up to 2 minutes for user interaction)
      await page.waitForSelector('.case-details, .table, .alert-danger', {
        timeout: 120000
      });

      // Extract case details
      const caseData = await page.evaluate(() => {
        const data = {
          court_name: 'Supreme Court of India'
        };

        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
              const label = cells[0].textContent.trim().toLowerCase();
              const value = cells[1].textContent.trim();

              if (label.includes('diary') || label.includes('case no')) {
                data.case_number = value;
              } else if (label.includes('petitioner')) {
                data.petitioner = value;
              } else if (label.includes('respondent')) {
                data.respondent = value;
              } else if (label.includes('listed')) {
                data.next_hearing_date = value;
              } else if (label.includes('status')) {
                data.case_status = value.toLowerCase().includes('disposed') ? 'disposed' : 'pending';
              }
            }
          });
        });

        return data;
      });

      await page.close();

      return {
        success: true,
        data: caseData,
        source: 'Supreme Court of India'
      };

    } catch (error) {
      log.error('Supreme Court search error:', error);
      await page.close();
      throw error;
    }
  }

  /**
   * Search by CNR Number (unique identifier - most reliable)
   */
  async searchByCNR(cnrNumber) {
    log.info(`Searching by CNR: ${cnrNumber}`);

    await this.initBrowser();
    const page = await this.browser.newPage();

    try {
      // Navigate to CNR search page
      await page.goto('https://services.ecourts.gov.in/ecourtindia_v6/?p=casestatus/index', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Click CNR tab
      await page.waitForSelector('a[href*="cnr"]', { timeout: 10000 });
      await page.click('a[href*="cnr"]');
      await page.waitForTimeout(1000);

      // Enter CNR number
      await page.type('input[name="cino"]', cnrNumber);

      // Show instruction
      await page.evaluate((cnr) => {
        const overlay = document.createElement('div');
        overlay.innerHTML = `
          <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%);
                      background: #1a472a; color: white; padding: 15px 25px; border-radius: 8px;
                      font-family: Arial; font-size: 14px; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
            CNR: ${cnr} entered. Please solve the CAPTCHA and click Search.
          </div>
        `;
        document.body.appendChild(overlay);
      }, cnrNumber);

      // Wait for results
      await page.waitForSelector('.case_details, .alert-danger', { timeout: 120000 });

      const caseData = await this.extractDistrictCourtCaseData(page);
      await page.close();

      return {
        success: true,
        data: caseData,
        source: 'eCourts CNR Search'
      };

    } catch (error) {
      log.error('CNR search error:', error);
      await page.close();
      throw error;
    }
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
   * Fetch case status (for existing case refresh)
   */
  async fetchCaseStatus(caseData) {
    return await this.searchCase({
      court: caseData.court_name,
      caseType: caseData.case_type,
      caseNumber: caseData.case_number?.match(/\d+/)?.[0],
      caseYear: caseData.case_year,
      district: caseData.district
    });
  }

  /**
   * Fetch case orders
   */
  async fetchCaseOrders(caseData) {
    // Orders are typically fetched along with case details
    return {
      success: true,
      orders: [],
      message: 'Check case details for order history'
    };
  }
}

module.exports = EcourtsService;
