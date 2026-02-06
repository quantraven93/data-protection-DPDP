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
  searchCaseForm: document.getElementById('search-case-form'),
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
  await populateDistrictOptions();
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

  // Court selection change
  document.getElementById('search-court')?.addEventListener('change', handleCourtChange);

  // Form submissions
  elements.searchCaseForm?.addEventListener('submit', handleEcourtsSearch);
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

      if (tabName === 'custom') {
        elements.customCaseForm?.classList.add('active');
      } else {
        elements.searchCaseForm?.classList.add('active');
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
          <button class="detail-action-btn" onclick="refreshCase(${id})" title="Refresh from eCourts">🔄</button>
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
  elements.searchCaseForm?.reset();
  elements.customCaseForm?.reset();
}

// Populate Year Dropdown
function populateYearDropdown() {
  const yearSelect = document.getElementById('search-case-year');
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

// Populate Districts
async function populateDistrictOptions() {
  const districtSelect = document.getElementById('search-district');
  const districtGroup = document.getElementById('district-court-options');

  if (!window.api) return;

  try {
    const districts = await window.api.getAPDistricts();

    if (districtSelect) {
      districtSelect.innerHTML = '<option value="">Select District</option>';
      districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtSelect.appendChild(option);
      });
    }

    if (districtGroup) {
      districtGroup.innerHTML = '';
      districts.forEach(district => {
        const option = document.createElement('option');
        option.value = `District Court ${district}`;
        option.textContent = `District Court ${district}`;
        districtGroup.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading districts:', error);
  }
}

// Handle Court Change
async function handleCourtChange() {
  const court = document.getElementById('search-court')?.value || '';
  const caseTypeSelect = document.getElementById('search-case-type');
  const districtGroup = document.getElementById('district-group');

  // Show/hide district dropdown
  const isDistrictCourt = court.includes('District Court');
  if (districtGroup) {
    districtGroup.style.display = isDistrictCourt ? 'block' : 'none';
  }

  // Update case types
  if (window.api && caseTypeSelect) {
    try {
      let courtType = 'district';
      if (court.includes('High Court')) courtType = 'high';
      else if (court.includes('Supreme Court')) courtType = 'supreme';

      const caseTypes = await window.api.getCaseTypes(courtType);
      caseTypeSelect.innerHTML = '<option value="">Select Case Type</option>';
      caseTypes.forEach(ct => {
        const option = document.createElement('option');
        option.value = ct.code;
        option.textContent = ct.name;
        caseTypeSelect.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading case types:', error);
    }
  }
}

// Handle eCourts Search
async function handleEcourtsSearch(e) {
  e.preventDefault();

  const court = document.getElementById('search-court')?.value;
  const caseType = document.getElementById('search-case-type')?.value;
  const caseNumber = document.getElementById('search-case-number')?.value;
  const caseYear = document.getElementById('search-case-year')?.value;
  const district = document.getElementById('search-district')?.value;

  if (!court || !caseType || !caseNumber || !caseYear) {
    alert('Please fill all required fields');
    return;
  }

  showLoading('Opening eCourts portal... Please solve the CAPTCHA when it appears.');
  closeModal();

  try {
    const result = await window.api.searchEcourts({
      court,
      caseType,
      caseNumber,
      caseYear,
      district: court.includes('District') ? district : null
    });

    hideLoading();

    if (result.success && result.data) {
      const caseData = result.data;
      const confirmAdd = confirm(
        `Case Found!\n\n` +
        `Case: ${caseData.case_number || caseNumber}\n` +
        `Petitioner: ${caseData.petitioner || 'N/A'}\n` +
        `Respondent: ${caseData.respondent || 'N/A'}\n` +
        `Status: ${caseData.case_status || 'Pending'}\n` +
        `Next Hearing: ${caseData.next_hearing_date || 'N/A'}\n\n` +
        `Add this case to your tracker?`
      );

      if (confirmAdd) {
        await window.api.addCase({
          ...caseData,
          case_type: caseType,
          case_year: parseInt(caseYear),
          priority: 'normal'
        });

        await loadCases();
        alert('Case added successfully!');
      }
    } else {
      alert(result.error || 'Case not found');
    }

    await window.api.closeBrowser();
  } catch (error) {
    hideLoading();
    console.error('eCourts search error:', error);
    alert('Search failed: ' + error.message);
    try { await window.api.closeBrowser(); } catch (e) {}
  }
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
    act_sections: document.getElementById('act-sections')?.value,
    notes: document.getElementById('case-notes')?.value,
    case_status: 'pending',
    priority: 'normal'
  };

  try {
    if (window.api) {
      await window.api.addCase(caseData);
      closeModal();
      await loadCases();
      alert('Case added successfully!');
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

// Refresh Case
async function refreshCase(id) {
  showLoading('Refreshing case from eCourts...');

  try {
    const caseData = state.cases.find(c => c.id === id);
    if (caseData && window.api) {
      const result = await window.api.fetchCaseStatus(caseData);
      hideLoading();

      if (result.success) {
        await loadCases();
        renderCaseDetail(id);
        alert('Case refreshed successfully!');
      } else {
        alert('Could not refresh: ' + (result.error || 'Unknown error'));
      }
    }
  } catch (error) {
    hideLoading();
    console.error('Error refreshing case:', error);
  }
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
window.refreshCase = refreshCase;
window.editCase = editCase;
