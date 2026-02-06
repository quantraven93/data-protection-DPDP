/**
 * AP Legal Tracker - Mercury Lawyer Style Interface
 */

// App State
const state = {
  cases: [],
  selectedCaseId: null,
  isLoading: false
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
  caseNumberForm: document.getElementById('case-number-form'),
  partyNameForm: document.getElementById('party-name-form'),
  advocateForm: document.getElementById('advocate-form'),
  customCaseForm: document.getElementById('custom-case-form'),
  loadingOverlay: document.getElementById('loading-overlay'),
  loadingText: document.getElementById('loading-text')
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
  console.log('AP Legal Tracker initializing...');

  setupEventListeners();
  setupModalTabs();
  populateYearDropdown();
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

  // Form submissions
  elements.caseNumberForm?.addEventListener('submit', handleCaseNumberSubmit);
  elements.partyNameForm?.addEventListener('submit', handlePartyNameSubmit);
  elements.advocateForm?.addEventListener('submit', handleAdvocateSubmit);
  elements.customCaseForm?.addEventListener('submit', handleCustomCaseSubmit);

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
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

      if (tabName === 'case-number') {
        elements.caseNumberForm?.classList.add('active');
      } else if (tabName === 'party-name') {
        elements.partyNameForm?.classList.add('active');
      } else if (tabName === 'advocate') {
        elements.advocateForm?.classList.add('active');
      } else if (tabName === 'custom') {
        elements.customCaseForm?.classList.add('active');
      }
    });
  });
}

// Populate Year Dropdown
function populateYearDropdown() {
  const yearSelect = document.getElementById('hearing-case-year');
  if (!yearSelect) return;

  const currentYear = new Date().getFullYear();
  yearSelect.innerHTML = '';

  for (let year = currentYear; year >= 1990; year--) {
    const option = document.createElement('option');
    option.value = year;
    option.textContent = year;
    if (year === currentYear) option.selected = true;
    yearSelect.appendChild(option);
  }
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
function renderCaseDetail(id) {
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
      <p class="detail-court">${caseData.court_name || 'Court not specified'}</p>

      <div class="detail-status-row">
        <span class="detail-status ${statusClass}">● ${statusText}</span>
        <div class="detail-actions">
          <button class="detail-action-btn" title="Share">📤</button>
          <button class="detail-action-btn" title="Link">🔗</button>
          <button class="detail-action-btn" onclick="deleteCase(${id})" title="Delete">🗑️</button>
        </div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-card">
        <div class="info-row">
          <div class="info-item">
            <div class="info-label">ℹ️ Case No.</div>
            <div class="info-value">${caseData.case_type || ''} ${caseData.case_number || 'N/A'}/${caseData.case_year || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">📊 Status</div>
            <div class="info-value">${statusText}</div>
          </div>
        </div>
      </div>

      <div class="next-hearing-card">
        <div class="next-hearing-label">📅 Next Hearing</div>
        <div class="next-hearing-date">${nextHearingFormatted}</div>
      </div>

      <div class="info-card">
        <div class="info-row">
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
          <span class="advocate-title">Petitioner</span>
        </div>
        <div class="advocate-item">
          <span class="advocate-icon">👤</span>
          <span class="advocate-name">${caseData.petitioner || 'N/A'}</span>
        </div>
      </div>

      <div class="advocate-card">
        <div class="advocate-header">
          <span class="advocate-title">Respondent</span>
        </div>
        <div class="advocate-item">
          <span class="advocate-icon">👤</span>
          <span class="advocate-name">${caseData.respondent || 'N/A'}</span>
        </div>
      </div>

      <div class="advocate-card">
        <div class="advocate-header">
          <span class="advocate-title">Advocate</span>
        </div>
        ${caseData.advocate_petitioner ? `
          <div class="advocate-item">
            <span class="advocate-icon">👤</span>
            <span class="advocate-name">${caseData.advocate_petitioner}</span>
          </div>
        ` : '<p style="color: var(--text-muted); font-size: 13px;">Not specified</p>'}
      </div>
    </div>
  `;
}

// Modal Functions
function openModal() {
  elements.caseModal?.classList.add('active');
  // Reset to first tab
  document.querySelectorAll('.modal-tab').forEach((t, i) => {
    t.classList.toggle('active', i === 0);
  });
  document.querySelectorAll('.modal-form').forEach((f, i) => {
    f.classList.toggle('active', i === 0);
  });
}

function closeModal() {
  elements.caseModal?.classList.remove('active');
  elements.caseNumberForm?.reset();
  elements.customCaseForm?.reset();
}

// Handle By Case Number Submit - Add case directly
async function handleCaseNumberSubmit(e) {
  e.preventDefault();

  const court = document.getElementById('hearing-court')?.value;
  const caseType = document.getElementById('hearing-case-type')?.value;
  const caseNumber = document.getElementById('hearing-case-number')?.value;
  const caseYear = document.getElementById('hearing-case-year')?.value;

  if (!court || !caseType || !caseNumber || !caseYear) {
    alert('Please fill all fields');
    return;
  }

  const caseData = {
    court_name: court,
    case_type: caseType,
    case_number: caseNumber,
    case_year: parseInt(caseYear),
    petitioner: 'To be updated',
    respondent: 'To be updated',
    case_status: 'pending',
    priority: 'normal'
  };

  try {
    if (window.api) {
      await window.api.addCase(caseData);
      closeModal();
      await loadCases();
      showNotification('Case added! Update party details from the case view.');
    }
  } catch (error) {
    console.error('Error adding case:', error);
    alert('Failed to add case: ' + error.message);
  }
}

// Handle Party Name Submit
async function handlePartyNameSubmit(e) {
  e.preventDefault();
  alert('Party name search will open eCourts website. Feature coming soon!');
}

// Handle Advocate Submit
async function handleAdvocateSubmit(e) {
  e.preventDefault();
  alert('Advocate search will open eCourts website. Feature coming soon!');
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
    next_hearing_date: document.getElementById('next-hearing')?.value,
    cnr_number: document.getElementById('cnr-number')?.value,
    case_status: 'pending',
    priority: 'normal'
  };

  try {
    if (window.api) {
      await window.api.addCase(caseData);
      closeModal();
      await loadCases();
      showNotification('Case added successfully!');
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

// Edit Case
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

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: var(--accent-green); color: white; padding: 16px 24px; border-radius: 10px; font-weight: 500; z-index: 3000;';
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => document.body.removeChild(notification), 3000);
}

// Loading
function showLoading(message = 'Loading...') {
  if (elements.loadingText) elements.loadingText.textContent = message;
  elements.loadingOverlay?.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay?.classList.add('hidden');
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
window.editCase = editCase;
