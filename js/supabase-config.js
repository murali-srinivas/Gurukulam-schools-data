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
        this._limit = null;
        this._offset = null;
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

    limit(num) {
        this._limit = num;
        return this;
    }

    offset(num) {
        this._offset = num;
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

        // Limit and Offset
        if (this._limit !== null && this._limit !== undefined) {
            url.searchParams.set('limit', String(this._limit));
        }
        if (this._offset !== null && this._offset !== undefined) {
            url.searchParams.set('offset', String(this._offset));
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

const EXAM_TYPES = [
    'FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2', 
    'MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test',
    'Unit-1', 'Unit-2', 'Unit-3', 'Unit-4', 
    'Quarterly', 'Half Yearly', 'Prefinal'
];
const SECTIONS = ['A', 'B'];
const CLASSES = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
    'Jr Inter MPC', 'Jr Inter BiPC', 'Jr Inter CEC', 'Jr Inter HEC', 'Jr Inter MEC', 'Jr Inter A&T', 'Jr Inter CGA',
    'Sr Inter MPC', 'Sr Inter BiPC', 'Sr Inter CEC', 'Sr Inter HEC', 'Sr Inter MEC', 'Sr Inter A&T', 'Sr Inter CGA'
];
const MAX_STUDENTS = 40;

function getSubjects(classVal, examType = '') {
    if (examType && ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType)) {
        return ['Telugu', 'English', 'Maths'];
    }
    
    const num = parseInt(classVal);
    if (!isNaN(num)) {
        if (num >= 1 && num <= 2) {
            return ['Telugu', 'English', 'Maths'];
        }
        if (num >= 3 && num <= 5) {
            return ['Telugu', 'English', 'Maths', 'EVS'];
        }
        if (num >= 8 && num <= 10) {
            return ['Telugu', 'Hindi', 'English', 'Maths', 'PS', 'NS', 'Social'];
        }
        return ['Telugu', 'Hindi', 'English', 'Maths', 'Science', 'Social'];
    }
    
    const val = String(classVal).toUpperCase();
    if (val.includes('MPC')) {
        return ['English', 'Second Language', 'Maths', 'Physics', 'Chemistry'];
    } else if (val.includes('BIPC')) {
        return ['English', 'Second Language', 'Biology', 'Physics', 'Chemistry'];
    } else if (val.includes('CEC')) {
        return ['English', 'Second Language', 'Commerce', 'Economics', 'Civics'];
    } else if (val.includes('HEC')) {
        return ['English', 'Second Language', 'History', 'Economics', 'Civics'];
    } else if (val.includes('MEC')) {
        return ['English', 'Second Language', 'Maths', 'Economics', 'Commerce'];
    } else if (val.includes('A&T')) {
        return ['English', 'Second Language', 'Agriculture', 'Technology', 'Vocational-Practical'];
    } else if (val.includes('CGA')) {
        return ['English', 'Second Language', 'CGA-Theory', 'Computer-Graphics', 'Animation-Practical'];
    }
    
    return ['Telugu', 'Hindi', 'English', 'Maths', 'Science', 'Social'];
}

