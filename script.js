// ====================
// STORAGE KEYS
// ====================
const STORAGE_KEY = 'lectoStudioSessions';

// ====================
// SANITIZATION FUNCTION (Security)
// ====================
function sanitizeInput(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeForCSV(str) {
    if (!str) return '';
    // Remove commas, quotes, and newlines for CSV safety
    return str.replace(/,/g, ';').replace(/"/g, '').replace(/\n/g, ' ');
}

// ====================
// SESSION FUNCTIONS
// ====================
function getSessions() {
    const sessions = localStorage.getItem(STORAGE_KEY);
    return sessions ? JSON.parse(sessions) : [];
}

function saveSession(session) {
    const sessions = getSessions();
    session.id = Date.now();
    session.createdAt = new Date().toISOString();
    
    // Sanitize text inputs
    session.clientName = sanitizeInput(session.clientName);
    session.projectName = sanitizeInput(session.projectName);
    session.notes = sanitizeInput(session.notes);
    
    sessions.push(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return session;
}

function deleteSession(id) {
    let sessions = getSessions();
    sessions = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
}

function clearAllSessions() {
    if (confirm('⚠️ WARNING: This will delete ALL sessions permanently! Are you sure?')) {
        localStorage.removeItem(STORAGE_KEY);
        showMessage('All sessions cleared successfully!', 'success');
        if (typeof displaySessions === 'function') displaySessions();
        if (typeof updateStats === 'function') updateStats();
        return true;
    }
    return false;
}

// ====================
// FORM HANDLER (record.html)
// ====================
const sessionForm = document.getElementById('sessionForm');
if (sessionForm) {
    // Set today's date as default
    const dateInput = document.getElementById('sessionDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
    
    sessionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Calculate duration
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        let duration = null;
        
        if (startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            duration = ((end - start) / (1000 * 60 * 60)).toFixed(1);
        }
        
        const session = {
            clientName: document.getElementById('clientName').value,
            projectName: document.getElementById('projectName').value,
            sessionDate: document.getElementById('sessionDate').value,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            serviceType: document.getElementById('serviceType').value,
            notes: document.getElementById('notes').value,
            amount: parseFloat(document.getElementById('amount').value) || 0,
            completed: document.getElementById('completed').checked
        };
        
        // Validate required fields
        if (!session.clientName || !session.projectName || !session.sessionDate || !session.serviceType) {
            showMessage('Please fill in all required fields!', 'error');
            return;
        }
        
        saveSession(session);
        showMessage('<i class="fas fa-check-circle"></i> Session saved successfully!', 'success');
        sessionForm.reset();
        
        // Reset date after reset
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        
        // Redirect after 1 second
        setTimeout(() => {
            window.location.href = 'sessions.html';
        }, 1000);
    });
}

// ====================
// DISPLAY SESSIONS (sessions.html)
// ====================
function displaySessions() {
    const sessionsList = document.getElementById('sessionsList');
    const totalCount = document.getElementById('totalCount');
    
    if (!sessionsList) return;
    
    let sessions = getSessions();
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
    const filterStatus = document.getElementById('filterStatus')?.value || 'all';
    
    // Filter sessions
    let filteredSessions = sessions.filter(session => {
        const matchesSearch = session.clientName.toLowerCase().includes(searchTerm) ||
                             session.projectName.toLowerCase().includes(searchTerm);
        const matchesStatus = filterStatus === 'all' ||
                             (filterStatus === 'completed' && session.completed) ||
                             (filterStatus === 'pending' && !session.completed);
        return matchesSearch && matchesStatus;
    });
    
    // Sort by date (newest first)
    filteredSessions.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
    
    if (totalCount) {
        totalCount.textContent = filteredSessions.length;
    }
    
    if (filteredSessions.length === 0) {
        sessionsList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No sessions found. Create your first session!</p><a href="record.html" class="btn-small"><i class="fas fa-plus"></i> New Session</a></div>';
        return;
    }
    
    sessionsList.innerHTML = filteredSessions.map(session => `
        <div class="session-card" data-id="${session.id}">
            <div class="session-header">
                <span class="session-client"><i class="fas fa-user-circle"></i> ${escapeHtml(session.clientName)}</span>
                <span class="session-status ${session.completed ? 'status-completed' : 'status-pending'}">
                    ${session.completed ? '<i class="fas fa-check-circle"></i> Completed' : '<i class="fas fa-hourglass-half"></i> Pending'}
                </span>
            </div>
            <div class="session-details">
                <span><i class="fas fa-music"></i> ${escapeHtml(session.projectName)}</span>
                <span><i class="fas fa-calendar"></i> ${session.sessionDate}</span>
                <span><i class="fas fa-clock"></i> ${session.startTime || 'N/A'} - ${session.endTime || 'N/A'}</span>
                <span><i class="fas fa-tag"></i> ${escapeHtml(session.serviceType)}</span>
                <span><i class="fas fa-dollar-sign"></i> $${session.amount.toFixed(2)}</span>
                ${session.duration ? `<span><i class="fas fa-hourglass"></i> ${session.duration} hrs</span>` : ''}
            </div>
            ${session.notes ? `<div class="session-notes"><i class="fas fa-sticky-note"></i> ${escapeHtml(session.notes)}</div>` : ''}
            <button class="delete-session" onclick="deleteSessionById(${session.id})"><i class="fas fa-trash-alt"></i> Delete</button>
        </div>
    `).join('');
}

function deleteSessionById(id) {
    if (confirm('Are you sure you want to delete this session?')) {
        deleteSession(id);
        displaySessions();
        showMessage('<i class="fas fa-trash-alt"></i> Session deleted!', 'success');
    }
}

// Search and filter listeners
const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
if (searchInput) searchInput.addEventListener('input', displaySessions);
if (filterStatus) filterStatus.addEventListener('change', displaySessions);

// Clear all button
const clearAllBtn = document.getElementById('clearAllBtn');
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        if (confirm('⚠️ WARNING: This will delete ALL sessions. Are you absolutely sure?')) {
            clearAllSessions();
            displaySessions();
        }
    });
}

