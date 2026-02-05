const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('api', {
  // Case management
  getAllCases: () => ipcRenderer.invoke('get-all-cases'),
  getCase: (id) => ipcRenderer.invoke('get-case', id),
  addCase: (caseData) => ipcRenderer.invoke('add-case', caseData),
  updateCase: (id, caseData) => ipcRenderer.invoke('update-case', id, caseData),
  deleteCase: (id) => ipcRenderer.invoke('delete-case', id),
  searchCases: (query) => ipcRenderer.invoke('search-cases', query),

  // Case status fetching from eCourts
  fetchCaseStatus: (caseData) => ipcRenderer.invoke('fetch-case-status', caseData),
  fetchCaseOrders: (caseData) => ipcRenderer.invoke('fetch-case-orders', caseData),

  // eCourts Search - Auto fetch like Mercury Lawyer
  searchEcourts: (searchParams) => ipcRenderer.invoke('search-ecourts', searchParams),
  searchByCNR: (cnrNumber) => ipcRenderer.invoke('search-by-cnr', cnrNumber),
  getCaseTypes: (courtType) => ipcRenderer.invoke('get-case-types', courtType),
  getAPDistricts: () => ipcRenderer.invoke('get-ap-districts'),
  closeBrowser: () => ipcRenderer.invoke('close-browser'),

  // Hearings
  getUpcomingHearings: () => ipcRenderer.invoke('get-upcoming-hearings'),
  addHearing: (hearingData) => ipcRenderer.invoke('add-hearing', hearingData),

  // Orders
  getRecentOrders: () => ipcRenderer.invoke('get-recent-orders'),
  addOrder: (orderData) => ipcRenderer.invoke('add-order', orderData),

  // Court data
  getCourts: () => ipcRenderer.invoke('get-courts'),
  getDistricts: () => ipcRenderer.invoke('get-districts'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  // Notifications
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Event listeners for main process messages
  onAddCase: (callback) => ipcRenderer.on('add-case', callback),
  onViewDashboard: (callback) => ipcRenderer.on('view-dashboard', callback),
  onViewCases: (callback) => ipcRenderer.on('view-cases', callback),
  onViewHearings: (callback) => ipcRenderer.on('view-hearings', callback),
  onViewOrders: (callback) => ipcRenderer.on('view-orders', callback),
  onRefreshStart: (callback) => ipcRenderer.on('refresh-start', callback),
  onRefreshComplete: (callback) => ipcRenderer.on('refresh-complete', callback),
  onRefreshError: (callback) => ipcRenderer.on('refresh-error', callback),
  onOpenPreferences: (callback) => ipcRenderer.on('open-preferences', callback),
  onImportCases: (callback) => ipcRenderer.on('import-cases', callback),
  onExportCases: (callback) => ipcRenderer.on('export-cases', callback),

  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});
