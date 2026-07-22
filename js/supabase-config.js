// ============================================
// Supabase REST Client (No CDN dependency)
// ============================================

const SUPABASE_URL = 'https://qfenqnzugbkjeystnnby.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZW5xbnp1Z2JramV5c3RubmJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzODI2MzAsImV4cCI6MjA5OTk1ODYzMH0.cHCaZTC1Qm-6zBXVBo0mVjiuU_a-eyd4gW4dJ2uDAVg';

// ============================================
// Lightweight Supabase REST Client
// ============================================
class SupabaseQueryBuilder {
    constructor(table) {
        this._table = table;
        this._filters = [];
        this._selectCols = '*';
        this._orderCols = [];
        this._isSingle = false;
        this._method = 'GET';
        this._body = null;
        this._preferParts = [];
        this._onConflict = null;
    }

    select(cols, options) {
        this._selectCols = cols || '*';
        this._method = 'GET';
        return this;
    }

    insert(data) {
        this._method = 'POST';
        this._body = Array.isArray(data) ? data : [data];
        this._preferParts.push('return=representation');
        return this;
    }

    update(data) {
        this._method = 'PATCH';
        this._body = data;
        this._preferParts.push('return=representation');
        return this;
    }

    upsert(data, options) {
        this._method = 'POST';
        this._body = Array.isArray(data) ? data : [data];
        this._preferParts.push('return=representation');
        this._preferParts.push('resolution=merge-duplicates');
        if (options && options.onConflict) {
            this._onConflict = options.onConflict;
        }
        return this;
    }

    delete() {
        this._method = 'DELETE';
        this._preferParts.push('return=representation');
        return this;
    }

    eq(col, val) {
        this._filters.push({ col, op: 'eq', val });
        return this;
    }

    in(col, values) {
        this._filters.push({ col, op: 'in', val: values });
        return this;
    }

    order(col, options) {
        const dir = (options && options.ascending === false) ? 'desc' : 'asc';
        this._orderCols.push(`${col}.${dir}`);
        return this;
    }

    single() {
        this._isSingle = true;
        return this;
    }

    // Make the builder thenable so `await` works directly
    then(resolve, reject) {
        return this._execute().then(resolve, reject);
    }

    async _execute() {
        const url = new URL(`${SUPABASE_URL}/rest/v1/${this._table}`);

        // Select columns
        if (this._method === 'GET') {
            url.searchParams.set('select', this._selectCols.replace(/\s/g, ''));
        }

        // Filters
        this._filters.forEach(f => {
            if (f.op === 'eq') {
                url.searchParams.set(f.col, `eq.${f.val}`);
            } else if (f.op === 'in') {
                const escaped = f.val.map(v => `"${v}"`).join(',');
                url.searchParams.set(f.col, `in.(${escaped})`);
            }
        });

        // Ordering
        if (this._orderCols.length > 0) {
            url.searchParams.set('order', this._orderCols.join(','));
        }

        // On conflict
        if (this._onConflict) {
            url.searchParams.set('on_conflict', this._onConflict);
        }

        // Headers
        const headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };

        if (this._preferParts.length > 0) {
            headers['Prefer'] = this._preferParts.join(',');
        }

        // For single, request limit + singular response header
        if (this._isSingle && this._method === 'GET') {
            url.searchParams.set('limit', '1');
        }

        const fetchOpts = { method: this._method, headers };
        if (this._body && this._method !== 'GET' && this._method !== 'DELETE') {
            fetchOpts.body = JSON.stringify(this._body);
        }

        try {
            const response = await fetch(url.toString(), fetchOpts);

            if (!response.ok) {
                const errText = await response.text();
                let errObj;
                try { errObj = JSON.parse(errText); } catch (e) { errObj = { message: errText }; }
                return { data: null, error: { message: errObj.message || errObj.msg || response.statusText, code: response.status } };
            }

            // DELETE with no body can return empty
            const text = await response.text();
            let data = text ? JSON.parse(text) : [];

            // Handle single
            if (this._isSingle) {
                if (Array.isArray(data)) {
                    if (data.length > 0) {
                        data = data[0];
                    } else {
                        return { data: null, error: { message: 'No rows found', code: 'PGRST116' } };
                    }
                }
            }

            return { data, error: null };
        } catch (err) {
            console.error('Supabase REST error:', err);
            return { data: null, error: { message: err.message } };
        }
    }
}

