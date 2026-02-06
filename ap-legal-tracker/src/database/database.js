const Store = require('electron-store');
const log = require('electron-log');

/**
 * Database using electron-store (JSON-based storage)
 * No native compilation required - works on all platforms
 */
class CaseDatabase {
  constructor(userDataPath) {
    this.store = new Store({
      name: 'ap-legal-tracker-data',
      defaults: {
        cases: [],
        nextCaseId: 1,
        courts: [],
        districts: []
      }
    });
  }

  async initialize() {
    log.info('Initializing JSON database...');

    // Seed courts and districts if empty
    if (this.store.get('courts', []).length === 0) {
      this.seedCourtsAndDistricts();
    }

    log.info('Database initialized successfully');
  }

  seedCourtsAndDistricts() {
    const courts = [
      { id: 1, name: 'Supreme Court of India', code: 'SCI', type: 'supreme' },
      { id: 2, name: 'High Court of Andhra Pradesh', code: 'HCAP', type: 'high' },
      { id: 3, name: 'District Court Vijayawada', code: 'DC-VJA', type: 'district' },
      { id: 4, name: 'District Court Guntur', code: 'DC-GNT', type: 'district' },
      { id: 5, name: 'District Court Visakhapatnam', code: 'DC-VSP', type: 'district' },
      { id: 6, name: 'District Court Tirupati', code: 'DC-TPT', type: 'district' },
      { id: 7, name: 'District Court Nellore', code: 'DC-NLR', type: 'district' },
      { id: 8, name: 'District Court Kurnool', code: 'DC-KNL', type: 'district' },
      { id: 9, name: 'District Court Anantapur', code: 'DC-ATP', type: 'district' },
      { id: 10, name: 'District Court Kadapa', code: 'DC-KDP', type: 'district' },
      { id: 11, name: 'District Court Rajahmundry', code: 'DC-RJY', type: 'district' },
      { id: 12, name: 'District Court Kakinada', code: 'DC-KKD', type: 'district' },
      { id: 13, name: 'District Court Eluru', code: 'DC-ELR', type: 'district' },
      { id: 14, name: 'District Court Ongole', code: 'DC-OGL', type: 'district' },
      { id: 15, name: 'District Court Srikakulam', code: 'DC-SKM', type: 'district' }
    ];

    const districts = [
      { id: 1, name: 'Anantapur', code: 'ATP', state_code: '2' },
      { id: 2, name: 'Chittoor', code: 'CTR', state_code: '2' },
      { id: 3, name: 'East Godavari', code: 'EG', state_code: '2' },
      { id: 4, name: 'Guntur', code: 'GNT', state_code: '2' },
      { id: 5, name: 'Krishna', code: 'KRS', state_code: '2' },
      { id: 6, name: 'Kurnool', code: 'KNL', state_code: '2' },
      { id: 7, name: 'Nellore', code: 'NLR', state_code: '2' },
      { id: 8, name: 'Prakasam', code: 'PKM', state_code: '2' },
      { id: 9, name: 'Srikakulam', code: 'SKM', state_code: '2' },
      { id: 10, name: 'Visakhapatnam', code: 'VSP', state_code: '2' },
      { id: 11, name: 'Vizianagaram', code: 'VZM', state_code: '2' },
      { id: 12, name: 'West Godavari', code: 'WG', state_code: '2' },
      { id: 13, name: 'YSR Kadapa', code: 'KDP', state_code: '2' },
      { id: 14, name: 'Vijayawada', code: 'VJA', state_code: '2' },
      { id: 15, name: 'Tirupati', code: 'TPT', state_code: '2' },
      { id: 16, name: 'Rajahmundry', code: 'RJY', state_code: '2' },
      { id: 17, name: 'Kakinada', code: 'KKD', state_code: '2' },
      { id: 18, name: 'Eluru', code: 'ELR', state_code: '2' },
      { id: 19, name: 'Ongole', code: 'OGL', state_code: '2' }
    ];

    this.store.set('courts', courts);
    this.store.set('districts', districts);
    log.info('Seeded courts and districts');
  }

