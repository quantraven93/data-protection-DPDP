/**
 * AP Legal Tracker - In-App eCourts Browser
 */

// App State
const state = {
  cases: [],
  selectedCaseId: null,
  isLoading: false,
  currentUrl: null,
  webviewReady: false
};

// DOM Elements
const elements = {
  casesList: document.getElementById('cases-list'),
  caseDetailPanel: document.getElementById('case-detail-panel'),
  searchInput: document.getElementById('search-input'),
  addCaseBtn: document.getElementById('add-case-btn'),
  firstCaseBtn: document.getElementById('first-case-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  caseModal: document.getElementById('case-modal'),
  closeModal: document.getElementById('close-modal'),
  customCaseForm: document.getElementById('custom-case-form'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text'),
  // Browser elements
  ecourtsWebview: document.getElementById('ecourts-webview'),
  browserPlaceholder: document.getElementById('browser-placeholder'),
  browserUrl: document.getElementById('browser-url'),
  browserBack: document.getElementById('browser-back'),
  browserForward: document.getElementById('browser-forward'),
  browserRefresh: document.getElementById('browser-refresh'),
  saveCaseBtn: document.getElementById('save-case-btn'),
  ecourtsBrowserTab: document.getElementById('ecourts-browser-tab')
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  console.log('AP Legal Tracker initializing...');

  setupEventListeners();
  setupModalTabs();
  setupWebview();
  await loadCases();

  console.log('AP Legal Tracker ready');
});

// Event Listeners
function setupEventListeners() {
  // Add Case buttons
  elements.addCaseBtn?.addEventListener('click', openModal);
  elements.firstCaseBtn?.addEventListener('click', openModal);

  // Close modal
  elements.closeModal?.addEventListener('click', closeModal);
  elements.caseModal?.addEventListener('click', (e) => {
    if (e.target === elements.caseModal) closeModal();
  });

  // Search input
  elements.searchInput?.addEventListener('input', debounce(handleSearch, 300));

  // Refresh button
  elements.refreshBtn?.addEventListener('click', loadCases);

  // Form submission
  elements.customCaseForm?.addEventListener('submit', handleCustomCaseSubmit);

  // Court quick links
  document.querySelectorAll('.court-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      if (url) {
        loadEcourtsPage(url);
        // Update active state
        document.querySelectorAll('.court-link-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  // Browser controls
  elements.browserBack?.addEventListener('click', () => {
    if (elements.ecourtsWebview?.canGoBack()) {
      elements.ecourtsWebview.goBack();
    }
  });

  elements.browserForward?.addEventListener('click', () => {
    if (elements.ecourtsWebview?.canGoForward()) {
      elements.ecourtsWebview.goForward();
    }
  });

  elements.browserRefresh?.addEventListener('click', () => {
    elements.ecourtsWebview?.reload();
  });

  // Save case button
  elements.saveCaseBtn?.addEventListener('click', handleSaveCaseFromWebview);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
}

// Setup Webview
function setupWebview() {
  const webview = elements.ecourtsWebview;
  if (!webview) return;

  webview.addEventListener('did-start-loading', () => {
    elements.browserUrl.value = 'Loading...';
    elements.saveCaseBtn.disabled = true;
  });

  webview.addEventListener('did-finish-load', () => {
    state.webviewReady = true;
    state.currentUrl = webview.getURL();
    elements.browserUrl.value = state.currentUrl;

    // Hide placeholder when page loads
    if (elements.browserPlaceholder) {
      elements.browserPlaceholder.classList.add('hidden');
    }

    // Enable save button only on case detail pages
    checkIfCaseDetailPage();
  });

  webview.addEventListener('did-navigate', (e) => {
    state.currentUrl = e.url;
    elements.browserUrl.value = e.url;
    checkIfCaseDetailPage();
  });

  webview.addEventListener('did-navigate-in-page', (e) => {
    state.currentUrl = e.url;
    elements.browserUrl.value = e.url;
    checkIfCaseDetailPage();
  });

  webview.addEventListener('did-fail-load', (e) => {
    if (e.errorCode !== -3) { // -3 is aborted load, ignore
      console.error('Webview load failed:', e.errorDescription);
      elements.browserUrl.value = 'Error loading page';
    }
  });

  // Handle new window requests (open in same webview)
  webview.addEventListener('new-window', (e) => {
    webview.loadURL(e.url);
  });
}

// Load eCourts Page in Webview
function loadEcourtsPage(url) {
  if (!elements.ecourtsWebview) return;

  elements.ecourtsWebview.loadURL(url);
  elements.browserUrl.value = url;

  // Hide placeholder
  if (elements.browserPlaceholder) {
    elements.browserPlaceholder.classList.add('hidden');
  }
}

// Check if current page is a case detail page
function checkIfCaseDetailPage() {
  const url = state.currentUrl || '';

  // Enable save button if we're on a potential case detail page
  const isCaseDetailPage =
    url.includes('case_status') ||
    url.includes('caseStatus') ||
    url.includes('viewDetail') ||
    url.includes('case-status') ||
    url.includes('case_details') ||
    url.includes('display_case') ||
    url.includes('/case/') ||
    url.includes('cino=') ||
    url.includes('cnrno=');

  if (elements.saveCaseBtn) {
    // Always enable - user can try to extract data from any page
    elements.saveCaseBtn.disabled = false;
  }
}

// Handle Save Case from Webview
async function handleSaveCaseFromWebview() {
  if (!elements.ecourtsWebview) return;

  showLoading('Extracting case details...');

  try {
    // Execute JavaScript in the webview to extract case data
    const caseData = await elements.ecourtsWebview.executeJavaScript(`
      (function() {
        // Try to extract case information from the page
        const data = {
          source_url: window.location.href,
          page_title: document.title,
          extracted_text: ''
        };

        // Common selectors for eCourts case details
        const selectors = {
          // High Court selectors
          case_number: ['#case_no', '.case-number', 'td:contains("Case Number") + td', '[data-label="Case Number"]'],
          cnr_number: ['#cnr_no', '.cnr', 'td:contains("CNR") + td', '[data-label="CNR"]'],
          petitioner: ['#petitioner', '.petitioner', 'td:contains("Petitioner") + td', '[data-label="Petitioner"]'],
          respondent: ['#respondent', '.respondent', 'td:contains("Respondent") + td', '[data-label="Respondent"]'],
          filing_date: ['#filing_date', 'td:contains("Filing Date") + td', '[data-label="Filing Date"]'],
          next_hearing: ['#next_date', '.next-hearing', 'td:contains("Next Hearing") + td', '[data-label="Next Date"]'],
          status: ['#case_status', '.case-status', 'td:contains("Status") + td', '[data-label="Status"]'],
          advocate: ['#advocate', '.advocate-name', 'td:contains("Advocate") + td', '[data-label="Advocate"]'],
          court: ['#court_name', '.court-name', 'td:contains("Court") + td'],
          judge: ['#judge', '.judge-name', 'td:contains("Judge") + td'],
          act: ['#act', 'td:contains("Act") + td', '[data-label="Act"]']
        };

        function getText(selectors) {
          for (const sel of selectors) {
            try {
              // Handle jQuery-style :contains
              if (sel.includes(':contains')) {
                const match = sel.match(/td:contains\\("([^"]+)"\\) \\+ td/);
                if (match) {
                  const rows = document.querySelectorAll('tr');
                  for (const row of rows) {
                    const cells = row.querySelectorAll('td, th');
                    for (let i = 0; i < cells.length - 1; i++) {
                      if (cells[i].textContent.toLowerCase().includes(match[1].toLowerCase())) {
                        return cells[i + 1]?.textContent?.trim() || '';
                      }
                    }
                  }
                }
              } else {
                const el = document.querySelector(sel);
                if (el) return el.textContent?.trim() || el.value?.trim() || '';
              }
            } catch (e) {}
          }
          return '';
        }

        // Extract data
        data.case_number = getText(selectors.case_number);
        data.cnr_number = getText(selectors.cnr_number);
        data.petitioner = getText(selectors.petitioner);
        data.respondent = getText(selectors.respondent);
        data.filing_date = getText(selectors.filing_date);
        data.next_hearing = getText(selectors.next_hearing);
        data.status = getText(selectors.status);
        data.advocate = getText(selectors.advocate);
        data.court = getText(selectors.court);
        data.judge = getText(selectors.judge);
        data.act = getText(selectors.act);

        // Get all visible text for manual extraction
        const mainContent = document.querySelector('main, #content, .content, #main, .main, body');
        if (mainContent) {
          data.extracted_text = mainContent.innerText.substring(0, 5000);
        }

        // Try to get case details from table rows
        const tables = document.querySelectorAll('table');
        const tableData = {};
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length >= 2) {
              const key = cells[0]?.textContent?.trim().toLowerCase() || '';
              const value = cells[1]?.textContent?.trim() || '';
              if (key && value && value.length < 500) {
                tableData[key] = value;
              }
            }
          });
        });
        data.table_data = tableData;

        return data;
      })();
    `);

    hideLoading();

    // Process extracted data
    const processedCase = processExtractedData(caseData);

    // Show confirmation dialog with extracted data
    showCaseConfirmationDialog(processedCase);

  } catch (error) {
    hideLoading();
    console.error('Error extracting case data:', error);
    alert('Could not extract case data. Please try the "Manual Entry" tab to add the case manually.');
  }
}

// Process extracted data from webview
function processExtractedData(rawData) {
  const caseData = {
    case_number: '',
    cnr_number: '',
    petitioner: '',
    respondent: '',
    filing_date: '',
    next_hearing_date: '',
    case_status: 'pending',
    advocate_petitioner: '',
    court_name: '',
    judge_name: '',
    act_sections: '',
    source_url: rawData.source_url || ''
  };

  // Direct extractions
  if (rawData.case_number) caseData.case_number = rawData.case_number;
  if (rawData.cnr_number) caseData.cnr_number = rawData.cnr_number;
  if (rawData.petitioner) caseData.petitioner = rawData.petitioner;
  if (rawData.respondent) caseData.respondent = rawData.respondent;
  if (rawData.advocate) caseData.advocate_petitioner = rawData.advocate;
  if (rawData.court) caseData.court_name = rawData.court;
  if (rawData.judge) caseData.judge_name = rawData.judge;
  if (rawData.act) caseData.act_sections = rawData.act;

  // Process dates
  if (rawData.filing_date) {
    caseData.filing_date = parseDate(rawData.filing_date);
  }
  if (rawData.next_hearing) {
    caseData.next_hearing_date = parseDate(rawData.next_hearing);
  }

  // Process status
  if (rawData.status) {
    const statusLower = rawData.status.toLowerCase();
    if (statusLower.includes('disposed') || statusLower.includes('decided')) {
      caseData.case_status = 'disposed';
    } else if (statusLower.includes('pending')) {
      caseData.case_status = 'pending';
    }
  }

  // Try to extract from table_data if direct extraction failed
  const td = rawData.table_data || {};
  for (const [key, value] of Object.entries(td)) {
    if (!caseData.case_number && (key.includes('case no') || key.includes('case number'))) {
      caseData.case_number = value;
    }
    if (!caseData.cnr_number && key.includes('cnr')) {
      caseData.cnr_number = value;
    }
    if (!caseData.petitioner && (key.includes('petitioner') || key.includes('plaintiff') || key.includes('appellant'))) {
      caseData.petitioner = value;
    }
    if (!caseData.respondent && (key.includes('respondent') || key.includes('defendant') || key.includes('opposite party'))) {
      caseData.respondent = value;
    }
    if (!caseData.advocate_petitioner && (key.includes('advocate') || key.includes('counsel') || key.includes('lawyer'))) {
      caseData.advocate_petitioner = value;
    }
    if (!caseData.next_hearing_date && (key.includes('next') || key.includes('hearing date') || key.includes('list date'))) {
      caseData.next_hearing_date = parseDate(value);
    }
    if (!caseData.court_name && (key.includes('court') || key.includes('bench'))) {
      caseData.court_name = value;
    }
  }

  // Determine court from URL
  if (!caseData.court_name) {
    const url = rawData.source_url || '';
    if (url.includes('hcservices')) {
      caseData.court_name = 'High Court of Andhra Pradesh';
    } else if (url.includes('sci.gov.in')) {
      caseData.court_name = 'Supreme Court of India';
    } else if (url.includes('ecourts.gov.in')) {
      caseData.court_name = 'District Court - Andhra Pradesh';
    }
  }

  return caseData;
}

// Parse various date formats
function parseDate(dateStr) {
  if (!dateStr) return '';

  // Try to parse various formats
  const cleanedDate = dateStr.trim().replace(/\s+/g, ' ');

  // Common Indian date formats: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  const patterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,  // DD/MM/YYYY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/,  // YYYY/MM/DD
  ];

  for (const pattern of patterns) {
    const match = cleanedDate.match(pattern);
    if (match) {
      let [_, part1, part2, part3] = match;
      let year, month, day;

      if (part1.length === 4) {
        // YYYY-MM-DD
        year = parseInt(part1);
        month = parseInt(part2);
        day = parseInt(part3);
      } else {
        // DD-MM-YYYY
        day = parseInt(part1);
        month = parseInt(part2);
        year = parseInt(part3);
      }

      if (year > 1900 && year < 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  // Try JavaScript's Date parser as fallback
  const parsed = new Date(cleanedDate);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
    return parsed.toISOString().split('T')[0];
  }

  return '';
}

// Show case confirmation dialog
function showCaseConfirmationDialog(caseData) {
  // Create a simple editable form overlay
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.style.cssText = 'display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.85);';

  overlay.innerHTML = `
    <div style="background: var(--bg-card); border-radius: 16px; padding: 24px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;">
      <h2 style="margin-bottom: 20px; color: var(--text-primary);">Confirm Case Details</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px; font-size: 13px;">
        Review and edit the extracted information before saving:
      </p>

      <div class="form-group">
        <label>Court</label>
        <input type="text" id="confirm-court" class="dark-input" value="${escapeHtml(caseData.court_name)}">
      </div>

      <div class="form-row" style="display: flex; gap: 16px;">
        <div class="form-group" style="flex: 1;">
          <label>Case Number</label>
          <input type="text" id="confirm-case-number" class="dark-input" value="${escapeHtml(caseData.case_number)}">
        </div>
        <div class="form-group" style="flex: 1;">
          <label>CNR Number</label>
          <input type="text" id="confirm-cnr" class="dark-input" value="${escapeHtml(caseData.cnr_number)}">
        </div>
      </div>

      <div class="form-group">
        <label>Petitioner / Plaintiff</label>
        <input type="text" id="confirm-petitioner" class="dark-input" value="${escapeHtml(caseData.petitioner)}">
      </div>

      <div class="form-group">
        <label>Respondent / Defendant</label>
        <input type="text" id="confirm-respondent" class="dark-input" value="${escapeHtml(caseData.respondent)}">
      </div>

      <div class="form-row" style="display: flex; gap: 16px;">
        <div class="form-group" style="flex: 1;">
          <label>Advocate</label>
          <input type="text" id="confirm-advocate" class="dark-input" value="${escapeHtml(caseData.advocate_petitioner)}">
        </div>
        <div class="form-group" style="flex: 1;">
          <label>Next Hearing Date</label>
          <input type="date" id="confirm-next-hearing" class="dark-input" value="${caseData.next_hearing_date}">
        </div>
      </div>

      <div class="form-row" style="display: flex; gap: 16px;">
        <div class="form-group" style="flex: 1;">
          <label>Status</label>
          <select id="confirm-status" class="dark-select">
            <option value="pending" ${caseData.case_status === 'pending' ? 'selected' : ''}>Pending</option>
            <option value="listed" ${caseData.case_status === 'listed' ? 'selected' : ''}>Listed</option>
            <option value="disposed" ${caseData.case_status === 'disposed' ? 'selected' : ''}>Disposed</option>
          </select>
        </div>
        <div class="form-group" style="flex: 1;">
          <label>Judge</label>
          <input type="text" id="confirm-judge" class="dark-input" value="${escapeHtml(caseData.judge_name)}">
        </div>
      </div>

      <div class="form-group">
        <label>Act / Section</label>
        <input type="text" id="confirm-act" class="dark-input" value="${escapeHtml(caseData.act_sections)}">
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button id="confirm-save-btn" class="submit-btn" style="flex: 1;">Save Case</button>
        <button id="confirm-cancel-btn" style="flex: 1; padding: 14px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-primary); cursor: pointer;">Cancel</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Handle save
  overlay.querySelector('#confirm-save-btn').addEventListener('click', async () => {
    const finalCaseData = {
      court_name: overlay.querySelector('#confirm-court').value,
      case_number: overlay.querySelector('#confirm-case-number').value,
      cnr_number: overlay.querySelector('#confirm-cnr').value,
      petitioner: overlay.querySelector('#confirm-petitioner').value,
      respondent: overlay.querySelector('#confirm-respondent').value,
      advocate_petitioner: overlay.querySelector('#confirm-advocate').value,
      next_hearing_date: overlay.querySelector('#confirm-next-hearing').value,
      case_status: overlay.querySelector('#confirm-status').value,
      judge_name: overlay.querySelector('#confirm-judge').value,
      act_sections: overlay.querySelector('#confirm-act').value,
      source_url: caseData.source_url,
      priority: 'normal'
    };

    try {
      if (window.api) {
        await window.api.addCase(finalCaseData);
        document.body.removeChild(overlay);
        closeModal();
        await loadCases();

        // Show success notification
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: var(--accent-green); color: white; padding: 16px 24px; border-radius: 10px; font-weight: 500; z-index: 3000; animation: fadeIn 0.3s ease;';
        successMsg.textContent = 'Case added successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => document.body.removeChild(successMsg), 3000);
      }
    } catch (error) {
      console.error('Error saving case:', error);
      alert('Failed to save case: ' + error.message);
    }
  });

  // Handle cancel
  overlay.querySelector('#confirm-cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });
}

// Escape HTML for safe display
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Modal Tabs
function setupModalTabs() {
  document.querySelectorAll('.modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      // Update tab styles
      document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Show/hide forms
      document.querySelectorAll('.modal-form').forEach(form => form.classList.remove('active'));

      if (tabName === 'custom') {
        elements.customCaseForm?.classList.add('active');
      } else if (tabName === 'ecourts-browser') {
        elements.ecourtsBrowserTab?.classList.add('active');
      }
    });
  });
}

// Load Cases
async function loadCases() {
  try {
    if (window.api) {
      const cases = await window.api.getAllCases();
      state.cases = cases || [];
      renderCasesList();
    }
  } catch (error) {
    console.error('Error loading cases:', error);
  }
}

// Render Cases List
function renderCasesList() {
  if (!elements.casesList) return;

  if (state.cases.length === 0) {
    elements.casesList.innerHTML = `
      <div class="empty-state">
        <p>No cases yet</p>
        <button class="btn btn-primary" onclick="openModal()">+ Add Your First Case</button>
      </div>
    `;
    return;
  }

  elements.casesList.innerHTML = state.cases.map(c => {
    const nextHearing = c.next_hearing_date ? new Date(c.next_hearing_date) : null;
    const day = nextHearing ? nextHearing.getDate() : '--';
    const month = nextHearing ? nextHearing.toLocaleString('en', { month: 'short' }) : '';

    const statusClass = c.case_status === 'disposed' ? 'status-disposed' :
                       nextHearing ? 'status-listed' : 'status-pending';
    const statusText = c.case_status === 'disposed' ? 'DISPOSED' :
                      nextHearing ? 'LISTED' : 'PENDING';

    const title = `${c.petitioner || 'Unknown'} Vs ${c.respondent || 'Unknown'}`;

    return `
      <div class="case-card ${state.selectedCaseId === c.id ? 'selected' : ''}"
           onclick="selectCase(${c.id})" data-id="${c.id}">
        <div class="case-date">
          <span class="case-date-day">${String(day).padStart(2, '0')}</span>
          <span class="case-date-month">${month}</span>
        </div>
        <div class="case-info">
          <div class="case-header">
            <span class="case-status ${statusClass}">● ${statusText}</span>
            <span class="case-number-badge">${c.case_type || ''} ${c.case_number || ''}</span>
          </div>
          <div class="case-title">${title}</div>
          <div class="case-court">${c.court_name || 'Court not specified'}</div>
        </div>
        <div class="case-actions">
          <button class="case-delete-btn" onclick="event.stopPropagation(); deleteCase(${c.id})" title="Delete">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// Select Case
function selectCase(id) {
  state.selectedCaseId = id;
  renderCasesList();
  renderCaseDetail(id);
}

// Render Case Detail
async function renderCaseDetail(id) {
  const panel = elements.caseDetailPanel;
  if (!panel) return;

  const caseData = state.cases.find(c => c.id === id);
  if (!caseData) {
    panel.innerHTML = `
      <div class="detail-placeholder">
        <span class="placeholder-icon">📁</span>
        <p>Select a case to view details</p>
      </div>
    `;
    return;
  }

  const nextHearing = caseData.next_hearing_date ? new Date(caseData.next_hearing_date) : null;
  const nextHearingFormatted = nextHearing ?
    nextHearing.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Not scheduled';

  const statusClass = caseData.case_status === 'disposed' ? 'status-disposed' :
                     nextHearing ? 'status-listed' : 'status-pending';
  const statusText = caseData.case_status === 'disposed' ? 'DISPOSED' :
                    nextHearing ? 'LISTED' : 'PENDING';

  panel.innerHTML = `
    <div class="detail-header">
      <h1 class="detail-title">
        ${caseData.petitioner || 'Unknown'} Vs ${caseData.respondent || 'Unknown'}
        <button class="edit-btn" onclick="editCase(${id})" title="Edit">✏️</button>
      </h1>
      <p class="detail-court">${caseData.court_name || 'Court not specified'}${caseData.district ? ', ' + caseData.district : ''}</p>

      <div class="detail-status-row">
        <span class="detail-status ${statusClass}">● ${statusText}</span>
        <div class="detail-actions">
          <button class="detail-action-btn" onclick="refreshCaseFromEcourts(${id})" title="Open in eCourts">🔗</button>
          <button class="detail-action-btn" title="Share">📤</button>
          <button class="detail-action-btn" onclick="deleteCase(${id})" title="Delete">🗑️</button>
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-row">
          <div class="info-item">
            <div class="info-label">ℹ️ Case No.</div>
            <div class="info-value">${caseData.case_type || ''} ${caseData.case_number || 'N/A'}</div>
            ${caseData.filing_number ? `<div class="info-value" style="font-size: 12px; color: var(--text-muted);">Filing No: ${caseData.filing_number}</div>` : ''}
          </div>
          <div class="info-item">
            <div class="info-label">📊 Stage</div>
            <div class="info-value">${caseData.case_stage || caseData.case_type || 'N/A'}</div>
          </div>
        </div>
      </div>

      <div class="next-hearing-card">
        <div class="next-hearing-label">📅 Next Hearing</div>
        <div class="next-hearing-date">${nextHearingFormatted}</div>
        ${nextHearing ? `<a href="#" class="next-hearing-link">From Civil Cause List →</a>` : ''}
      </div>

      <div class="info-card">
        <div class="info-row">
          <div class="info-item">
            <div class="info-label">📄 Section</div>
            <div class="info-value">${caseData.act_sections?.split(' ')[0] || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">📚 Act</div>
            <div class="info-value">${caseData.act_sections || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label"># CNR No.</div>
            <div class="info-value highlight">${caseData.cnr_number || 'N/A'}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="advocates-grid">
      <div class="advocate-card">
        <div class="advocate-header">
          <span class="advocate-title">Advocate</span>
          <span class="advocate-count">${caseData.advocate_petitioner ? '1' : '0'}</span>
        </div>
        ${caseData.advocate_petitioner ? `
          <div class="advocate-item">
            <span class="advocate-icon">👤</span>
            <span class="advocate-name">${caseData.advocate_petitioner}</span>
          </div>
        ` : '<p style="color: var(--text-muted); font-size: 13px;">No advocate listed</p>'}
        ${caseData.advocate_respondent ? `
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Vs.</div>
            <div class="advocate-item">
              <span class="advocate-icon">👤</span>
              <span class="advocate-name">${caseData.advocate_respondent}</span>
            </div>
          </div>
        ` : ''}
      </div>

      <div class="advocate-card">
        <div class="advocate-header">
          <span class="advocate-title">Hearing Advocate</span>
          <span class="advocate-count">${caseData.advocate_petitioner ? '1' : '0'}</span>
        </div>
        ${caseData.advocate_petitioner ? `
          <div class="advocate-item">
            <span class="advocate-icon">👤</span>
            <span class="advocate-name">${caseData.advocate_petitioner}</span>
          </div>
        ` : '<p style="color: var(--text-muted); font-size: 13px;">No hearing advocate</p>'}
      </div>

      <div class="advocate-card">
        <div class="advocate-header">
          <span class="advocate-title">Hearing Judges</span>
          <span class="advocate-count">${caseData.judge_name ? '1' : '0'}</span>
        </div>
        ${caseData.judge_name ? `
          <div class="advocate-item">
            <span class="advocate-icon">👤</span>
            <span class="advocate-name">${caseData.judge_name}</span>
          </div>
        ` : '<p style="color: var(--text-muted); font-size: 13px;">No judge assigned</p>'}
      </div>
    </div>

    ${caseData.notes ? `
      <div class="info-card full-width">
        <div class="info-label">📝 Notes</div>
        <div class="info-value">${caseData.notes}</div>
      </div>
    ` : ''}

    ${caseData.source_url ? `
      <div class="info-card full-width">
        <div class="info-label">🔗 Source</div>
        <div class="info-value" style="font-size: 12px; word-break: break-all;">${caseData.source_url}</div>
      </div>
    ` : ''}
  `;
}

// Modal Functions
function openModal() {
  elements.caseModal?.classList.add('active');
  // Reset to first tab (eCourts browser)
  document.querySelectorAll('.modal-tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0);
  });
  document.querySelectorAll('.modal-form').forEach((f, i) => {
    f.classList.toggle('active', i === 0);
  });

  // Reset browser placeholder
  if (elements.browserPlaceholder && !state.currentUrl) {
    elements.browserPlaceholder.classList.remove('hidden');
  }
}

function closeModal() {
  elements.caseModal?.classList.remove('active');
  elements.customCaseForm?.reset();
}

// Handle Custom Case Submit
async function handleCustomCaseSubmit(e) {
  e.preventDefault();

  const caseData = {
    court_name: document.getElementById('case-court')?.value,
    case_number: document.getElementById('case-number')?.value,
    case_type: document.getElementById('case-type')?.value,
    case_year: document.getElementById('case-year')?.value ? parseInt(document.getElementById('case-year').value) : null,
    petitioner: document.getElementById('petitioner')?.value,
    respondent: document.getElementById('respondent')?.value,
    advocate_petitioner: document.getElementById('advocate-petitioner')?.value,
    advocate_respondent: document.getElementById('advocate-respondent')?.value,
    next_hearing_date: document.getElementById('next-hearing')?.value,
    cnr_number: document.getElementById('cnr-number')?.value,
    case_status: document.getElementById('case-status')?.value || 'pending',
    case_stage: document.getElementById('case-stage')?.value,
    act_sections: document.getElementById('act-sections')?.value,
    notes: document.getElementById('case-notes')?.value,
    priority: 'normal'
  };

  try {
    if (window.api) {
      await window.api.addCase(caseData);
      closeModal();
      await loadCases();

      // Show success notification
      const successMsg = document.createElement('div');
      successMsg.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: var(--accent-green); color: white; padding: 16px 24px; border-radius: 10px; font-weight: 500; z-index: 3000;';
      successMsg.textContent = 'Case added successfully!';
      document.body.appendChild(successMsg);
      setTimeout(() => document.body.removeChild(successMsg), 3000);
    }
  } catch (error) {
    console.error('Error adding case:', error);
    alert('Failed to add case: ' + error.message);
  }
}

// Delete Case
async function deleteCase(id) {
  if (!confirm('Are you sure you want to delete this case?')) return;

  try {
    if (window.api) {
      await window.api.deleteCase(id);
      if (state.selectedCaseId === id) {
        state.selectedCaseId = null;
        elements.caseDetailPanel.innerHTML = `
          <div class="detail-placeholder">
            <span class="placeholder-icon">📁</span>
            <p>Select a case to view details</p>
          </div>
        `;
      }
      await loadCases();
    }
  } catch (error) {
    console.error('Error deleting case:', error);
  }
}

// Open case in eCourts (in modal browser)
function refreshCaseFromEcourts(id) {
  const caseData = state.cases.find(c => c.id === id);
  if (!caseData) return;

  // Open modal with browser tab
  openModal();

  // Determine which eCourts URL to open based on court
  let url = '';
  const court = caseData.court_name?.toLowerCase() || '';

  if (court.includes('high court') || court.includes('hc')) {
    url = 'https://hcservices.ecourts.gov.in/hcservices/main.php';
  } else if (court.includes('supreme court')) {
    url = 'https://main.sci.gov.in/case-status';
  } else {
    url = 'https://services.ecourts.gov.in/ecourtindia_v6/';
  }

  loadEcourtsPage(url);
}

// Edit Case (placeholder)
function editCase(id) {
  alert('Edit functionality coming soon!');
}

// Search
async function handleSearch() {
  const query = elements.searchInput?.value?.trim();

  if (!query) {
    await loadCases();
    return;
  }

  try {
    if (window.api) {
      const results = await window.api.searchCases(query);
      state.cases = results || [];
      renderCasesList();
    }
  } catch (error) {
    console.error('Error searching:', error);
  }
}

// Loading
function showLoading(message = 'Loading...') {
  if (elements.loadingText) elements.loadingText.textContent = message;
  elements.loadingOverlay?.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay?.classList.add('hidden');
  if (elements.loadingText) elements.loadingText.textContent = 'Loading...';
}

// Utility
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Global functions for onclick
window.openModal = openModal;
window.selectCase = selectCase;
window.deleteCase = deleteCase;
window.refreshCaseFromEcourts = refreshCaseFromEcourts;
window.editCase = editCase;