// Main client object (mimics supabase-js API)
const supabase = {
    from: (table) => new SupabaseQueryBuilder(table)
};

console.log('Supabase REST client initialized for:', SUPABASE_URL);

// ============================================
// Shared Constants & Utilities
// ============================================

const EXAM_TYPES = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2'];
const SECTIONS = ['A', 'B'];
const CLASSES = [
    '3', '4', '5', '6', '7', '8', '9', '10',
    'Jr Inter MPC', 'Jr Inter BiPC', 'Jr Inter CEC', 'Jr Inter HEC', 'Jr Inter MEC', 'Jr Inter A&T',
    'Sr Inter MPC', 'Sr Inter BiPC', 'Sr Inter CEC', 'Sr Inter HEC', 'Sr Inter MEC', 'Sr Inter A&T'
];
const MAX_STUDENTS = 40;

function getSubjects(classVal) {
    const num = parseInt(classVal);
    if (!isNaN(num)) {
        if (num >= 3 && num <= 5) {
            return ['Telugu', 'English', 'Maths', 'EVS'];
        }
        return ['Telugu', 'Hindi', 'English', 'Maths', 'Science', 'Social'];
    }
    
    const val = String(classVal).toUpperCase();
    if (val.includes('MPC')) {
        return ['English', 'Second Language', 'Maths-A', 'Maths-B', 'Physics', 'Chemistry'];
    } else if (val.includes('BIPC')) {
        return ['English', 'Second Language', 'Botany', 'Zoology', 'Physics', 'Chemistry'];
    } else if (val.includes('CEC')) {
        return ['English', 'Second Language', 'Commerce', 'Economics', 'Civics'];
    } else if (val.includes('HEC')) {
        return ['English', 'Second Language', 'History', 'Economics', 'Civics'];
    } else if (val.includes('MEC')) {
        return ['English', 'Second Language', 'Maths', 'Economics', 'Commerce'];
    } else if (val.includes('A&T')) {
        return ['English', 'Second Language', 'Agriculture', 'Technology', 'Vocational-Practical'];
    }
    
    return ['Telugu', 'Hindi', 'English', 'Maths', 'Science', 'Social'];
}

function getMaxMarks(examType) {
    return examType.startsWith('FA') ? 50 : 100;
}

function getPassMark(examType, subject) {
    const isFA = examType.startsWith('FA');
    const isHindi = subject === 'Hindi';
    if (isFA) return isHindi ? 10 : 18;
    return isHindi ? 20 : 35;
}

function calculatePassFail(marks, examType, subject) {
    if (marks === null || marks === undefined || marks === '') return null;
    const passMark = getPassMark(examType, subject);
    return parseInt(marks) >= passMark ? 'Pass' : 'Fail';
}

// ============================================
// Session Management
// ============================================

function getSession() {
    const s = localStorage.getItem('school_session');
    return s ? JSON.parse(s) : null;
}

function setSession(data) {
    localStorage.setItem('school_session', JSON.stringify(data));
}

function clearSession() {
    localStorage.removeItem('school_session');
}

function getAppBaseUrl() {
    const path = window.location.pathname;
    if (path.endsWith('.html')) {
        return path.substring(0, path.lastIndexOf('/') + 1);
    }
    if (path.endsWith('/')) {
        return path;
    }
    return path + '/';
}

function logout() {
    clearSession();
    window.location.href = getAppBaseUrl() + 'index.html';
}

// ============================================
// Toast Notifications
// ============================================

function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================
// Loading Overlay
// ============================================

function showLoading(msg = 'Loading...') {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `<div class="spinner"></div><div class="loading-text">${msg}</div>`;
        document.body.appendChild(overlay);
    } else {
        overlay.querySelector('.loading-text').textContent = msg;
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';
}

// ============================================
// Utility: Class display name
// ============================================
function classDisplayName(val) {
    const num = parseInt(val);
    if (!isNaN(num)) {
        const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
        return val + (suffixes[num] || 'th') + ' Class';
    }
    return val;
}