// ====================
// EXPORT FUNCTIONS (export.html)
// ====================
function exportToCSV() {
    const sessions = getSessions();
    if (sessions.length === 0) {
        showMessage('No sessions to export!', 'error');
        return;
    }
    
    // CSV Headers
    const headers = ['ID', 'Client Name', 'Project Name', 'Date', 'Start Time', 'End Time', 'Duration (hrs)', 'Service Type', 'Notes', 'Amount ($)', 'Completed', 'Created At'];
    
    // Convert sessions to CSV rows with sanitization
    const rows = sessions.map(s => [
        s.id,
        `"${sanitizeForCSV(s.clientName)}"`,
        `"${sanitizeForCSV(s.projectName)}"`,
        s.sessionDate,
        s.startTime || '',
        s.endTime || '',
        s.duration || '',
        `"${sanitizeForCSV(s.serviceType)}"`,
        `"${sanitizeForCSV(s.notes || '')}"`,
        s.amount,
        s.completed ? 'Yes' : 'No',
        s.createdAt
    ]);
    
    // Combine headers and rows
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    // Add UTF-8 BOM for proper encoding
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute('download', `lecto_sessions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showMessage('<i class="fas fa-download"></i> CSV exported successfully!', 'success');
}

function copyTableToClipboard() {
    const sessions = getSessions();
    if (sessions.length === 0) {
        showMessage('No sessions to copy!', 'error');
        return;
    }
    
    let tableText = 'Client Name\tProject Name\tDate\tService Type\tAmount\tStatus\n';
    tableText += '='.repeat(60) + '\n';
    
    sessions.forEach(s => {
        tableText += `${s.clientName}\t${s.projectName}\t${s.sessionDate}\t${s.serviceType}\t$${s.amount}\t${s.completed ? 'Completed' : 'Pending'}\n`;
    });
    
    navigator.clipboard.writeText(tableText);
    showMessage('<i class="fas fa-copy"></i> Table copied to clipboard!', 'success');
}

// Update stats on export page
function updateStats() {
    const sessions = getSessions();
    const totalSessions = sessions.length;
    const totalRevenue = sessions.reduce((sum, s) => sum + s.amount, 0);
    const completedCount = sessions.filter(s => s.completed).length;
    
    const totalSpan = document.getElementById('totalSessions');
    const revenueSpan = document.getElementById('totalRevenue');
    const completedSpan = document.getElementById('completedCount');
    
    if (totalSpan) totalSpan.textContent = totalSessions;
    if (revenueSpan) revenueSpan.textContent = totalRevenue.toFixed(2);
    if (completedSpan) completedSpan.textContent = completedCount;
}

// Export buttons
const exportCSVBtn = document.getElementById('exportCSVBtn');
const copyTableBtn = document.getElementById('copyTableBtn');
if (exportCSVBtn) exportCSVBtn.addEventListener('click', exportToCSV);
if (copyTableBtn) copyTableBtn.addEventListener('click', copyTableToClipboard);

// ====================
// UTILITY FUNCTIONS
// ====================
function showMessage(msg, type) {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = msg;
        messageDiv.className = `message ${type}`;
        setTimeout(() => {
            messageDiv.innerHTML = '';
            messageDiv.className = 'message';
        }, 3000);
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ====================
// PWA SERVICE WORKER
// ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('✅ Service Worker registered:', reg))
            .catch(err => console.log('❌ Service Worker error:', err));
    });
}

// ====================
// APP INSTALL HANDLER
// ====================
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const closeInstall = document.getElementById('closeInstall');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installPrompt) installPrompt.style.display = 'flex';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') console.log('✅ App installed');
            if (installPrompt) installPrompt.style.display = 'none';
            deferredPrompt = null;
        }
    });
}

if (closeInstall) {
    closeInstall.addEventListener('click', () => {
        if (installPrompt) installPrompt.style.display = 'none';
    });
}

// Initialize page-specific functions
if (document.getElementById('sessionsList')) {
    displaySessions();
}

if (document.getElementById('totalSessions')) {
    updateStats();
}

console.log('🎵 Lecto Studio PWA loaded!');