  // Case CRUD operations
  getAllCases() {
    const cases = this.store.get('cases', []);
    // Sort by next hearing date, then by created date
    return cases.sort((a, b) => {
      if (a.next_hearing_date && b.next_hearing_date) {
        return new Date(a.next_hearing_date) - new Date(b.next_hearing_date);
      }
      if (a.next_hearing_date) return -1;
      if (b.next_hearing_date) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  getCase(id) {
    const cases = this.store.get('cases', []);
    return cases.find(c => c.id === id);
  }

  addCase(caseData) {
    const cases = this.store.get('cases', []);
    const nextId = this.store.get('nextCaseId', 1);

    const newCase = {
      id: nextId,
      ...caseData,
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString()
    };

    cases.push(newCase);
    this.store.set('cases', cases);
    this.store.set('nextCaseId', nextId + 1);

    log.info('Added new case:', newCase.id, newCase.case_number);
    return newCase;
  }

  updateCase(id, caseData) {
    const cases = this.store.get('cases', []);
    const index = cases.findIndex(c => c.id === id);

    if (index === -1) {
      throw new Error('Case not found');
    }

    cases[index] = {
      ...cases[index],
      ...caseData,
      last_updated: new Date().toISOString()
    };

    this.store.set('cases', cases);
    log.info('Updated case:', id);
    return cases[index];
  }

  deleteCase(id) {
    const cases = this.store.get('cases', []);
    const filtered = cases.filter(c => c.id !== id);
    this.store.set('cases', filtered);
    log.info('Deleted case:', id);
    return { changes: cases.length - filtered.length };
  }

  searchCases(query) {
    const cases = this.store.get('cases', []);
    const searchTerm = query.toLowerCase();

    return cases.filter(c => {
      return (
        (c.case_number && c.case_number.toLowerCase().includes(searchTerm)) ||
        (c.cnr_number && c.cnr_number.toLowerCase().includes(searchTerm)) ||
        (c.petitioner && c.petitioner.toLowerCase().includes(searchTerm)) ||
        (c.respondent && c.respondent.toLowerCase().includes(searchTerm)) ||
        (c.advocate_petitioner && c.advocate_petitioner.toLowerCase().includes(searchTerm)) ||
        (c.notes && c.notes.toLowerCase().includes(searchTerm))
      );
    });
  }

  // Hearings - derived from cases with next_hearing_date
  getUpcomingHearings(days = 30) {
    const cases = this.store.get('cases', []);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return cases
      .filter(c => {
        if (!c.next_hearing_date) return false;
        const hearingDate = new Date(c.next_hearing_date);
        return hearingDate >= now && hearingDate <= futureDate;
      })
      .map(c => ({
        case_id: c.id,
        case_number: c.case_number,
        petitioner: c.petitioner,
        respondent: c.respondent,
        court_name: c.court_name,
        hearing_date: c.next_hearing_date,
        purpose: c.case_stage || 'Hearing'
      }))
      .sort((a, b) => new Date(a.hearing_date) - new Date(b.hearing_date));
  }

  addHearing(hearingData) {
    // Update the case's next hearing date
    if (hearingData.case_id && hearingData.hearing_date) {
      const caseData = this.getCase(hearingData.case_id);
      if (caseData) {
        this.updateCase(hearingData.case_id, {
          next_hearing_date: hearingData.hearing_date
        });
      }
    }
    return hearingData;
  }

  // Orders - stored within cases
  getRecentOrders(days = 30) {
    // In this simplified version, we don't track separate orders
    // Return empty array - orders can be added as a feature later
    return [];
  }

  addOrder(orderData) {
    // In this simplified version, just log it
    log.info('Order noted for case:', orderData.case_id);
    return orderData;
  }

  // Courts and Districts
  getCourts() {
    return this.store.get('courts', []);
  }

  getDistricts() {
    return this.store.get('districts', []);
  }

  // Case statistics
  getCaseStats() {
    const cases = this.store.get('cases', []);
    const stats = {};

    cases.forEach(c => {
      const court = c.court_name || 'Unknown';
      if (!stats[court]) {
        stats[court] = { total_cases: 0, pending: 0, disposed: 0 };
      }
      stats[court].total_cases++;
      if (c.case_status === 'disposed') {
        stats[court].disposed++;
      } else {
        stats[court].pending++;
      }
    });

    return Object.entries(stats).map(([court_name, data]) => ({
      court_name,
      ...data
    }));
  }

  // Update last fetched timestamp
  updateLastFetched(caseId) {
    const caseData = this.getCase(caseId);
    if (caseData) {
      this.updateCase(caseId, { last_fetched: new Date().toISOString() });
    }
  }

  close() {
    // No-op for electron-store (auto-saves)
    log.info('Database session ended');
  }
}

module.exports = CaseDatabase;