function getMaxMarks(examType, subject = '', classVal = '') {
    if (!examType) return 100;
    const type = String(examType).toUpperCase();
    if (['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(type)) return 0;
    if (['UNIT-1', 'UNIT-2', 'UNIT-3', 'UNIT-4'].includes(type)) return 25;
    if (['QUARTERLY', 'HALF YEARLY', 'PREFINAL'].includes(type)) return 100;
    
    // PS and NS max marks is 50 in SA1/SA2 for 10th class
    if (['SA1', 'SA2'].includes(type) && ['PS', 'NS'].includes(subject) && String(classVal).includes('10')) {
        return 50;
    }
    
    if (type.startsWith('FA')) {
        if (String(classVal).trim() === '10') {
            return 35;
        }
        return 50;
    }
    
    return 100;
}

function getPassMark(examType, subject, classVal = '') {
    if (!examType) return 35;
    const type = String(examType).toUpperCase();
    if (['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(type)) return 0;
    if (['UNIT-1', 'UNIT-2', 'UNIT-3', 'UNIT-4'].includes(type)) return 9;
    
    const numClass = parseInt(classVal);
    const is6to10 = !isNaN(numClass) && numClass >= 6 && numClass <= 10;
    const isFA = type.startsWith('FA');
    const isHindi = subject === 'Hindi';
    
    if (is6to10 && isHindi) {
        if (['QUARTERLY', 'HALF YEARLY', 'PREFINAL', 'SA1', 'SA2'].includes(type)) {
            return 20;
        }
        if (isFA) {
            if (String(classVal).trim() === '10') {
                return 7;
            }
            return 10;
        }
    }
    
    if (['QUARTERLY', 'HALF YEARLY', 'PREFINAL'].includes(type)) return 35;
    
    // PS and NS in SA1/SA2: if max marks is 50, pass mark is 18 (same as FA where max marks is 50)
    if (['SA1', 'SA2'].includes(type) && ['PS', 'NS'].includes(subject)) {
        return 18;
    }
    
    if (isFA) {
        if (String(classVal).trim() === '10') {
            return isHindi ? 7 : 12;
        }
        return isHindi ? 10 : 18;
    }
    return isHindi ? 20 : 35;
}

function calculatePassFail(marks, examType, subject, classVal = '') {
    if (!examType) return null;
    const type = String(examType).toUpperCase();
    if (['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(type)) return null;
    if (marks === null || marks === undefined || marks === '') return null;
    
    const marksVal = parseInt(marks);
    const maxMarks = getMaxMarks(type, subject, classVal);
    const passMark = getPassMark(type, subject, classVal);
    
    if (marksVal < passMark) return 'Grade-D';
    
    if (maxMarks === 25) {
        if (marksVal >= 21) return 'Grade-A';
        if (marksVal >= 16) return 'Grade-B';
        return 'Grade-C';
    } else if (maxMarks === 35) {
        if (marksVal >= 28) return 'Grade-A';
        if (marksVal >= 21) return 'Grade-B';
        return 'Grade-C';
    } else if (maxMarks === 50) {
        if (marksVal >= 41) return 'Grade-A';
        if (marksVal >= 31) return 'Grade-B';
        return 'Grade-C';
    } else { // 100 marks
        if (marksVal >= 80) return 'Grade-A';
        if (marksVal >= 51) return 'Grade-B';
        return 'Grade-C';
    }
}

function isPassingGrade(grade) {
    if (!grade) return false;
    const g = String(grade).toUpperCase();
    if (g === 'GRADE-D' || g === 'FAIL') return false;
    return true;
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

function updateExamDropdown(classSelectId, examSelectId, hasAllOption = false) {
    const classSelect = document.getElementById(classSelectId);
    const examSelect = document.getElementById(examSelectId);
    
    if (!classSelect || !examSelect) return;
    
    const classVal = classSelect.value;
    const isInter = classVal && classVal.includes('Inter');
    const allowedForGraded = ['3', '4', '5', '6', '7', '8', '9'].includes(classVal);
    const selectedValue = examSelect.value;
    
    examSelect.innerHTML = '';
    
    if (hasAllOption) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'All Exams';
        examSelect.appendChild(opt);
    } else {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Select Exam';
        examSelect.appendChild(opt);
    }
    
    const standardExams = ['FA1', 'FA2', 'FA3', 'FA4', 'SA1', 'SA2'];
    const gradedExams = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'];
    const interExams = ['Unit-1', 'Unit-2', 'Unit-3', 'Unit-4', 'Quarterly', 'Half Yearly', 'Prefinal'];
    
    let availableExams = [];
    if (isInter) {
        availableExams = interExams;
    } else {
        availableExams = allowedForGraded ? [...standardExams, ...gradedExams] : standardExams;
    }
    
    availableExams.forEach(exam => {
        const opt = document.createElement('option');
        opt.value = exam;
        opt.textContent = exam;
        if (exam === selectedValue) opt.selected = true;
        examSelect.appendChild(opt);
    });
}

function toggleQualRow(cb) {
    const row = cb.closest('tr');
    const inputs = row.querySelectorAll('input[type="text"], select');
    inputs.forEach(inp => {
        if (cb.checked) {
            inp.disabled = false;
            inp.setAttribute('required', 'true');
        } else {
            inp.disabled = true;
            inp.removeAttribute('required');
            inp.value = inp.tagName === 'SELECT' ? inp.options[0].value : '';
        }
    });
}

function formatQualificationSummary(s) {
    const summary = [];
    if (s.qualification_inter) summary.push('Inter');
    if (s.qualification_degree) {
        const typeStr = s.degree_type ? s.degree_type : 'Degree';
        summary.push(`${typeStr} (${s.degree_subjects || '-'}: ${s.degree_marks || '-'}%)`);
    }
    if (s.qualification_pg) {
        const typeStr = s.pg_type ? s.pg_type : 'PG';
        summary.push(`${typeStr} (${s.pg_subjects || '-'}: ${s.pg_marks || '-'}%)`);
    }
    if (s.qualification_bed) summary.push(`B.Ed (${s.bed_subjects || '-'}: ${s.bed_marks || '-'}%)`);
    if (s.qualification_pandit) summary.push(`Pandit Tr. (${s.pandit_subjects || '-'}: ${s.pandit_marks || '-'}%)`);
    if (s.qualification_tet_p1) summary.push(`TET P1 (${s.tet_p1_subjects || '-'}: ${s.tet_p1_marks || '-'}%)`);
    if (s.qualification_tet_p2) summary.push(`TET P2 (${s.tet_p2_subjects || '-'}: ${s.tet_p2_marks || '-'}%)`);
    if (s.qualification_others) summary.push(s.qualification_others);
    
    return summary.join(', ') || '-';
}

function populateQualFormFields(prefix, s = null) {
    const list = [
        { key: 'inter', hasFields: false },
        { key: 'degree', hasFields: true, hasType: true },
        { key: 'pg', hasFields: true, hasType: true },
        { key: 'bed', hasFields: true },
        { key: 'pandit', hasFields: true },
        { key: 'tet1', dbKey: 'tet_p1', hasFields: true },
        { key: 'tet2', dbKey: 'tet_p2', hasFields: true }
    ];
    
    list.forEach(item => {
        const cb = document.getElementById(`${prefix}-qual-${item.key}`);
        if (!cb) return;
        
        const dbKeyBool = item.dbKey ? `qualification_${item.dbKey}` : `qualification_${item.key}`;
        const isChecked = s ? !!s[dbKeyBool] : false;
        cb.checked = isChecked;
        
        if (item.hasType) {
            const typeSelect = document.getElementById(`${prefix}-qual-${item.key}-type`);
            if (isChecked) {
                typeSelect.disabled = false;
                typeSelect.setAttribute('required', 'true');
                typeSelect.value = s ? (s[`${item.key}_type`] || typeSelect.options[0].value) : typeSelect.options[0].value;
            } else {
                typeSelect.disabled = true;
                typeSelect.removeAttribute('required');
                typeSelect.value = typeSelect.options[0].value;
            }
        }
        
        if (item.hasFields) {
            const subInput = document.getElementById(`${prefix}-qual-${item.key}-sub`);
            const marksInput = document.getElementById(`${prefix}-qual-${item.key}-marks`);
            
            if (isChecked) {
                subInput.disabled = false;
                subInput.setAttribute('required', 'true');
                subInput.value = s ? (s[`${item.dbKey || item.key}_subjects`] || '') : '';
                
                marksInput.disabled = false;
                marksInput.setAttribute('required', 'true');
                marksInput.value = s ? (s[`${item.dbKey || item.key}_marks`] || '') : '';
            } else {
                subInput.disabled = true;
                subInput.removeAttribute('required');
                subInput.value = '';
                
                marksInput.disabled = true;
                marksInput.removeAttribute('required');
                marksInput.value = '';
            }
        }
    });
    
    // Others
    const otherCb = document.getElementById(`${prefix}-qual-others`);
    if (otherCb) {
        const isChecked = s ? !!s.qualification_others : false;
        otherCb.checked = isChecked;
        const descInput = document.getElementById(`${prefix}-qual-others-desc`);
        if (isChecked) {
            descInput.disabled = false;
            descInput.setAttribute('required', 'true');
            descInput.value = s ? (s.qualification_others || '') : '';
        } else {
            descInput.disabled = true;
            descInput.removeAttribute('required');
            descInput.value = '';
        }
    }
}

function readQualFormFields(prefix) {
    const data = {
        qualification_inter: document.getElementById(`${prefix}-qual-inter`).checked,
        
        qualification_degree: document.getElementById(`${prefix}-qual-degree`).checked,
        degree_type: document.getElementById(`${prefix}-qual-degree`).checked ? document.getElementById(`${prefix}-qual-degree-type`).value : null,
        degree_subjects: document.getElementById(`${prefix}-qual-degree`).checked ? document.getElementById(`${prefix}-qual-degree-sub`).value.trim() : null,
        degree_marks: document.getElementById(`${prefix}-qual-degree`).checked ? document.getElementById(`${prefix}-qual-degree-marks`).value.trim() : null,
        
        qualification_pg: document.getElementById(`${prefix}-qual-pg`).checked,
        pg_type: document.getElementById(`${prefix}-qual-pg`).checked ? document.getElementById(`${prefix}-qual-pg-type`).value : null,
        pg_subjects: document.getElementById(`${prefix}-qual-pg`).checked ? document.getElementById(`${prefix}-qual-pg-sub`).value.trim() : null,
        pg_marks: document.getElementById(`${prefix}-qual-pg`).checked ? document.getElementById(`${prefix}-qual-pg-marks`).value.trim() : null,
        
        qualification_bed: document.getElementById(`${prefix}-qual-bed`).checked,
        bed_subjects: document.getElementById(`${prefix}-qual-bed`).checked ? document.getElementById(`${prefix}-qual-bed-sub`).value.trim() : null,
        bed_marks: document.getElementById(`${prefix}-qual-bed`).checked ? document.getElementById(`${prefix}-qual-bed-marks`).value.trim() : null,
        
        qualification_pandit: document.getElementById(`${prefix}-qual-pandit`).checked,
        pandit_subjects: document.getElementById(`${prefix}-qual-pandit`).checked ? document.getElementById(`${prefix}-qual-pandit-sub`).value.trim() : null,
        pandit_marks: document.getElementById(`${prefix}-qual-pandit`).checked ? document.getElementById(`${prefix}-qual-pandit-marks`).value.trim() : null,
        
        qualification_tet_p1: document.getElementById(`${prefix}-qual-tet1`).checked,
        tet_p1_subjects: document.getElementById(`${prefix}-qual-tet1`).checked ? document.getElementById(`${prefix}-qual-tet1-sub`).value.trim() : null,
        tet_p1_marks: document.getElementById(`${prefix}-qual-tet1`).checked ? document.getElementById(`${prefix}-qual-tet1-marks`).value.trim() : null,
        
        qualification_tet_p2: document.getElementById(`${prefix}-qual-tet2`).checked,
        tet_p2_subjects: document.getElementById(`${prefix}-qual-tet2`).checked ? document.getElementById(`${prefix}-qual-tet2-sub`).value.trim() : null,
        tet_p2_marks: document.getElementById(`${prefix}-qual-tet2`).checked ? document.getElementById(`${prefix}-qual-tet2-marks`).value.trim() : null,
        
        qualification_others: document.getElementById(`${prefix}-qual-others`).checked ? document.getElementById(`${prefix}-qual-others-desc`).value.trim() : null
    };
    return data;
}

function getGradeDistributionHTML(students, marksList, subjects, examType, isStudentMarksFormatMap = false) {
    if (!students || students.length === 0 || !examType) return '';
    
    let flatMarks = [];
    if (isStudentMarksFormatMap) {
        students.forEach(s => {
            const sExams = marksList[s.id] || {};
            const sExamMarks = sExams[examType] || {};
            Object.keys(sExamMarks).forEach(sub => {
                flatMarks.push(sExamMarks[sub]);
            });
        });
    } else {
        flatMarks = marksList || [];
    }
    
    const dist = {};
    subjects.forEach(sub => {
        dist[sub] = { 
            'Grade-A': 0, 
            'Grade-B': 0, 
            'Grade-C': 0, 
            'Grade-D': 0, 
            'Total': 0,
            'sumMarks': 0,
            'countMarks': 0,
            'highestMark': -Infinity,
            'lowestMark': Infinity
        };
    });
    
    const isGraded = ['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(String(examType).toUpperCase());
    
    students.forEach(student => {
        subjects.forEach(sub => {
            const m = flatMarks.find(mark => mark && mark.student_id === student.id && mark.subject === sub);
            if (m) {
                let grade = null;
                if (isGraded) {
                    const g = String(m.pass_fail || '').toUpperCase();
                    if (g === 'A') grade = 'Grade-A';
                    else if (g === 'B') grade = 'Grade-B';
                    else if (g === 'C') grade = 'Grade-C';
                } else if (m.marks !== null && m.marks !== undefined && m.marks !== '') {
                    const marksVal = parseFloat(m.marks);
                    if (!isNaN(marksVal)) {
                        grade = calculatePassFail(marksVal, examType, sub, student.class_number);
                        dist[sub]['sumMarks'] += marksVal;
                        dist[sub]['countMarks']++;
                        if (marksVal > dist[sub]['highestMark']) dist[sub]['highestMark'] = marksVal;
                        if (marksVal < dist[sub]['lowestMark']) dist[sub]['lowestMark'] = marksVal;
                    }
                } else if (m.pass_fail) {
                    const g = String(m.pass_fail);
                    if (g === 'Pass') grade = 'Grade-C';
                    else if (g === 'Fail') grade = 'Grade-D';
                    else if (g.startsWith('Grade-')) grade = g;
                }
                
                if (grade && dist[sub] && dist[sub][grade] !== undefined) {
                    dist[sub][grade]++;
                    dist[sub]['Total']++;
                }
            }
        });
    });
    
    let html = `
        <div class="grade-distribution-card mt-6" style="margin-top: 2rem;">
            <div class="card-header" style="background: #1e3a8a; color: white; padding: 12px 20px; border-radius: 8px 8px 0 0;">
                <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px; color: #ffffff;">
                    <i class="fas fa-chart-bar"></i> Grade Distribution Summary (${examType})
                </h3>
            </div>
            <div class="table-container" style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; overflow-x: auto; background: #ffffff;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 12px 15px; font-weight: 600; color: #1e293b;">Subject</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #15803d;">Grade-A</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #1d4ed8;">Grade-B</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #b45309;">Grade-C</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #b91c1c;">Grade-D</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #1e293b;">Total</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #15803d;">Passed</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #b91c1c;">Failed</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #1e293b;">Pass %</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #1e293b;">Avg Marks (Avg %)</th>
                            <th style="padding: 12px 15px; font-weight: 600; color: #1e293b;">Highest / Lowest</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    subjects.forEach(sub => {
        const sDist = dist[sub];
        const passed = sDist['Grade-A'] + sDist['Grade-B'] + sDist['Grade-C'];
        const failed = sDist['Grade-D'];
        const totalGraded = sDist['Total'];
        const passPercent = totalGraded > 0 ? Math.round((passed / totalGraded) * 100) : 0;
        
        let avgStr = '-';
        let highLowStr = '-';
        
        if (!isGraded && sDist['countMarks'] > 0) {
            const avg = sDist['sumMarks'] / sDist['countMarks'];
            const classVal = students[0] ? students[0].class_number : '';
            const maxMarks = getMaxMarks(examType, sub, classVal);
            const avgPct = Math.round((avg / maxMarks) * 100);
            avgStr = `${avg.toFixed(1)} / ${maxMarks} (${avgPct}%)`;
            highLowStr = `${sDist['highestMark']} / ${sDist['lowestMark']}`;
        }
        
        html += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 15px; font-weight: 500; color: #334155;">${sub}</td>
                <td style="padding: 12px 15px; color: #15803d; font-weight: 600;">${sDist['Grade-A']}</td>
                <td style="padding: 12px 15px; color: #1d4ed8; font-weight: 600;">${sDist['Grade-B']}</td>
                <td style="padding: 12px 15px; color: #b45309; font-weight: 600;">${sDist['Grade-C']}</td>
                <td style="padding: 12px 15px; color: #b91c1c; font-weight: 600;">${sDist['Grade-D']}</td>
                <td style="padding: 12px 15px; font-weight: 600;">${totalGraded}</td>
                <td style="padding: 12px 15px; color: #15803d; font-weight: 600;">${passed}</td>
                <td style="padding: 12px 15px; color: #b91c1c; font-weight: 600;">${failed}</td>
                <td style="padding: 12px 15px; font-weight: 600; color: #1e293b;">${passPercent}%</td>
                <td style="padding: 12px 15px; color: #334155;">${avgStr}</td>
                <td style="padding: 12px 15px; color: #334155;">${highLowStr}</td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    return html;
}

function formatDateDMY(dateString) {
    if (!dateString) return '-';
    const match = String(dateString).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}
