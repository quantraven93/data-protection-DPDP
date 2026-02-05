const Database = require('better-sqlite3');
const path = require('path');
const log = require('electron-log');

class CaseDatabase {
  constructor(userDataPath) {
    this.dbPath = path.join(userDataPath, 'ap-legal-tracker.db');
    this.db = null;
  }

  async initialize() {
    log.info('Initializing database at:', this.dbPath);

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.createTables();
    this.seedCourtsAndDistricts();

    log.info('Database initialized successfully');
  }

  createTables() {
    // Courts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS courts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        type TEXT NOT NULL, -- 'supreme', 'high', 'district', 'tribunal'
        state_code TEXT,
        district_code TEXT,
        base_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Districts table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS districts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        state_code TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Cases table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnr_number TEXT UNIQUE,
        case_number TEXT NOT NULL,
        case_type TEXT,
        case_year INTEGER,
        court_id INTEGER,
        court_name TEXT,
        district TEXT,
        petitioner TEXT,
        respondent TEXT,
        advocate_petitioner TEXT,
        advocate_respondent TEXT,
        filing_date TEXT,
        registration_date TEXT,
        first_hearing_date TEXT,
        next_hearing_date TEXT,
        case_stage TEXT,
        case_status TEXT, -- 'pending', 'disposed', 'transferred'
        disposal_date TEXT,
        disposal_nature TEXT,
        judge_name TEXT,
        act_sections TEXT,
        case_category TEXT,
        priority TEXT DEFAULT 'normal', -- 'high', 'normal', 'low'
        notes TEXT,
        tags TEXT, -- JSON array of tags
        last_updated DATETIME,
        last_fetched DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (court_id) REFERENCES courts (id)
      )
    `);

    // Case history/proceedings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS proceedings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        hearing_date TEXT,
        purpose TEXT,
        judge_name TEXT,
        business_date TEXT,
        next_date TEXT,
        next_purpose TEXT,
        order_remarks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
      )
    `);

    // Orders/Judgments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        order_date TEXT NOT NULL,
        order_type TEXT, -- 'interim', 'final', 'judgment'
        order_number TEXT,
        judge_name TEXT,
        order_text TEXT,
        order_url TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
      )
    `);

    // Hearings/Calendar table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hearings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        hearing_date TEXT NOT NULL,
        hearing_time TEXT,
        purpose TEXT,
        court_room TEXT,
        judge_name TEXT,
        reminder_sent INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
      )
    `);

    // Documents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        case_id INTEGER NOT NULL,
        document_type TEXT,
        document_name TEXT,
        file_path TEXT,
        url TEXT,
        upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (case_id) REFERENCES cases (id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cases_cnr ON cases(cnr_number);
      CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(case_number);
      CREATE INDEX IF NOT EXISTS idx_cases_court ON cases(court_id);
      CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(case_status);
      CREATE INDEX IF NOT EXISTS idx_cases_next_hearing ON cases(next_hearing_date);
      CREATE INDEX IF NOT EXISTS idx_hearings_date ON hearings(hearing_date);
      CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_proceedings_case ON proceedings(case_id);
    `);

    log.info('Database tables created');
  }

  seedCourtsAndDistricts() {
    // Check if already seeded
    const courtCount = this.db.prepare('SELECT COUNT(*) as count FROM courts').get();
    if (courtCount.count > 0) return;

    // Seed courts
    const insertCourt = this.db.prepare(`
      INSERT INTO courts (name, code, type, state_code, district_code, base_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const courts = [
      ['Supreme Court of India', 'SCI', 'supreme', null, null, 'https://www.sci.gov.in'],
      ['High Court of Andhra Pradesh', 'HCAP', 'high', '2', '1', 'https://hcservices.ecourts.gov.in/ecourtindiaHC/index_highcourt.php?state_cd=2&dist_cd=1'],
      ['District Court Vijayawada', 'DC-VJA', 'district', '2', '13', 'https://services.ecourts.gov.in'],
      ['District Court Guntur', 'DC-GNT', 'district', '2', '7', 'https://services.ecourts.gov.in'],
      ['District Court Visakhapatnam', 'DC-VSP', 'district', '2', '24', 'https://services.ecourts.gov.in'],
      ['District Court Tirupati', 'DC-TPT', 'district', '2', '6', 'https://services.ecourts.gov.in'],
      ['District Court Nellore', 'DC-NLR', 'district', '2', '20', 'https://services.ecourts.gov.in'],
      ['District Court Kurnool', 'DC-KNL', 'district', '2', '10', 'https://services.ecourts.gov.in'],
      ['District Court Anantapur', 'DC-ATP', 'district', '2', '1', 'https://services.ecourts.gov.in'],
      ['District Court Kadapa', 'DC-KDP', 'district', '2', '25', 'https://services.ecourts.gov.in'],
      ['District Court Rajahmundry', 'DC-RJY', 'district', '2', '5', 'https://services.ecourts.gov.in'],
      ['District Court Kakinada', 'DC-KKD', 'district', '2', '5', 'https://services.ecourts.gov.in'],
      ['District Court Eluru', 'DC-ELR', 'district', '2', '26', 'https://services.ecourts.gov.in'],
      ['District Court Ongole', 'DC-OGL', 'district', '2', '18', 'https://services.ecourts.gov.in'],
      ['District Court Srikakulam', 'DC-SKM', 'district', '2', '21', 'https://services.ecourts.gov.in'],
      ['District Court Vizianagaram', 'DC-VZM', 'district', '2', '23', 'https://services.ecourts.gov.in']
    ];

    const insertMany = this.db.transaction((courts) => {
      for (const court of courts) {
        insertCourt.run(...court);
      }
    });
    insertMany(courts);

    // Seed districts
    const insertDistrict = this.db.prepare(`
      INSERT INTO districts (name, code, state_code)
      VALUES (?, ?, ?)
    `);

    const districts = [
      ['Anantapur', 'ATP', '2'],
      ['Chittoor', 'CTR', '2'],
      ['East Godavari', 'EG', '2'],
      ['Guntur', 'GNT', '2'],
      ['Krishna', 'KRS', '2'],
      ['Kurnool', 'KNL', '2'],
      ['Nellore', 'NLR', '2'],
      ['Prakasam', 'PKM', '2'],
      ['Srikakulam', 'SKM', '2'],
      ['Visakhapatnam', 'VSP', '2'],
      ['Vizianagaram', 'VZM', '2'],
      ['West Godavari', 'WG', '2'],
      ['YSR Kadapa', 'KDP', '2'],
      ['Palnadu', 'PLN', '2'],
      ['Bapatla', 'BPT', '2'],
      ['Eluru', 'ELR', '2'],
      ['NTR', 'NTR', '2'],
      ['Kakinada', 'KKD', '2'],
      ['Konaseema', 'KNS', '2'],
      ['Anakapalli', 'AKP', '2'],
      ['Alluri Sitharama Raju', 'ASR', '2'],
      ['Parvathipuram Manyam', 'PVM', '2'],
      ['Sri Sathya Sai', 'SSS', '2'],
      ['Annamayya', 'AMY', '2'],
      ['Tirupati', 'TPT', '2'],
      ['Nandyal', 'NDL', '2']
    ];

    const insertDistrictsMany = this.db.transaction((districts) => {
      for (const district of districts) {
        insertDistrict.run(...district);
      }
    });
    insertDistrictsMany(districts);

    log.info('Seeded courts and districts');
  }

  // Case CRUD operations
  getAllCases() {
    return this.db.prepare(`
      SELECT c.*, co.name as court_full_name
      FROM cases c
      LEFT JOIN courts co ON c.court_id = co.id
      ORDER BY c.next_hearing_date ASC, c.created_at DESC
    `).all();
  }

  getCase(id) {
    return this.db.prepare(`
      SELECT c.*, co.name as court_full_name
      FROM cases c
      LEFT JOIN courts co ON c.court_id = co.id
      WHERE c.id = ?
    `).get(id);
  }

  addCase(caseData) {
    const stmt = this.db.prepare(`
      INSERT INTO cases (
        cnr_number, case_number, case_type, case_year, court_id, court_name,
        district, petitioner, respondent, advocate_petitioner, advocate_respondent,
        filing_date, registration_date, first_hearing_date, next_hearing_date,
        case_stage, case_status, judge_name, act_sections, case_category,
        priority, notes, tags, last_updated
      ) VALUES (
        @cnr_number, @case_number, @case_type, @case_year, @court_id, @court_name,
        @district, @petitioner, @respondent, @advocate_petitioner, @advocate_respondent,
        @filing_date, @registration_date, @first_hearing_date, @next_hearing_date,
        @case_stage, @case_status, @judge_name, @act_sections, @case_category,
        @priority, @notes, @tags, datetime('now')
      )
    `);

    const result = stmt.run(caseData);
    return { id: result.lastInsertRowid, ...caseData };
  }

  updateCase(id, caseData) {
    const stmt = this.db.prepare(`
      UPDATE cases SET
        cnr_number = @cnr_number,
        case_number = @case_number,
        case_type = @case_type,
        case_year = @case_year,
        court_id = @court_id,
        court_name = @court_name,
        district = @district,
        petitioner = @petitioner,
        respondent = @respondent,
        advocate_petitioner = @advocate_petitioner,
        advocate_respondent = @advocate_respondent,
        filing_date = @filing_date,
        registration_date = @registration_date,
        first_hearing_date = @first_hearing_date,
        next_hearing_date = @next_hearing_date,
        case_stage = @case_stage,
        case_status = @case_status,
        disposal_date = @disposal_date,
        disposal_nature = @disposal_nature,
        judge_name = @judge_name,
        act_sections = @act_sections,
        case_category = @case_category,
        priority = @priority,
        notes = @notes,
        tags = @tags,
        last_updated = datetime('now')
      WHERE id = @id
    `);

    stmt.run({ id, ...caseData });
    return this.getCase(id);
  }

  deleteCase(id) {
    return this.db.prepare('DELETE FROM cases WHERE id = ?').run(id);
  }

  searchCases(query) {
    const searchTerm = `%${query}%`;
    return this.db.prepare(`
      SELECT c.*, co.name as court_full_name
      FROM cases c
      LEFT JOIN courts co ON c.court_id = co.id
      WHERE c.case_number LIKE ?
        OR c.cnr_number LIKE ?
        OR c.petitioner LIKE ?
        OR c.respondent LIKE ?
        OR c.advocate_petitioner LIKE ?
        OR c.notes LIKE ?
      ORDER BY c.next_hearing_date ASC
    `).all(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  // Proceedings
  addProceeding(proceedingData) {
    const stmt = this.db.prepare(`
      INSERT INTO proceedings (
        case_id, hearing_date, purpose, judge_name, business_date,
        next_date, next_purpose, order_remarks
      ) VALUES (
        @case_id, @hearing_date, @purpose, @judge_name, @business_date,
        @next_date, @next_purpose, @order_remarks
      )
    `);
    return stmt.run(proceedingData);
  }

  getCaseProceedings(caseId) {
    return this.db.prepare(`
      SELECT * FROM proceedings
      WHERE case_id = ?
      ORDER BY hearing_date DESC
    `).all(caseId);
  }

  // Hearings
  getUpcomingHearings(days = 30) {
    return this.db.prepare(`
      SELECT h.*, c.case_number, c.petitioner, c.respondent, c.court_name
      FROM hearings h
      JOIN cases c ON h.case_id = c.id
      WHERE h.hearing_date >= date('now')
        AND h.hearing_date <= date('now', '+' || ? || ' days')
      ORDER BY h.hearing_date ASC
    `).all(days);
  }

  addHearing(hearingData) {
    const stmt = this.db.prepare(`
      INSERT INTO hearings (
        case_id, hearing_date, hearing_time, purpose, court_room, judge_name, notes
      ) VALUES (
        @case_id, @hearing_date, @hearing_time, @purpose, @court_room, @judge_name, @notes
      )
    `);
    return stmt.run(hearingData);
  }

  // Orders
  getRecentOrders(days = 30) {
    return this.db.prepare(`
      SELECT o.*, c.case_number, c.petitioner, c.respondent, c.court_name
      FROM orders o
      JOIN cases c ON o.case_id = c.id
      WHERE o.order_date >= date('now', '-' || ? || ' days')
      ORDER BY o.order_date DESC
    `).all(days);
  }

  addOrder(orderData) {
    const stmt = this.db.prepare(`
      INSERT INTO orders (
        case_id, order_date, order_type, order_number, judge_name, order_text, order_url
      ) VALUES (
        @case_id, @order_date, @order_type, @order_number, @judge_name, @order_text, @order_url
      )
    `);
    return stmt.run(orderData);
  }

  // Courts and Districts
  getCourts() {
    return this.db.prepare('SELECT * FROM courts ORDER BY type, name').all();
  }

  getDistricts() {
    return this.db.prepare('SELECT * FROM districts ORDER BY name').all();
  }

  // Pending cases count by court
  getCaseStats() {
    return this.db.prepare(`
      SELECT
        court_name,
        COUNT(*) as total_cases,
        SUM(CASE WHEN case_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN case_status = 'disposed' THEN 1 ELSE 0 END) as disposed
      FROM cases
      GROUP BY court_name
    `).all();
  }

  // Update last fetched timestamp
  updateLastFetched(caseId) {
    return this.db.prepare(`
      UPDATE cases SET last_fetched = datetime('now') WHERE id = ?
    `).run(caseId);
  }

  close() {
    if (this.db) {
      this.db.close();
      log.info('Database closed');
    }
  }
}

module.exports = CaseDatabase;
