let allSchools = [];

function getGenderLabel(gender) {
    if (gender === 'Female') return 'Girl';
    if (gender === 'Male' || gender === 'Other') return 'Boy';
    return gender || '';
}

async function initAdmin() {
    try {
        const session = getSession();
        if (!session || !session.is_admin) {
            window.location.href = getAppBaseUrl() + 'index.html';
            return;
        }

        document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Populate class filters
        const classOpts = CLASSES.map(c => ({ value: c, label: classDisplayName(c) }));
        populateFilterDropdown('stu-filter-class', classOpts, 'value', 'label');
        populateFilterDropdown('marks-filter-class', classOpts, 'value', 'label');
        populateFilterDropdown('report-filter-class', classOpts, 'value', 'label');

        updateExamDropdown('marks-filter-class', 'marks-filter-exam');
        updateExamDropdown('report-filter-class', 'report-filter-exam', true);

        await loadSchoolsList();
        await loadOverviewData();
    } catch (err) {
        console.error('Init error:', err);
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));

    const navItem = document.getElementById(`nav-${tabName}`);
    if (navItem) navItem.classList.add('active');

    const tabPane = document.getElementById(`tab-${tabName}`);
    if (tabPane) tabPane.classList.add('active');

    const titles = {
        'overview': 'Overview',
        'schools': 'Manage Schools',
        'students': 'Students',
        'staff': 'Staff Management',
        'staffing-particulars': 'Staffing Particulars',
        'outsourcing-attendance': 'Attendance of Out Sourcing Teachers',
        'marks': 'Exam Marks',
        'reports': 'Reports & Export'
    };
    document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';

    if (tabName === 'schools') {
        renderSchoolsTable();
    } else if (tabName === 'students') {
        const searchInput = document.getElementById('stu-search-input');
        if (searchInput) searchInput.value = '';
        loadAdminStudents();
    } else if (tabName === 'staff') {
        const searchInput = document.getElementById('staff-search-input');
        if (searchInput) searchInput.value = '';
        loadAdminStaff();
    } else if (tabName === 'staffing-particulars') {
        const schoolSearchInput = document.getElementById('staffing-school-search');
        if (schoolSearchInput) {
            schoolSearchInput.value = '';
            filterSchoolDropdownForStaffing();
        }
        const searchInput = document.getElementById('staffing-search-input');
        if (searchInput) searchInput.value = '';
        const statusSelect = document.getElementById('staffing-filter-status');
        if (statusSelect) statusSelect.value = '';
        loadAdminStaffingTable();
    } else if (tabName === 'outsourcing-attendance') {
        const schoolSearchInput = document.getElementById('admin-out-school-search');
        if (schoolSearchInput) {
            schoolSearchInput.value = '';
            filterAdminOutSchoolDropdown();
        }
        const searchInput = document.getElementById('admin-out-search-input');
        if (searchInput) searchInput.value = '';
        const monthFilter = document.getElementById('admin-out-filter-month');
        if (monthFilter && !monthFilter.value) {
            const d = new Date();
            const currentMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthFilter.value = currentMonthStr;
        }
        loadAdminOutsourcingAttendanceTable();
    } else if (tabName === 'marks') {
        const searchInputMarks = document.getElementById('marks-school-search');
        if (searchInputMarks) {
            searchInputMarks.value = '';
            filterSchoolDropdownForMarks();
        }
        onAdminMarksFilterChange();
    } else if (tabName === 'reports') {
        const searchInputReports = document.getElementById('report-school-search');
        if (searchInputReports) {
            searchInputReports.value = '';
            filterSchoolDropdownForReports();
        }
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

async function loadSchoolsList() {
    showLoading();
    try {
        const { data, error } = await supabase
            .from('schools')
            .select('*')
            .eq('is_admin', false);

        if (error) throw error;
        allSchools = data || [];

        const schoolOptions = allSchools.map(s => ({ id: s.id, name: s.school_name }));
        populateFilterDropdown('stu-filter-school', schoolOptions, 'id', 'name');
        populateFilterDropdown('marks-filter-school', schoolOptions, 'id', 'name');
        populateFilterDropdown('report-filter-school', schoolOptions, 'id', 'name');
        populateFilterDropdown('staff-filter-school', schoolOptions, 'id', 'name');
        populateFilterDropdown('admin-staff-school-select', schoolOptions, 'id', 'name');
        populateFilterDropdown('overview-school-select', schoolOptions, 'id', 'name');
        populateFilterDropdown('staffing-filter-school', schoolOptions, 'id', 'name');
        populateFilterDropdown('staffing-school-select', schoolOptions, 'id', 'name');
        populateFilterDropdown('admin-out-filter-school', schoolOptions, 'id', 'name');
        populateFilterDropdown('admin-out-school-select', schoolOptions, 'id', 'name');
        
        const searchInputOverview = document.getElementById('overview-school-search');
        if (searchInputOverview) searchInputOverview.value = '';
        const searchInputMarks = document.getElementById('marks-school-search');
        if (searchInputMarks) searchInputMarks.value = '';
        const searchInputReports = document.getElementById('report-school-search');
        if (searchInputReports) searchInputReports.value = '';
        const searchInputStaffing = document.getElementById('staffing-school-search');
        if (searchInputStaffing) searchInputStaffing.value = '';
        const searchInputOut = document.getElementById('admin-out-school-search');
        if (searchInputOut) searchInputOut.value = '';
    } catch (err) {
        console.error(err);
        showToast('Failed to load schools list', 'error');
    } finally {
        hideLoading();
    }
}

function filterSchoolDropdown() {
    const searchVal = document.getElementById('overview-school-search').value.toLowerCase();
    const select = document.getElementById('overview-school-select');
    
    select.innerHTML = '<option value="">-- Select a School --</option>';
    
    const filtered = allSchools.filter(school => 
        school.school_name.toLowerCase().includes(searchVal)
    );
    
    filtered.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.school_name;
        select.appendChild(option);
    });
}

function filterSchoolDropdownForMarks() {
    const searchVal = document.getElementById('marks-school-search').value.toLowerCase();
    const select = document.getElementById('marks-filter-school');
    
    select.innerHTML = '<option value="">Select School</option>';
    
    const filtered = allSchools.filter(school => 
        school.school_name.toLowerCase().includes(searchVal)
    );
    
    filtered.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.school_name;
        select.appendChild(option);
    });
}

function filterSchoolDropdownForReports() {
    const searchVal = document.getElementById('report-school-search').value.toLowerCase();
    const select = document.getElementById('report-filter-school');
    
    select.innerHTML = '<option value="">All Schools</option>';
    
    const filtered = allSchools.filter(school => 
        school.school_name.toLowerCase().includes(searchVal)
    );
    
    filtered.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.school_name;
        select.appendChild(option);
    });
}

async function loadOverviewData() {
    showLoading();
    try {
        const totalSchoolsCount = allSchools.length;
        
        const { data: studentsData, error: stuError } = await supabase
            .from('students')
            .select('id, school_id', { count: 'exact' });
            
        if (stuError) throw stuError;
        const totalStudentsCount = studentsData.length;

        const classesCount = 8; // 3 to 10
        const examTypesCount = 6; // FA1 to SA2

        const statsGrid = document.getElementById('stats-grid');
        statsGrid.innerHTML = `
            <div class="stat-card accent-primary">
                <div class="stat-icon icon-primary"><i class="fas fa-school"></i></div>
                <div class="stat-value">${totalSchoolsCount}</div>
                <div class="stat-label">Total Schools</div>
            </div>
            <div class="stat-card accent-success">
                <div class="stat-icon icon-success"><i class="fas fa-users"></i></div>
                <div class="stat-value">${totalStudentsCount}</div>
                <div class="stat-label">Total Students</div>
            </div>
            <div class="stat-card accent-warning">
                <div class="stat-icon icon-warning"><i class="fas fa-layer-group"></i></div>
                <div class="stat-value">${classesCount}</div>
                <div class="stat-label">Classes Active</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon icon-info"><i class="fas fa-file-alt"></i></div>
                <div class="stat-value">${examTypesCount}</div>
                <div class="stat-label">Exam Types</div>
            </div>
        `;

        const overviewTbody = document.getElementById('overview-schools-table');
        overviewTbody.innerHTML = '';
        
        for (const school of allSchools) {
            const schoolStudentsCount = studentsData.filter(s => s.school_id === school.id).length;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${school.school_name}</td>
                <td>${school.username}</td>
                <td>${schoolStudentsCount}</td>
                <td><span class="badge badge-pass">Active</span></td>
            `;
            overviewTbody.appendChild(tr);
        }

    } catch (err) {
        console.error(err);
        showToast('Failed to load overview data', 'error');
    } finally {
        hideLoading();
    }
}

function openSchoolModal(id = null) {
    const modal = document.getElementById('school-modal');
    const title = document.getElementById('school-modal-title');
    const form = document.getElementById('school-form');
    
    form.reset();
    document.getElementById('school-edit-id').value = '';
    
    if (id) {
        const school = allSchools.find(item => item.id === id);
        if (school) {
            title.textContent = 'Edit School';
            document.getElementById('school-edit-id').value = school.id;
            document.getElementById('school-district-input').value = school.district || '';
            document.getElementById('school-name-input').value = school.school_name;
            document.getElementById('school-username-input').value = school.username;
            document.getElementById('school-password-input').value = school.password;
        }
    } else {
        title.textContent = 'Add School';
    }
    
    modal.classList.remove('hidden');
}

function closeSchoolModal() {
    document.getElementById('school-modal').classList.add('hidden');
    document.getElementById('school-form').reset();
}

async function saveSchool(event) {
    event.preventDefault();
    
    const id = document.getElementById('school-edit-id').value;
    const district = document.getElementById('school-district-input').value.trim();
    const schoolName = document.getElementById('school-name-input').value;
    const username = document.getElementById('school-username-input').value;
    const password = document.getElementById('school-password-input').value;
    
    showLoading();
    try {
        const payload = {
            district: district || null,
            school_name: schoolName,
            username: username,
            password: password,
            is_admin: false
        };
        
        if (id) {
            const { error } = await supabase.from('schools').update(payload).eq('id', id);
            if (error) throw error;
            showToast('School updated successfully', 'success');
        } else {
            const { error } = await supabase.from('schools').insert([payload]);
            if (error) throw error;
            showToast('School added successfully', 'success');
        }
        
        closeSchoolModal();
        await loadSchoolsList();
        await loadOverviewData();
        
        if (document.getElementById('tab-schools').classList.contains('active')) {
            renderSchoolsTable();
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to save school', 'error');
    } finally {
        hideLoading();
    }
}

async function deleteSchool(id, name) {
    if (!confirm('Delete school: ' + name + '? This will delete all its students and marks.')) return;
    
    showLoading();
    try {
        const { error } = await supabase.from('schools').delete().eq('id', id);
        if (error) throw error;
        
        showToast('School deleted successfully', 'success');
        await loadSchoolsList();
        await loadOverviewData();
        renderSchoolsTable();
    } catch (err) {
        console.error(err);
        showToast('Failed to delete school', 'error');
    } finally {
        hideLoading();
    }
}

function renderSchoolsTable() {
    const tbody = document.getElementById('schools-table-body');
    tbody.innerHTML = '';
    
    if (allSchools.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No schools found</td></tr>';
        return;
    }
    
    allSchools.forEach((school, index) => {
        const tr = document.createElement('tr');
        
        const createdDate = school.created_at ? new Date(school.created_at).toLocaleDateString() : 'N/A';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${school.district || '-'}</td>
            <td>${school.school_name}</td>
            <td>${school.username}</td>
            <td class="password-cell">
                <span class="pwd-dots">••••••</span>
                <span class="pwd-text hidden">${school.password}</span>
                <button class="btn-icon" onclick="togglePassword(this)">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
            <td>${createdDate}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="openSchoolModal('${school.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSchool('${school.id}', '${school.school_name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function togglePassword(btn) {
    const cell = btn.closest('.password-cell');
    const dots = cell.querySelector('.pwd-dots');
    const text = cell.querySelector('.pwd-text');
    const icon = btn.querySelector('i');
    
    if (dots.classList.contains('hidden')) {
        dots.classList.remove('hidden');
        text.classList.add('hidden');
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    } else {
        dots.classList.add('hidden');
        text.classList.remove('hidden');
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    }
}

let adminStudentData = [];

function renderAdminStudents() {
    const tbody = document.getElementById('admin-students-table');
    tbody.innerHTML = '';
    
    const searchVal = document.getElementById('stu-search-input').value.trim().toLowerCase();
    
    const filtered = adminStudentData.filter(student => {
        if (!searchVal) return true;
        const school = allSchools.find(s => s.id === student.school_id);
        const schoolName = school ? school.school_name.toLowerCase() : '';
        return (
            student.student_name.toLowerCase().includes(searchVal) ||
            student.roll_number.toString().toLowerCase().includes(searchVal) ||
            schoolName.includes(searchVal)
        );
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No students found</td></tr>';
        return;
    }
    
    filtered.forEach(student => {
        const school = allSchools.find(s => s.id === student.school_id);
        const schoolName = school ? school.school_name : 'Unknown';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${student.roll_number}</td>
            <td>${student.student_name}</td>
            <td>${getGenderLabel(student.gender) || '-'}</td>
            <td>${classDisplayName(student.class_number)}</td>
            <td>${student.section}</td>
            <td>${schoolName}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="openStudentModal('${student.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteStudent('${student.id}', '${student.student_name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openStudentModal(id = null) {
    const modal = document.getElementById('student-modal');
    const title = document.getElementById('student-modal-title');
    const form = document.getElementById('student-form');
    
    form.reset();
    document.getElementById('student-edit-id').value = '';
    
    // Populate school options
    const schoolSelect = document.getElementById('student-school-select');
    schoolSelect.innerHTML = '<option value="">-- Select School --</option>';
    allSchools.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.school_name;
        schoolSelect.appendChild(option);
    });
    
    // Populate class options
    const classSelect = document.getElementById('student-class-select');
    classSelect.innerHTML = '<option value="">-- Select Class --</option>';
    CLASSES.forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        option.textContent = classDisplayName(c);
        classSelect.appendChild(option);
    });
    
    if (id) {
        const s = adminStudentData.find(item => item.id === id);
        if (s) {
            title.textContent = 'Edit Student';
            document.getElementById('student-edit-id').value = s.id;
            document.getElementById('student-school-select').value = s.school_id;
            document.getElementById('student-class-select').value = s.class_number;
            document.getElementById('student-section-select').value = s.section;
            document.getElementById('student-roll-input').value = s.roll_number;
            document.getElementById('student-name-input').value = s.student_name;
            document.getElementById('student-gender-select').value = s.gender === 'Female' ? 'Girl' : 'Boy';
        }
    } else {
        title.textContent = 'Add Student';
        // Auto-select filter values if set
        const schoolFilter = document.getElementById('stu-filter-school').value;
        const classFilter = document.getElementById('stu-filter-class').value;
        const sectionFilter = document.getElementById('stu-filter-section').value;
        if (schoolFilter) document.getElementById('student-school-select').value = schoolFilter;
        if (classFilter) document.getElementById('student-class-select').value = classFilter;
        if (sectionFilter) document.getElementById('student-section-select').value = sectionFilter;
    }
    
    modal.classList.remove('hidden');
}

function closeStudentModal() {
    document.getElementById('student-modal').classList.add('hidden');
}

async function saveStudent(event) {
    event.preventDefault();
    
    const id = document.getElementById('student-edit-id').value;
    const schoolId = document.getElementById('student-school-select').value;
    const classVal = document.getElementById('student-class-select').value;
    const sectionVal = document.getElementById('student-section-select').value;
    const rollVal = parseInt(document.getElementById('student-roll-input').value);
    const nameVal = document.getElementById('student-name-input').value.trim();
    const genderVal = document.getElementById('student-gender-select').value;
    
    if (!schoolId || !classVal || !sectionVal || !rollVal || !nameVal) {
        showToast('Please fill all required fields.', 'warning');
        return;
    }
    
    const payload = {
        school_id: schoolId,
        class_number: classVal,
        section: sectionVal,
        roll_number: rollVal,
        student_name: nameVal,
        gender: genderVal === 'Girl' ? 'Female' : 'Male'
    };
    
    showLoading();
    try {
        if (id) {
            // Update
            const { error } = await supabase.from('students').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Student updated successfully!', 'success');
        } else {
            // Insert
            const { error } = await supabase.from('students').insert([payload]);
            if (error) throw error;
            showToast('Student added successfully!', 'success');
        }
        closeStudentModal();
        loadAdminStudents();
    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteStudent(id, name) {
    if (!confirm(`Are you sure you want to delete student: ${name}? This will delete all associated exam marks.`)) {
        return;
    }
    
    showLoading();
    try {
        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) throw error;
        showToast('Student deleted successfully!', 'success');
        loadAdminStudents();
    } catch (err) {
        console.error(err);
        showToast('Failed to delete student', 'error');
    } finally {
        hideLoading();
    }
}

async function loadAdminStudents() {
    const schoolId = document.getElementById('stu-filter-school').value;
    const classVal = document.getElementById('stu-filter-class').value;
    const sectionVal = document.getElementById('stu-filter-section').value;
    
    showLoading();
    try {
        let query = supabase.from('students').select('*');
        
        if (schoolId) query = query.eq('school_id', schoolId);
        if (classVal) query = query.eq('class_number', classVal);
        if (sectionVal) query = query.eq('section', sectionVal);
        
        const { data, error } = await query.order('class_number').order('section').order('roll_number');
        if (error) throw error;
        
        adminStudentData = data || [];
        renderAdminStudents();
        
    } catch (err) {
        console.error(err);
        showToast('Failed to load students', 'error');
    } finally {
        hideLoading();
    }
}

function resetStudentFilters() {
    document.getElementById('stu-filter-school').value = '';
    document.getElementById('stu-filter-class').value = '';
    document.getElementById('stu-filter-section').value = '';
    const searchInput = document.getElementById('stu-search-input');
    if (searchInput) searchInput.value = '';
    loadAdminStudents();
}

function onAdminMarksFilterChange() {
    updateExamDropdown('marks-filter-class', 'marks-filter-exam');
    
    const s = document.getElementById('marks-filter-school').value;
    const c = document.getElementById('marks-filter-class').value;
    const sec = document.getElementById('marks-filter-section').value;
    const e = document.getElementById('marks-filter-exam').value;
    
    const btn = document.getElementById('load-marks-btn');
    if (btn) {
        btn.disabled = !(s && c && sec && e);
    }
}

function onAdminReportClassChange() {
    updateExamDropdown('report-filter-class', 'report-filter-exam', true);
    generateReport();
}

let currentMarksContext = null;

async function loadAdminMarks() {
    const schoolId = document.getElementById('marks-filter-school').value;
    const classVal = document.getElementById('marks-filter-class').value;
    const sectionVal = document.getElementById('marks-filter-section').value;
    const examType = document.getElementById('marks-filter-exam').value;
    
    if (!schoolId || !classVal || !sectionVal || !examType) return;
    
    showLoading();
    try {
        const classNum = classVal;
        const { data: students, error: stuError } = await supabase
            .from('students')
            .select('*')
            .eq('school_id', schoolId)
            .eq('class_number', classNum)
            .eq('section', sectionVal)
            .order('roll_number');
            
        if (stuError) throw stuError;
        
        const subjects = getSubjects(classNum, examType);
        const container = document.getElementById('admin-marks-container');
        
        if (!students || students.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users-slash"></i>
                    <h4>No Students Found</h4>
                    <p>No students match the selected filters.</p>
                </div>
            `;
            return;
        }
        
        const studentIds = students.map(s => s.id);
        const { data: marksData, error: marksError } = await supabase
            .from('exam_marks')
            .select('*')
            .eq('exam_type', examType)
            .in('student_id', studentIds);
            
        if (marksError) throw marksError;
        
        currentMarksContext = { schoolId, classNum, sectionVal, examType, students, subjects };
        
        let html = `
            <div class="d-flex justify-end mb-4 gap-2">
                <button class="btn btn-danger" onclick="deleteAdminMarks()">
                    <i class="fas fa-trash-alt"></i> Delete Marks
                </button>
                <button class="btn btn-primary" onclick="saveAdminMarks()">
                    <i class="fas fa-save"></i> Save Marks
                </button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        ${subjects.map(sub => `<th>${sub} (${getMaxMarks(examType, sub, classNum)})</th>`).join('')}
                        <th>Total</th>
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody id="admin-marks-tbody">
        `;
        
        students.forEach(student => {
            const studentMarks = marksData.filter(m => m.student_id === student.id) || [];
            const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
            
            html += `<tr data-studentid="${student.id}" data-class="${classNum}">
                <td>${student.roll_number}</td>
                <td>${student.student_name}</td>
            `;
            
            let allPass = true;
            let hasMarks = false;
            let anyFail = false;
            let anyAbsent = false;
            
            subjects.forEach(sub => {
                const markRecord = studentMarks.find(m => m.subject === sub);
                const markVal = markRecord ? (isGraded ? markRecord.pass_fail : (markRecord.pass_fail === 'AB' ? 'AB' : (markRecord.marks !== null ? markRecord.marks : ''))) : '';
                
                if (markVal !== '') hasMarks = true;
                if (!isGraded && markRecord && markRecord.pass_fail === 'AB') anyAbsent = true;
                if (!isGraded && markRecord && markRecord.pass_fail !== 'AB' && !isPassingGrade(markRecord.pass_fail)) anyFail = true;
                if (!isGraded && (!markRecord || !isPassingGrade(markRecord.pass_fail))) allPass = false;
                
                if (isGraded) {
                    html += `
                        <td>
                            <select class="table-select mark-input" data-subject="${sub}">
                                <option value="">--</option>
                                <option value="A" ${markVal === 'A' ? 'selected' : ''}>A</option>
                                <option value="B" ${markVal === 'B' ? 'selected' : ''}>B</option>
                                <option value="C" ${markVal === 'C' ? 'selected' : ''}>C</option>
                            </select>
                        </td>
                    `;
                } else {
                    html += `
                        <td>
                            <input type="text" class="marks-input mark-input" 
                                   data-subject="${sub}" 
                                   value="${markVal}" 
                                   placeholder="Max: ${getMaxMarks(examType, sub, classNum)} or AB"
                                   oninput="updateAdminRowTotal(this.closest('tr'), '${examType}')">
                        </td>
                    `;
                }
            });
            
            let resultHtml = '-';
            if (hasMarks) {
                if (isGraded) {
                    resultHtml = '<span class="badge badge-pass">Graded</span>';
                } else if (anyAbsent) {
                    resultHtml = '<span class="badge badge-info" style="background-color: #64748b; color: white;">Absent</span>';
                } else {
                    if (anyFail) {
                        resultHtml = '<span class="badge badge-fail">Fail</span>';
                    } else if (allPass) {
                        resultHtml = '<span class="badge badge-pass">Pass</span>';
                    }
                }
            }
            
            html += `<td class="total-cell">-</td><td>${resultHtml}</td></tr>`;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
        
        // Calculate totals initially
        const tbody = document.getElementById('admin-marks-tbody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                updateAdminRowTotal(row, examType);
            });
        }
        
    } catch (err) {
        console.error(err);
        showToast('Failed to load marks', 'error');
    } finally {
        hideLoading();
    }
}

async function saveAdminMarks() {
    if (!currentMarksContext) return;
    
    showLoading();
    try {
        const { examType, classNum, schoolId, subjects } = currentMarksContext;
        const tbody = document.getElementById('admin-marks-tbody');
        const rows = tbody.querySelectorAll('tr');
        const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
        
        const upsertData = [];
        
        rows.forEach(row => {
            const studentId = row.dataset.studentid;
            const inputs = row.querySelectorAll('.mark-input');
            
            let totalSum = 0;
            let anyFail = false;
            let allPass = true;
            let anyAbsent = false;
            let allAbsent = true;
            let allEmpty = true;
            let hasAnyMark = false;
            
            inputs.forEach(input => {
                const subject = input.dataset.subject;
                const markStr = input.value.trim();
                
                if (markStr !== '') {
                    hasAnyMark = true;
                    allEmpty = false;
                    if (isGraded) {
                        upsertData.push({
                            student_id: studentId,
                            school_id: schoolId,
                            class_number: classNum,
                            exam_type: examType,
                            subject: subject,
                            marks: null,
                            pass_fail: markStr
                        });
                    } else {
                        const valUpper = markStr.toUpperCase();
                        if (valUpper === 'AB') {
                            anyAbsent = true;
                            upsertData.push({
                                student_id: studentId,
                                school_id: schoolId,
                                class_number: classNum,
                                exam_type: examType,
                                subject: subject,
                                marks: null,
                                pass_fail: 'AB'
                            });
                        } else {
                            const marksNum = parseFloat(markStr);
                            const maxMarks = getMaxMarks(examType, subject, classNum);
                            if (isNaN(marksNum) || marksNum < 0 || marksNum > maxMarks) {
                                showToast(`Invalid marks entered. Must be between 0 and ${maxMarks}, or AB.`, 'error');
                                hideLoading();
                                return;
                            }
                            totalSum += marksNum;
                            allAbsent = false;
                            const pf = calculatePassFail(marksNum, examType, subject, classNum);
                            if (pf === 'Fail' || pf === 'Grade-D') anyFail = true;
                            
                            upsertData.push({
                                student_id: studentId,
                                school_id: schoolId,
                                class_number: classNum,
                                exam_type: examType,
                                subject: subject,
                                marks: marksNum,
                                pass_fail: pf
                            });
                        }
                    }
                } else {
                    allPass = false;
                }
            });
            
            if (hasAnyMark && !isGraded && !allEmpty) {
                let pf = 'Incomplete';
                if (anyAbsent && allAbsent) {
                    pf = 'AB';
                } else if (anyFail) {
                    pf = 'Fail';
                } else if (allPass) {
                    pf = 'Pass';
                }
                
                upsertData.push({
                    student_id: studentId,
                    school_id: schoolId,
                    class_number: classNum,
                    exam_type: examType,
                    subject: 'Total',
                    marks: totalSum,
                    pass_fail: pf
                });
            }
        });
        
        if (upsertData.length > 0) {
            const { error } = await supabase.from('exam_marks').upsert(upsertData, {
                onConflict: 'student_id, exam_type, subject'
            });
            if (error) throw error;
        }
        
        showToast('Marks saved successfully', 'success');
        await loadAdminMarks();
        
    } catch (err) {
        console.error(err);
        showToast('Failed to save marks', 'error');
    } finally {
        hideLoading();
    }
}

function updateAdminRowTotal(row, examType) {
    const inputs = row.querySelectorAll('.mark-input');
    const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
    const classVal = row.dataset.class;
    
    let totalSum = 0;
    let allEmpty = true;
    
    inputs.forEach(input => {
        const val = input.value.trim().toUpperCase();
        const subject = input.dataset.subject;
        const maxMarks = getMaxMarks(examType, subject, classVal);
        if (val !== '') {
            if (val !== 'AB') {
                const mark = parseFloat(val);
                if (!isNaN(mark) && mark >= 0 && mark <= maxMarks) {
                    totalSum += mark;
                    allEmpty = false;
                }
            } else {
                allEmpty = false;
            }
        }
    });
    
    const totalCell = row.querySelector('.total-cell');
    if (totalCell) {
        totalCell.textContent = isGraded ? '-' : (allEmpty ? '-' : totalSum);
    }
}

async function deleteAdminMarks() {
    if (!currentMarksContext) return;
    const { examType, students } = currentMarksContext;
    
    if (!confirm(`Are you sure you want to delete all marks for this class, section, and exam? This cannot be undone.`)) {
        return;
    }
    
    showLoading();
    try {
        const studentIds = students.map(s => s.id);
        const { error } = await supabase
            .from('exam_marks')
            .delete()
            .eq('exam_type', examType)
            .in('student_id', studentIds);
            
        if (error) throw error;
        
        showToast('Marks deleted successfully', 'success');
        await loadAdminMarks();
    } catch (err) {
        console.error(err);
        showToast('Failed to delete marks', 'error');
    } finally {
        hideLoading();
    }
}

function onAdminReportTypeChange() {
    const type = document.getElementById('report-filter-type').value;
    const schoolSelect = document.getElementById('report-filter-school');
    const schoolSearch = document.getElementById('report-school-search');
    const classSelect = document.getElementById('report-filter-class');
    const sectionSelect = document.getElementById('report-filter-section');
    const examSelect = document.getElementById('report-filter-exam');
    
    if (schoolSearch) {
        schoolSearch.disabled = (type === 'combined_marks' || type === 'schools');
        if (type === 'combined_marks' || type === 'schools') {
            schoolSearch.value = '';
        }
    }
    
    if (type === 'marks') {
        schoolSelect.disabled = false;
        classSelect.disabled = false;
        sectionSelect.disabled = false;
        examSelect.disabled = false;
    } else if (type === 'combined_marks') {
        schoolSelect.value = '';
        schoolSelect.disabled = true;
        classSelect.disabled = false;
        sectionSelect.disabled = false;
        examSelect.disabled = false;
    } else if (type === 'students') {
        schoolSelect.disabled = false;
        classSelect.disabled = false;
        sectionSelect.disabled = false;
        examSelect.value = '';
        examSelect.disabled = true;
    } else if (type === 'staff') {
        schoolSelect.disabled = false;
        classSelect.value = '';
        classSelect.disabled = true;
        sectionSelect.value = '';
        sectionSelect.disabled = true;
        examSelect.value = '';
        examSelect.disabled = true;
    } else if (type === 'staffing_particulars') {
        schoolSelect.disabled = false;
        classSelect.value = '';
        classSelect.disabled = true;
        sectionSelect.value = '';
        sectionSelect.disabled = true;
        examSelect.value = '';
        examSelect.disabled = true;
    } else if (type === 'schools') {
        schoolSelect.value = '';
        schoolSelect.disabled = true;
        classSelect.value = '';
        classSelect.disabled = true;
        sectionSelect.value = '';
        sectionSelect.disabled = true;
        examSelect.value = '';
        examSelect.disabled = true;
    }
}

async function exportAdminExcel() {
    const type = document.getElementById('report-filter-type').value;
    const schoolId = document.getElementById('report-filter-school').value;
    const classVal = document.getElementById('report-filter-class').value;
    const sectionVal = document.getElementById('report-filter-section').value;
    const examType = document.getElementById('report-filter-exam').value;
    
    showLoading();
    try {
        if (type === 'marks' || type === 'combined_marks') {
            if (type === 'marks' && (!schoolId || !examType)) {
                showToast('Please select at least School and Exam for marks report', 'warning');
                hideLoading();
                return;
            }
            if (type === 'combined_marks' && (!classVal || !examType)) {
                showToast('Please select at least Class and Exam for combined report', 'warning');
                hideLoading();
                return;
            }
            
            let stuQuery = supabase.from('students').select('*');
            if (type === 'marks') {
                stuQuery = stuQuery.eq('school_id', schoolId);
            }
            if (classVal) stuQuery = stuQuery.eq('class_number', classVal);
            if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
            const { data: students, error: stuError } = await stuQuery.order('school_id').order('class_number').order('section').order('roll_number');
            if (stuError) throw stuError;
            
            if (!students || students.length === 0) {
                showToast('No students found for export', 'warning');
                hideLoading();
                return;
            }
            
            let marks;
            if (type === 'marks') {
                const studentIds = students.map(s => s.id);
                const { data: mData, error: marksError } = await supabase
                    .from('exam_marks')
                    .select('*')
                    .eq('exam_type', examType)
                    .in('student_id', studentIds);
                if (marksError) throw marksError;
                marks = mData;
            } else {
                // Fetch all marks for this class and exam type across all schools
                const { data: mData, error: marksError } = await supabase
                    .from('exam_marks')
                    .select('*')
                    .eq('class_number', classVal)
                    .eq('exam_type', examType);
                if (marksError) throw marksError;
                
                const studentIdsSet = new Set(students.map(s => s.id));
                marks = mData.filter(m => studentIdsSet.has(m.student_id));
            }
            
            const school = allSchools.find(s => s.id === schoolId);
            const schoolName = school ? school.school_name : 'All_Schools_Combined';
            
            const reportData = [];
            const subjects = classVal ? getSubjects(classVal, examType) : ['Telugu', 'English', 'Maths'];
            
            students.forEach(student => {
                const sSchool = allSchools.find(s => s.id === student.school_id);
                const sSchoolName = sSchool ? sSchool.school_name : 'Unknown';
                const row = {
                    'School': sSchoolName,
                    'Class': classDisplayName(student.class_number),
                    'Section': student.section,
                    'Roll No': student.roll_number,
                    'Student Name': student.student_name,
                    'Gender': getGenderLabel(student.gender)
                };
                
                const sSubjects = getSubjects(student.class_number, examType);
                const studentMarks = marks.filter(m => m.student_id === student.id);
                const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
                
                let anyFail = false;
                let allPass = true;
                let hasMarks = false;
                let anyAbsent = false;
                let totalSum = 0;
                let allEmpty = true;
                
                sSubjects.forEach(sub => {
                    const mark = studentMarks.find(m => m.subject === sub);
                    if (mark) {
                        row[sub] = isGraded ? mark.pass_fail : (mark.pass_fail === 'AB' ? 'AB' : mark.marks);
                        hasMarks = true;
                        if (!isGraded) {
                            if (mark.pass_fail === 'AB') {
                                anyAbsent = true;
                            } else if (mark.marks !== null) {
                                totalSum += mark.marks;
                                allEmpty = false;
                            }
                            if (mark.pass_fail !== 'AB' && !isPassingGrade(mark.pass_fail)) anyFail = true;
                        }
                    } else {
                        row[sub] = '';
                        if (!isGraded) allPass = false;
                    }
                });
                
                row['Total'] = isGraded ? '-' : (allEmpty ? '-' : totalSum);
                
                if (hasMarks) {
                    row['Result'] = isGraded ? 'Graded' : (anyAbsent ? 'Absent' : (anyFail ? 'Fail' : (allPass ? 'Pass' : 'Incomplete')));
                } else {
                    row['Result'] = '';
                }
                reportData.push(row);
            });
            
            const worksheet = XLSX.utils.json_to_sheet(reportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Marks Report");
            
            // Calculate Grade Distribution for Excel
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
            const isGradedExcel = ['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(String(examType).toUpperCase());
            students.forEach(student => {
                subjects.forEach(sub => {
                    const m = marks.find(mark => mark && mark.student_id === student.id && mark.subject === sub);
                    if (m) {
                        let grade = null;
                        if (isGradedExcel) {
                            const g = String(m.pass_fail || '').toUpperCase();
                            if (g === 'A') grade = 'Grade-A';
                            else if (g === 'B') grade = 'Grade-B';
                            else if (g === 'C') grade = 'Grade-C';
                        } else if (m.marks !== null && m.marks !== undefined && m.marks !== '') {
                            const marksVal = parseFloat(m.marks);
                            if (!isNaN(marksVal)) {
                                grade = calculatePassFail(marksVal, examType, sub);
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
            
            const distData = subjects.map(sub => {
                const sDist = dist[sub];
                const passed = sDist['Grade-A'] + sDist['Grade-B'] + sDist['Grade-C'];
                const failed = sDist['Grade-D'];
                const totalGraded = sDist['Total'];
                const passPercent = totalGraded > 0 ? Math.round((passed / totalGraded) * 100) : 0;
                
                let avgMarks = '-';
                let avgPercent = '-';
                let highest = '-';
                let lowest = '-';
                
                if (!isGradedExcel && sDist['countMarks'] > 0) {
                    const avg = sDist['sumMarks'] / sDist['countMarks'];
                    const maxMarks = getMaxMarks(examType, sub, classVal);
                    avgMarks = avg.toFixed(2);
                    avgPercent = `${Math.round((avg / maxMarks) * 100)}%`;
                    highest = sDist['highestMark'];
                    lowest = sDist['lowestMark'];
                }
                
                return {
                    'Subject': sub,
                    'Grade-A (Excellent)': sDist['Grade-A'],
                    'Grade-B (Good)': sDist['Grade-B'],
                    'Grade-C (Satisfactory)': sDist['Grade-C'],
                    'Grade-D (Needs Improvement)': sDist['Grade-D'],
                    'Total Graded': totalGraded,
                    'Passed Count': passed,
                    'Failed Count': failed,
                    'Pass %': `${passPercent}%`,
                    'Average Marks': avgMarks,
                    'Average Marks %': avgPercent,
                    'Highest Mark': highest,
                    'Lowest Mark': lowest
                };
            });
            
            const distWorksheet = XLSX.utils.json_to_sheet(distData);
            XLSX.utils.book_append_sheet(workbook, distWorksheet, "Grade Distribution");

            const fileName = `${schoolName.replace(/\s+/g, '_')}_Marks_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showToast('Marks export successful', 'success');
            
        } else if (type === 'students') {
            let stuQuery = supabase.from('students').select('*');
            if (schoolId) stuQuery = stuQuery.eq('school_id', schoolId);
            if (classVal) stuQuery = stuQuery.eq('class_number', classVal);
            if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
            
            const { data: students, error: stuError } = await stuQuery.order('school_id').order('class_number').order('section').order('roll_number');
            if (stuError) throw stuError;
            
            if (!students || students.length === 0) {
                showToast('No students found for export', 'warning');
                hideLoading();
                return;
            }
            
            const reportData = students.map(student => {
                const school = allSchools.find(s => s.id === student.school_id);
                return {
                    'School': school ? school.school_name : 'Unknown',
                    'Class': classDisplayName(student.class_number),
                    'Section': student.section,
                    'Roll No': student.roll_number,
                    'Student Name': student.student_name,
                    'Gender': getGenderLabel(student.gender)
                };
            });
            
            const worksheet = XLSX.utils.json_to_sheet(reportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Students List");
            const fileName = `Students_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showToast('Students list export successful', 'success');
            
        } else if (type === 'staff') {
            let staffQuery = supabase.from('staff').select('*');
            if (schoolId) staffQuery = staffQuery.eq('school_id', schoolId);
            
            const { data: staffList, error: staffError } = await staffQuery.order('school_id').order('staff_name');
            if (staffError) throw staffError;
            
            if (!staffList || staffList.length === 0) {
                showToast('No staff records found for export', 'warning');
                hideLoading();
                return;
            }
            
            const reportData = staffList.map(s => {
                const school = allSchools.find(sc => sc.id === s.school_id);
                return {
                    'School': school ? school.school_name : 'Unknown',
                    'Staff Name': s.staff_name,
                    'Designation': s.designation,
                    'Employment Type': s.employment_type,
                    'Subject': s.subject,
                    'Qualifications': formatQualificationSummary(s),
                    'Joined Service': s.joined_service_date || '-',
                    'Joined Institution': s.joined_institution_date || '-'
                };
            });
            
            const worksheet = XLSX.utils.json_to_sheet(reportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Staff Directory");
            const fileName = `Staff_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showToast('Staff export successful', 'success');
        } else if (type === 'staffing_particulars') {
            let staffingQuery = supabase.from('staffing_particulars').select('*');
            if (schoolId) staffingQuery = staffingQuery.eq('school_id', schoolId);
            
            const { data: list, error: staffError } = await staffingQuery.order('school_id').order('post_name');
            if (staffError) throw staffError;
            
            if (!list || list.length === 0) {
                showToast('No staffing records found for export', 'warning');
                hideLoading();
                return;
            }
            
            const reportData = list.map((item, index) => {
                const school = allSchools.find(s => s.id === item.school_id);
                const schoolName = school ? school.school_name : 'Unknown';
                return {
                    'S.No': index + 1,
                    'Name of the School': schoolName,
                    'Name of the Post': item.post_name,
                    'Status': item.status,
                    'Name of the Employee': item.employee_name || '-',
                    'Employment Type': item.employment_type || '-',
                    'Date of Joining': item.joining_date || '-',
                    'Aadhar No': item.aadhar_no || '-',
                    'APCOS ID': item.apcos_id || '-',
                    'Remarks': item.remarks || '-'
                };
            });
            
            const worksheet = XLSX.utils.json_to_sheet(reportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Staffing Particulars");
            const fileName = `Staffing_Particulars_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showToast('Staffing particulars Excel export successful', 'success');
        } else if (type === 'schools') {
            if (!allSchools || allSchools.length === 0) {
                showToast('No schools found for export', 'warning');
                hideLoading();
                return;
            }
            
            const reportData = allSchools.map(s => ({
                'School Name': s.school_name,
                'Username': s.username,
                'Password': s.password,
                'Is Admin': s.is_admin ? 'Yes' : 'No',
                'Created At': s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'
            }));
            
            const worksheet = XLSX.utils.json_to_sheet(reportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Schools List");
            const fileName = `Schools_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            showToast('Schools export successful', 'success');
        }
    } catch (err) {
        console.error(err);
        showToast('Export failed', 'error');
    } finally {
        hideLoading();
    }
}

async function exportAdminPDF() {
    const type = document.getElementById('report-filter-type').value;
    const schoolId = document.getElementById('report-filter-school').value;
    const classVal = document.getElementById('report-filter-class').value;
    const sectionVal = document.getElementById('report-filter-section').value;
    const examType = document.getElementById('report-filter-exam').value;
    
    showLoading();
    try {
        const doc = new jspdf.jsPDF('landscape');
        doc.setFontSize(16);
        doc.text('School Data Portal - Report', 14, 15);
        doc.setFontSize(10);
        
        if (type === 'marks' || type === 'combined_marks') {
            if (type === 'marks' && (!schoolId || !classVal || !examType)) {
                showToast('Please select School, Class, and Exam for marks PDF', 'warning');
                hideLoading();
                return;
            }
            if (type === 'combined_marks' && (!classVal || !examType)) {
                showToast('Please select Class and Exam for combined marks PDF', 'warning');
                hideLoading();
                return;
            }
            
            let stuQuery = supabase.from('students').select('*').eq('class_number', classVal);
            if (type === 'marks') {
                stuQuery = stuQuery.eq('school_id', schoolId);
            }
            if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
            const { data: students, error: stuError } = await stuQuery.order('school_id').order('section').order('roll_number');
            if (stuError) throw stuError;
            
            if (!students || students.length === 0) {
                showToast('No students found for export', 'warning');
                hideLoading();
                return;
            }
            
            let marks;
            if (type === 'marks') {
                const studentIds = students.map(s => s.id);
                const { data: mData, error: marksError } = await supabase
                    .from('exam_marks')
                    .select('*')
                    .eq('exam_type', examType)
                    .in('student_id', studentIds);
                if (marksError) throw marksError;
                marks = mData;
            } else {
                const { data: mData, error: marksError } = await supabase
                    .from('exam_marks')
                    .select('*')
                    .eq('class_number', classVal)
                    .eq('exam_type', examType);
                if (marksError) throw marksError;
                
                const studentIdsSet = new Set(students.map(s => s.id));
                marks = mData.filter(m => studentIdsSet.has(m.student_id));
            }
            
            const school = allSchools.find(s => s.id === schoolId);
            const schoolName = school ? school.school_name : 'All_Schools_Combined';
            const subjects = getSubjects(classVal, examType);
            
            const head = type === 'combined_marks'
                ? [['School', 'Roll No', 'Name', 'Sec', ...subjects, 'Total', 'Result']]
                : [['Roll No', 'Name', 'Sec', ...subjects, 'Total', 'Result']];
            const body = [];
            
            students.forEach(student => {
                const studentMarks = marks.filter(m => m.student_id === student.id);
                const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
                
                let anyFail = false;
                let allPass = true;
                let hasMarks = false;
                let anyAbsent = false;
                let totalSum = 0;
                let allEmpty = true;
                
                const sSchool = allSchools.find(s => s.id === student.school_id);
                const sSchoolName = sSchool ? sSchool.school_name : 'Unknown';
                
                const row = type === 'combined_marks'
                    ? [sSchoolName, student.roll_number, student.student_name, student.section]
                    : [student.roll_number, student.student_name, student.section];
                
                subjects.forEach(sub => {
                    const mark = studentMarks.find(m => m.subject === sub);
                    if (mark) {
                        row.push(isGraded ? mark.pass_fail : (mark.pass_fail === 'AB' ? 'AB' : mark.marks));
                        hasMarks = true;
                        if (!isGraded) {
                            if (mark.pass_fail === 'AB') {
                                anyAbsent = true;
                            } else if (mark.marks !== null) {
                                totalSum += mark.marks;
                                allEmpty = false;
                            }
                            if (mark.pass_fail !== 'AB' && !isPassingGrade(mark.pass_fail)) anyFail = true;
                        }
                    } else {
                        row.push('-');
                        if (!isGraded) allPass = false;
                    }
                });
                
                const totalVal = isGraded ? '-' : (allEmpty ? '-' : totalSum);
                const result = hasMarks ? (isGraded ? 'Graded' : (anyAbsent ? 'Absent' : (anyFail ? 'Fail' : (allPass ? 'Pass' : 'Incomp')))) : '-';
                row.push(totalVal);
                row.push(result);
                body.push(row);
            });
            
            doc.text(`School: ${schoolName} | Class: ${classDisplayName(classVal)} | Exam: ${examType}`, 14, 22);
            doc.autoTable({
                head: head,
                body: body,
                startY: 28,
                styles: { fontSize: 8 }
            });
            
            // Add a new page for Grade Distribution Summary
            doc.addPage();
            doc.setFontSize(16);
            doc.text('Grade Distribution Summary', 14, 15);
            doc.setFontSize(10);
            doc.text(`School: ${schoolName} | Class: ${classDisplayName(classVal)} | Exam: ${examType}`, 14, 22);
            
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
            const isGradedPDF = ['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(String(examType).toUpperCase());
            students.forEach(student => {
                subjects.forEach(sub => {
                    const m = marks.find(mark => mark && mark.student_id === student.id && mark.subject === sub);
                    if (m) {
                        let grade = null;
                        if (isGradedPDF) {
                            const g = String(m.pass_fail || '').toUpperCase();
                            if (g === 'A') grade = 'Grade-A';
                            else if (g === 'B') grade = 'Grade-B';
                            else if (g === 'C') grade = 'Grade-C';
                        } else if (m.marks !== null && m.marks !== undefined && m.marks !== '') {
                            const marksVal = parseFloat(m.marks);
                            if (!isNaN(marksVal)) {
                                grade = calculatePassFail(marksVal, examType, sub);
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
            
            const distHead = [['Subject', 'Grade-A', 'Grade-B', 'Grade-C', 'Grade-D', 'Total', 'Passed', 'Failed', 'Pass %', 'Avg Marks (Avg %)', 'Highest / Lowest']];
            const distBody = subjects.map(sub => {
                const sDist = dist[sub];
                const passed = sDist['Grade-A'] + sDist['Grade-B'] + sDist['Grade-C'];
                const failed = sDist['Grade-D'];
                const totalGraded = sDist['Total'];
                const passPercent = totalGraded > 0 ? Math.round((passed / totalGraded) * 100) : 0;
                
                let avgStr = '-';
                let highLowStr = '-';
                
                if (!isGradedPDF && sDist['countMarks'] > 0) {
                    const avg = sDist['sumMarks'] / sDist['countMarks'];
                    const maxMarks = getMaxMarks(examType, sub, classVal);
                    const avgPct = Math.round((avg / maxMarks) * 100);
                    avgStr = `${avg.toFixed(1)} / ${maxMarks} (${avgPct}%)`;
                    highLowStr = `${sDist['highestMark']} / ${sDist['lowestMark']}`;
                }
                
                return [
                    sub,
                    sDist['Grade-A'],
                    sDist['Grade-B'],
                    sDist['Grade-C'],
                    sDist['Grade-D'],
                    totalGraded,
                    passed,
                    failed,
                    `${passPercent}%`,
                    avgStr,
                    highLowStr
                ];
            });
            
            doc.autoTable({
                head: distHead,
                body: distBody,
                startY: 28,
                styles: { fontSize: 8 }
            });
            
            doc.save(`${schoolName.replace(/\s+/g, '_')}_Marks_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Marks PDF export successful', 'success');
            
        } else if (type === 'students') {
            let stuQuery = supabase.from('students').select('*');
            if (schoolId) stuQuery = stuQuery.eq('school_id', schoolId);
            if (classVal) stuQuery = stuQuery.eq('class_number', classVal);
            if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
            
            const { data: students, error: stuError } = await stuQuery.order('school_id').order('class_number').order('section').order('roll_number');
            if (stuError) throw stuError;
            
            if (!students || students.length === 0) {
                showToast('No students found for export', 'warning');
                hideLoading();
                return;
            }
            
            const school = allSchools.find(s => s.id === schoolId);
            const schoolName = school ? school.school_name : 'All Schools';
            
            const head = [['School', 'Class', 'Sec', 'Roll No', 'Student Name', 'Gender']];
            const body = students.map(student => {
                const sName = allSchools.find(s => s.id === student.school_id)?.school_name || 'Unknown';
                return [
                    sName,
                    classDisplayName(student.class_number),
                    student.section,
                    student.roll_number,
                    student.student_name,
                    getGenderLabel(student.gender)
                ];
            });
            
            doc.text(`School: ${schoolName} | Class: ${classVal ? classDisplayName(classVal) : 'All'} | Section: ${sectionVal || 'All'}`, 14, 22);
            doc.autoTable({
                head: head,
                body: body,
                startY: 28,
                styles: { fontSize: 8 }
            });
            doc.save(`Students_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Students PDF export successful', 'success');
            
        } else if (type === 'staff') {
            let staffQuery = supabase.from('staff').select('*');
            if (schoolId) staffQuery = staffQuery.eq('school_id', schoolId);
            
            const { data: staffList, error: staffError } = await staffQuery.order('school_id').order('staff_name');
            if (staffError) throw staffError;
            
            if (!staffList || staffList.length === 0) {
                showToast('No staff records found for export', 'warning');
                hideLoading();
                return;
            }
            
            const school = allSchools.find(s => s.id === schoolId);
            const schoolName = school ? school.school_name : 'All Schools';
            
            const head = [['School', 'Staff Name', 'Designation', 'Type', 'Subject', 'Qualifications']];
            const body = staffList.map(s => {
                const sName = allSchools.find(sc => sc.id === s.school_id)?.school_name || 'Unknown';
                return [
                    sName,
                    s.staff_name,
                    s.designation,
                    s.employment_type,
                    s.subject,
                    formatQualificationSummary(s)
                ];
            });
            
            doc.text(`School: ${schoolName} | Staff Directory Report`, 14, 22);
            doc.autoTable({
                head: head,
                body: body,
                startY: 28,
                styles: { fontSize: 8 }
            });
            doc.save(`Staff_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Staff PDF export successful', 'success');
        } else if (type === 'staffing_particulars') {
            let staffingQuery = supabase.from('staffing_particulars').select('*');
            if (schoolId) staffingQuery = staffingQuery.eq('school_id', schoolId);
            
            const { data: list, error: staffError } = await staffingQuery.order('school_id').order('post_name');
            if (staffError) throw staffError;
            
            if (!list || list.length === 0) {
                showToast('No staffing records found for export', 'warning');
                hideLoading();
                return;
            }
            
            const school = allSchools.find(s => s.id === schoolId);
            const schoolName = school ? school.school_name : 'All Schools';
            
            const head = [['S.No', 'School Name', 'Name of the Post', 'Status', 'Employee Name', 'Type', 'Date of Joining', 'Aadhar No', 'APCOS ID', 'Remarks']];
            const body = list.map((item, index) => {
                const sName = allSchools.find(sc => sc.id === item.school_id)?.school_name || 'Unknown';
                return [
                    index + 1,
                    sName,
                    item.post_name,
                    item.status,
                    item.employee_name || '-',
                    item.employment_type || '-',
                    item.joining_date ? new Date(item.joining_date).toLocaleDateString() : '-',
                    item.aadhar_no || '-',
                    item.apcos_id || '-',
                    item.remarks || '-'
                ];
            });
            
            doc.text(`School: ${schoolName} | Staffing Particulars Report`, 14, 22);
            doc.autoTable({
                head: head,
                body: body,
                startY: 28,
                styles: { fontSize: 8 }
            });
            doc.save(`Staffing_Particulars_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Staffing particulars PDF export successful', 'success');
        } else if (type === 'schools') {
            if (!allSchools || allSchools.length === 0) {
                showToast('No schools found for export', 'warning');
                hideLoading();
                return;
            }
            
            const head = [['School Name', 'Username', 'Password', 'Admin Status', 'Registered Date']];
            const body = allSchools.map(s => [
                s.school_name,
                s.username,
                s.password,
                s.is_admin ? 'Yes' : 'No',
                s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'
            ]);
            
            doc.text('Global Schools List Report', 14, 22);
            doc.autoTable({
                head: head,
                body: body,
                startY: 28,
                styles: { fontSize: 8 }
            });
            doc.save(`Schools_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Schools PDF export successful', 'success');
        }
    } catch (err) {
        console.error(err);
        showToast('Export failed', 'error');
    } finally {
        hideLoading();
    }
}

async function generateReport() {
    const type = document.getElementById('report-filter-type').value;
    const schoolId = document.getElementById('report-filter-school').value;
    const classVal = document.getElementById('report-filter-class').value;
    const sectionVal = document.getElementById('report-filter-section').value;
    const examType = document.getElementById('report-filter-exam').value;
    const previewContainer = document.getElementById('report-preview');
    
    if (!previewContainer) return;
    
    previewContainer.innerHTML = '';
    
    showLoading();
    try {
        if (type === 'marks') {
            if (!schoolId || !examType) {
                previewContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-info-circle"></i>
                        <h4>Configure Filters</h4>
                        <p>Select at least School and Exam to view marks preview</p>
                    </div>
                `;
                hideLoading();
                return;
            }
            
            let stuQuery = supabase.from('students').select('*').eq('school_id', schoolId);
            if (classVal) stuQuery = stuQuery.eq('class_number', classVal);
            if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
            const { data: students, error: stuError } = await stuQuery.order('class_number').order('section').order('roll_number');
            if (stuError) throw stuError;
            
            if (!students || students.length === 0) {
                previewContainer.innerHTML = '<div class="text-center p-4">No student records found matching filters.</div>';
                hideLoading();
                return;
            }
            
            const studentIds = students.map(s => s.id);
            const { data: marks, error: marksError } = await supabase
                .from('exam_marks')
                .select('*')
                .eq('exam_type', examType)
                .in('student_id', studentIds);
            if (marksError) throw marksError;
            
            const subjects = classVal ? getSubjects(classVal, examType) : ['Telugu', 'English', 'Maths'];
            
            let html = `
                <div class="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>Roll No</th>
                                <th>Name</th>
                                <th>Class</th>
                                <th>Sec</th>
                                ${subjects.map(sub => `<th>${sub}</th>`).join('')}
                                <th>Total</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            students.forEach(student => {
                const studentMarks = marks.filter(m => m.student_id === student.id);
                const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
                
                let anyFail = false;
                let allPass = true;
                let hasMarks = false;
                let anyAbsent = false;
                let totalSum = 0;
                let allEmpty = true;
                
                let rowHtml = `
                    <tr>
                        <td>${student.roll_number}</td>
                        <td>${student.student_name}</td>
                        <td>${classDisplayName(student.class_number)}</td>
                        <td>${student.section}</td>
                `;
                
                subjects.forEach(sub => {
                    const mark = studentMarks.find(m => m.subject === sub);
                    const val = mark ? (isGraded ? mark.pass_fail : (mark.pass_fail === 'AB' ? 'AB' : (mark.marks !== null ? mark.marks : ''))) : '';
                    if (val !== '') hasMarks = true;
                    if (!isGraded) {
                        if (mark && mark.pass_fail === 'AB') {
                            anyAbsent = true;
                        } else if (mark && mark.marks !== null) {
                            totalSum += mark.marks;
                            allEmpty = false;
                        }
                        if (mark && mark.pass_fail !== 'AB' && !isPassingGrade(mark.pass_fail)) anyFail = true;
                    }
                    if (!isGraded && (!mark || !isPassingGrade(mark.pass_fail))) allPass = false;
                    
                    rowHtml += `<td>${val !== '' ? val : '-'}</td>`;
                });
                
                const totalVal = isGraded ? '-' : (allEmpty ? '-' : totalSum);
                let result = '-';
                if (hasMarks) {
                    result = isGraded ? '<span class="badge badge-pass">Graded</span>' : (anyAbsent ? '<span class="badge badge-info" style="background-color: #64748b; color: white;">Absent</span>' : (anyFail ? '<span class="badge badge-fail">Fail</span>' : (allPass ? '<span class="badge badge-pass">Pass</span>' : '<span class="badge badge-info">Incomplete</span>')));
                }
                
                rowHtml += `<td>${totalVal}</td><td>${result}</td></tr>`;
                html += rowHtml;
            });
            
            html += `</tbody></table></div>`;
            const distHtml = getGradeDistributionHTML(students, marks, subjects, examType);
            html += distHtml;
            previewContainer.innerHTML = html;
            
        } else if (type === 'combined_marks') {
            if (!classVal || !examType) {
                previewContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-info-circle"></i>
                        <h4>Configure Filters</h4>
                        <p>Select at least Class and Exam to view combined marks preview</p>
                    </div>
                `;
                hideLoading();
                return;
            }
            
            let stuQuery = supabase.from('students').select('*').eq('class_number', classVal);
            if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
            const { data: students, error: stuError } = await stuQuery.order('school_id').order('section').order('roll_number');
            if (stuError) throw stuError;
            
            if (!students || students.length === 0) {
                previewContainer.innerHTML = '<div class="text-center p-4">No student records found matching filters.</div>';
                hideLoading();
                return;
            }
            
            let marksQuery = supabase.from('exam_marks').select('*')
                .eq('class_number', classVal)
                .eq('exam_type', examType);
            const { data: marks, error: marksError } = await marksQuery;
            if (marksError) throw marksError;
            
            const studentIdsSet = new Set(students.map(s => s.id));
            const filteredMarks = marks.filter(m => studentIdsSet.has(m.student_id));
            
            const subjects = getSubjects(classVal, examType);
            
            let html = `
                <div style="margin-bottom: 1.5rem; background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px 20px; border-radius: 8px; font-weight: 500; color: #1e40af; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-info-circle"></i> Combined Report: Showing ${students.length} students across all schools.
                </div>
                <div class="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>School</th>
                                <th>Roll No</th>
                                <th>Name</th>
                                <th>Class</th>
                                <th>Sec</th>
                                ${subjects.map(sub => `<th>${sub}</th>`).join('')}
                                <th>Total</th>
                                <th>Result</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            students.forEach(student => {
                const school = allSchools.find(s => s.id === student.school_id);
                const schoolName = school ? school.school_name : 'Unknown';
                
                const studentMarks = filteredMarks.filter(m => m.student_id === student.id);
                const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
                
                let anyFail = false;
                let allPass = true;
                let hasMarks = false;
                let anyAbsent = false;
                let totalSum = 0;
                let allEmpty = true;
                
                let rowHtml = `
                    <tr>
                        <td style="font-weight: 500; color: #1e3a8a;">${schoolName}</td>
                        <td>${student.roll_number}</td>
                        <td>${student.student_name}</td>
                        <td>${classDisplayName(student.class_number)}</td>
                        <td>${student.section}</td>
                `;
                
                subjects.forEach(sub => {
                    const mark = studentMarks.find(m => m.subject === sub);
                    const val = mark ? (isGraded ? mark.pass_fail : (mark.pass_fail === 'AB' ? 'AB' : (mark.marks !== null ? mark.marks : ''))) : '';
                    if (val !== '') hasMarks = true;
                    if (!isGraded) {
                        if (mark && mark.pass_fail === 'AB') {
                            anyAbsent = true;
                        } else if (mark && mark.marks !== null) {
                            totalSum += mark.marks;
                            allEmpty = false;
                        }
                        if (mark && mark.pass_fail !== 'AB' && !isPassingGrade(mark.pass_fail)) anyFail = true;
                    }
                    if (!isGraded && (!mark || !isPassingGrade(mark.pass_fail))) allPass = false;
                    
                    rowHtml += `<td>${val !== '' ? val : '-'}</td>`;
                });
                
                const totalVal = isGraded ? '-' : (allEmpty ? '-' : totalSum);
                let result = '-';
                if (hasMarks) {
                    result = isGraded ? '<span class="badge badge-pass">Graded</span>' : (anyAbsent ? '<span class="badge badge-info" style="background-color: #64748b; color: white;">Absent</span>' : (anyFail ? '<span class="badge badge-fail">Fail</span>' : (allPass ? '<span class="badge badge-pass">Pass</span>' : '<span class="badge badge-info">Incomplete</span>')));
                }
                
                rowHtml += `<td>${totalVal}</td><td>${result}</td></tr>`;
                html += rowHtml;
            });
            
            html += `</tbody></table></div>`;
            const distHtml = getGradeDistributionHTML(students, filteredMarks, subjects, examType);
            html += distHtml;
            previewContainer.innerHTML = html;
            
        } else if (type === 'students') {
            let stuQuery = supabase.from('students').select('*');
            if (schoolId) stuQuery = stuQuery.eq('school_id', schoolId);
            if (classVal) stuQuery = stuQuery.eq('class_number', classVal);
            if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
            
            const { data: students, error: stuError } = await stuQuery.order('school_id').order('class_number').order('section').order('roll_number');
            if (stuError) throw stuError;
            
            if (!students || students.length === 0) {
                previewContainer.innerHTML = '<div class="text-center p-4">No student records found matching filters.</div>';
                hideLoading();
                return;
            }
            
            let html = `
                <div class="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>School</th>
                                <th>Class</th>
                                <th>Section</th>
                                <th>Roll No</th>
                                <th>Student Name</th>
                                <th>Gender</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            students.forEach(student => {
                const schoolName = allSchools.find(s => s.id === student.school_id)?.school_name || 'Unknown';
                html += `
                    <tr>
                        <td>${schoolName}</td>
                        <td>${classDisplayName(student.class_number)}</td>
                        <td>${student.section}</td>
                        <td>${student.roll_number}</td>
                        <td>${student.student_name}</td>
                        <td>${getGenderLabel(student.gender) || '-'}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            previewContainer.innerHTML = html;
            
        } else if (type === 'staff') {
            let staffQuery = supabase.from('staff').select('*');
            if (schoolId) staffQuery = staffQuery.eq('school_id', schoolId);
            
            const { data: staffList, error: staffError } = await staffQuery.order('school_id').order('staff_name');
            if (staffError) throw staffError;
            
            if (!staffList || staffList.length === 0) {
                previewContainer.innerHTML = '<div class="text-center p-4">No staff records found.</div>';
                hideLoading();
                return;
            }
            
            let html = `
                <div class="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>School</th>
                                <th>Name</th>
                                <th>Designation</th>
                                <th>Type</th>
                                <th>Subject</th>
                                <th>Qualifications</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            staffList.forEach(s => {
                const schoolName = allSchools.find(sc => sc.id === s.school_id)?.school_name || 'Unknown';
                html += `
                    <tr>
                        <td>${schoolName}</td>
                        <td>${s.staff_name}</td>
                        <td>${s.designation}</td>
                        <td>${s.employment_type}</td>
                        <td>${s.subject}</td>
                        <td>${formatQualificationSummary(s)}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            previewContainer.innerHTML = html;
        } else if (type === 'staffing_particulars') {
            let staffingQuery = supabase.from('staffing_particulars').select('*');
            if (schoolId) staffingQuery = staffingQuery.eq('school_id', schoolId);
            
            const { data: list, error: staffError } = await staffingQuery.order('school_id').order('post_name');
            if (staffError) throw staffError;
            
            if (!list || list.length === 0) {
                previewContainer.innerHTML = '<div class="text-center p-4">No staffing records found.</div>';
                hideLoading();
                return;
            }
            
            let html = `
                <div class="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>School</th>
                                <th>Name of the Post</th>
                                <th>Status</th>
                                <th>Name of the Employee</th>
                                <th>Type of Employment</th>
                                <th>Date of Joining</th>
                                <th>Aadhar No</th>
                                <th>APCOS ID</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            list.forEach(s => {
                const schoolName = allSchools.find(sc => sc.id === s.school_id)?.school_name || 'Unknown';
                let statusHtml = '<span class="badge badge-fail">Vacant</span>';
                if (s.status === 'Filled') statusHtml = '<span class="badge badge-pass">Filled</span>';
                else if (s.status === 'Not Sanctioned') statusHtml = '<span class="badge badge-warning">Not Sanctioned</span>';
                const formattedDate = s.joining_date ? new Date(s.joining_date).toLocaleDateString() : '-';
                html += `
                    <tr>
                        <td style="font-weight: 500; color: #1e3a8a;">${schoolName}</td>
                        <td style="font-weight: 500;">${s.post_name}</td>
                        <td>${statusHtml}</td>
                        <td>${s.employee_name || '-'}</td>
                        <td>${s.employment_type || '-'}</td>
                        <td>${formattedDate}</td>
                        <td>${s.aadhar_no || '-'}</td>
                        <td>${s.apcos_id || '-'}</td>
                        <td>${s.remarks || '-'}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            previewContainer.innerHTML = html;
        } else if (type === 'schools') {
            if (!allSchools || allSchools.length === 0) {
                previewContainer.innerHTML = '<div class="text-center p-4">No school records found.</div>';
                hideLoading();
                return;
            }
            
            let html = `
                <div class="table-container mt-4">
                    <table>
                        <thead>
                            <tr>
                                <th>School Name</th>
                                <th>Username</th>
                                <th>Password</th>
                                <th>Admin Status</th>
                                <th>Registered Date</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            allSchools.forEach(s => {
                html += `
                    <tr>
                        <td>${s.school_name}</td>
                        <td><code>${s.username}</code></td>
                        <td><code>${s.password}</code></td>
                        <td>${s.is_admin ? '<span class="badge badge-pass">Admin</span>' : '<span class="badge badge-info">School</span>'}</td>
                        <td>${s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
                    </tr>
                `;
            });
            
            html += `</tbody></table></div>`;
            previewContainer.innerHTML = html;
        }
    } catch (err) {
        console.error(err);
        showToast('Failed to generate report preview', 'error');
    } finally {
        hideLoading();
    }
}

function populateFilterDropdown(selectId, options, valueKey, textKey) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // keep first option
    const firstOption = select.options[0];
    select.innerHTML = '';
    if (firstOption) select.appendChild(firstOption);
    
    options.forEach(opt => {
        const option = document.createElement('option');
        if (typeof opt === 'object' && opt !== null && valueKey && textKey) {
            option.value = opt[valueKey];
            option.textContent = opt[textKey];
        } else if (typeof opt === 'object' && opt !== null) {
            option.value = opt.value || opt.id;
            option.textContent = opt.label || opt.name;
        } else {
            option.value = opt;
            option.textContent = opt;
        }
        select.appendChild(option);
    });
}

// ============================================
// Staff Management CRUD Logic
// ============================================
let adminStaffData = [];

function renderAdminStaff() {
    const tbody = document.getElementById('admin-staff-table');
    tbody.innerHTML = '';
    
    const searchVal = document.getElementById('staff-search-input').value.trim().toLowerCase();
    
    const filtered = adminStaffData.filter(s => {
        if (!searchVal) return true;
        const school = allSchools.find(sc => sc.id === s.school_id);
        const schoolName = school ? school.school_name.toLowerCase() : '';
        return (
            s.staff_name.toLowerCase().includes(searchVal) ||
            s.designation.toLowerCase().includes(searchVal) ||
            s.subject.toLowerCase().includes(searchVal) ||
            schoolName.includes(searchVal) ||
            formatQualificationSummary(s).toLowerCase().includes(searchVal)
        );
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No staff records found.</td></tr>';
        return;
    }
    
    filtered.forEach(s => {
        const school = allSchools.find(sc => sc.id === s.school_id);
        const schoolName = school ? school.school_name : 'Unknown School';
        
        let badgeClass = 'badge-info';
        if (s.employment_type === 'Regular') badgeClass = 'badge-pass';
        else if (s.employment_type === 'Contract') badgeClass = 'badge-warning';
        else if (s.employment_type === 'MTS') badgeClass = 'badge-primary';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${s.staff_name}</td>
            <td>${s.designation}</td>
            <td><span class="badge ${badgeClass}">${s.employment_type}</span></td>
            <td>${formatQualificationSummary(s)}</td>
            <td>${s.subject}</td>
            <td>${s.joined_service_date ? new Date(s.joined_service_date).toLocaleDateString() : '-'}</td>
            <td>${s.joined_institution_date ? new Date(s.joined_institution_date).toLocaleDateString() : '-'}</td>
            <td>${schoolName}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="openAdminStaffModal('${s.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdminStaff('${s.id}', '${s.staff_name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function loadAdminStaff() {
    const schoolId = document.getElementById('staff-filter-school').value;
    const typeVal = document.getElementById('staff-filter-type').value;
    
    showLoading();
    try {
        let query = supabase.from('staff').select('*');
        if (schoolId) query = query.eq('school_id', schoolId);
        if (typeVal) query = query.eq('employment_type', typeVal);
        
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        
        adminStaffData = data || [];
        renderAdminStaff();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

function openAdminStaffModal(id = null) {
    const modal = document.getElementById('admin-staff-modal');
    const title = document.getElementById('admin-staff-modal-title');
    const form = document.getElementById('admin-staff-form');
    
    form.reset();
    document.getElementById('admin-staff-edit-id').value = '';
    
    if (id) {
        const s = adminStaffData.find(item => item.id === id);
        if (s) {
            title.textContent = 'Edit Staff Member';
            document.getElementById('admin-staff-edit-id').value = s.id;
            document.getElementById('admin-staff-school-select').value = s.school_id;
            document.getElementById('admin-staff-name').value = s.staff_name;
            document.getElementById('admin-staff-designation').value = s.designation;
            document.getElementById('admin-staff-emp-type').value = s.employment_type;
            document.getElementById('admin-staff-subject').value = s.subject;
            document.getElementById('admin-staff-joined-service').value = s.joined_service_date || '';
            document.getElementById('admin-staff-joined-institution').value = s.joined_institution_date || '';
            document.getElementById('admin-staff-phone1').value = s.phone_1 || '';
            document.getElementById('admin-staff-phone2').value = s.phone_2 || '';
            
            populateQualFormFields('admin-staff', s);
        }
    } else {
        title.textContent = 'Add Staff Member';
        populateQualFormFields('admin-staff', null);
        if (allSchools.length > 0) {
            document.getElementById('admin-staff-school-select').value = allSchools[0].id;
        }
    }
    
    modal.classList.remove('hidden');
}

function closeAdminStaffModal() {
    document.getElementById('admin-staff-modal').classList.add('hidden');
}

async function saveAdminStaff(event) {
    event.preventDefault();
    
    const id = document.getElementById('admin-staff-edit-id').value;
    const schoolId = document.getElementById('admin-staff-school-select').value;
    const name = document.getElementById('admin-staff-name').value.trim();
    const designation = document.getElementById('admin-staff-designation').value.trim();
    const empType = document.getElementById('admin-staff-emp-type').value;
    const subject = document.getElementById('admin-staff-subject').value.trim();
    const joinedService = document.getElementById('admin-staff-joined-service').value || null;
    const joinedInst = document.getElementById('admin-staff-joined-institution').value || null;
    const phone1 = document.getElementById('admin-staff-phone1').value.trim() || null;
    const phone2 = document.getElementById('admin-staff-phone2').value.trim() || null;
    
    const qualData = readQualFormFields('admin-staff');
    
    const payload = {
        school_id: schoolId,
        staff_name: name,
        designation: designation,
        employment_type: empType,
        subject: subject,
        joined_service_date: joinedService,
        joined_institution_date: joinedInst,
        phone_1: phone1,
        phone_2: phone2,
        ...qualData
    };
    
    showLoading();
    try {
        if (id) {
            const { error } = await supabase.from('staff').update(payload).eq('id', id);
            if (error) throw error;
            showToast('Staff profile updated successfully', 'success');
        } else {
            const { error } = await supabase.from('staff').insert([payload]);
            if (error) throw error;
            showToast('Staff profile created successfully', 'success');
        }
        closeAdminStaffModal();
        loadAdminStaff();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

async function deleteAdminStaff(id, name) {
    if (!confirm(`Are you sure you want to delete staff member: ${name}?`)) return;
    
    showLoading();
    try {
        const { error } = await supabase.from('staff').delete().eq('id', id);
        if (error) throw error;
        showToast('Staff member deleted successfully', 'success');
        loadAdminStaff();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

async function exportAdminStaffExcel() {
    if (adminStaffData.length === 0) {
        showToast('No staff data to export', 'warning');
        return;
    }
    
    const rows = adminStaffData.map(s => {
        const school = allSchools.find(sc => sc.id === s.school_id);
        const schoolName = school ? school.school_name : 'Unknown School';
        return {
            'Name of the Staff': s.staff_name,
            'Designation': s.designation,
            'Employment Type': s.employment_type,
            'Subject': s.subject,
            'Joined in Service': s.joined_service_date || '',
            'Working at Institution': s.joined_institution_date || '',
            'School Name': schoolName
        };
    });
    
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Staff List");
    XLSX.writeFile(wb, `Staff_List_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Exported to Excel successfully', 'success');
}

async function exportAdminStaffPDF() {
    if (adminStaffData.length === 0) {
        showToast('No staff data to export', 'warning');
        return;
    }
    
    const head = [['Name of the Staff', 'Designation', 'Type', 'Subject', 'Joined Service', 'Joined Inst', 'School Name']];
    const body = adminStaffData.map(s => {
        const school = allSchools.find(sc => sc.id === s.school_id);
        const schoolName = school ? school.school_name : 'Unknown School';
        return [
            s.staff_name,
            s.designation,
            s.employment_type,
            s.subject,
            s.joined_service_date || '-',
            s.joined_institution_date || '-',
            schoolName
        ];
    });
    
    const doc = new jspdf.jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('School Data Portal - Staff Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    doc.autoTable({
        head: head,
        body: body,
        startY: 28,
        styles: { fontSize: 8 }
    });
    
    doc.save(`Staff_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Exported to PDF successfully', 'success');
}

// ============================================
// Overview Tab: Selected School Stats Loader
// ============================================
async function loadSelectedSchoolStats() {
    const schoolId = document.getElementById('overview-school-select').value;
    const detailsDiv = document.getElementById('overview-school-details');
    
    if (!schoolId) {
        detailsDiv.classList.add('hidden');
        return;
    }
    
    showLoading();
    try {
        // 1. Get total students count & group by class
        const { data: students, error: stuError } = await supabase
            .from('students')
            .select('class_number')
            .eq('school_id', schoolId);
            
        if (stuError) throw stuError;
        
        // 2. Get total staff count
        const { count: staffCount, error: staffError } = await supabase
            .from('staff')
            .select('id', { count: 'exact', head: true })
            .eq('school_id', schoolId);
            
        if (staffError) throw staffError;
        
        // Populate stats values
        document.getElementById('selected-school-students').textContent = students.length;
        document.getElementById('selected-school-staff').textContent = staffCount || 0;
        
        // Count class-wise student enrollment
        const classCounts = {};
        // Initialize active classes
        CLASSES.forEach(c => {
            classCounts[c] = 0;
        });
        students.forEach(s => {
            if (classCounts[s.class_number] !== undefined) {
                classCounts[s.class_number]++;
            }
        });
        
        // Populate class-wise student enrollment table
        const tbody = document.getElementById('selected-school-classes-table');
        tbody.innerHTML = '';
        
        CLASSES.forEach(c => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${classDisplayName(c)}</td>
                <td><strong>${classCounts[c]}</strong> students</td>
            `;
            tbody.appendChild(tr);
        });
        
        detailsDiv.classList.remove('hidden');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

let adminStaffingData = [];

async function loadAdminStaffingTable() {
    showLoading();
    try {
        const schoolId = document.getElementById('staffing-filter-school').value;
        let query = supabase.from('staffing_particulars').select('*');
        if (schoolId) {
            query = query.eq('school_id', schoolId);
        }
        
        const { data, error } = await query.order('post_name');
        if (error) throw error;
        adminStaffingData = data || [];
        renderAdminStaffingTable();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderAdminStaffingTable() {
    const tbody = document.getElementById('staffing-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchVal = document.getElementById('staffing-search-input').value.trim().toLowerCase();
    const statusFilter = document.getElementById('staffing-filter-status').value;
    
    const filtered = adminStaffingData.filter(item => {
        const matchesStatus = !statusFilter || item.status === statusFilter;
        const matchesSearch = !searchVal || 
            item.post_name.toLowerCase().includes(searchVal) ||
            (item.employee_name && item.employee_name.toLowerCase().includes(searchVal)) ||
            (item.remarks && item.remarks.toLowerCase().includes(searchVal));
        return matchesStatus && matchesSearch;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center">No staffing records found</td></tr>`;
        return;
    }
    
    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        const school = allSchools.find(s => s.id === item.school_id);
        const schoolName = school ? school.school_name : 'Unknown';
        
        let badgeClass = 'badge-fail';
        if (item.status === 'Filled') badgeClass = 'badge-pass';
        else if (item.status === 'Not Sanctioned') badgeClass = 'badge-warning';
        const statusHtml = `<span class="badge ${badgeClass}">${item.status}</span>`;
        
        const formattedDate = item.joining_date ? new Date(item.joining_date).toLocaleDateString() : '-';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="font-weight: 500; color: #1e3a8a;">${schoolName}</td>
            <td style="font-weight: 500;">${item.post_name}</td>
            <td>${statusHtml}</td>
            <td>${item.employee_name || '-'}</td>
            <td>${item.employment_type || '-'}</td>
            <td>${formattedDate}</td>
            <td>${item.aadhar_no || '-'}</td>
            <td>${item.apcos_id || '-'}</td>
            <td>${item.remarks || '-'}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="openAdminStaffingModal('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdminStaffing('${item.id}', '${item.post_name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openAdminStaffingModal(id = null) {
    const modal = document.getElementById('staffing-modal');
    const title = document.getElementById('staffing-modal-title');
    const form = document.getElementById('staffing-form');
    
    form.reset();
    document.getElementById('staffing-edit-id').value = id || '';
    
    if (id) {
        title.textContent = 'Edit Staffing Position';
        const item = adminStaffingData.find(x => x.id === id);
        if (item) {
            document.getElementById('staffing-school-select').value = item.school_id;
            document.getElementById('staffing-post-name').value = item.post_name;
            document.getElementById('staffing-status').value = item.status;
            document.getElementById('staffing-employee-name').value = item.employee_name || '';
            document.getElementById('staffing-employment-type').value = item.employment_type || '';
            document.getElementById('staffing-joining-date').value = item.joining_date || '';
            document.getElementById('staffing-aadhar').value = item.aadhar_no || '';
            document.getElementById('staffing-apcos').value = item.apcos_id || '';
            document.getElementById('staffing-remarks').value = item.remarks || '';
        }
    } else {
        title.textContent = 'Add Staffing Position';
        const schoolFilter = document.getElementById('staffing-filter-school').value;
        if (schoolFilter) {
            document.getElementById('staffing-school-select').value = schoolFilter;
        }
    }
    
    toggleAdminStaffingFields();
    modal.classList.remove('hidden');
}

function closeAdminStaffingModal() {
    document.getElementById('staffing-modal').classList.add('hidden');
}

function toggleAdminStaffingFields() {
    const status = document.getElementById('staffing-status').value;
    const fieldsContainer = document.getElementById('staffing-filled-fields');
    const empNameInput = document.getElementById('staffing-employee-name');
    const empTypeSelect = document.getElementById('staffing-employment-type');
    const joinDateInput = document.getElementById('staffing-joining-date');
    const aadharInput = document.getElementById('staffing-aadhar');
    const apcosInput = document.getElementById('staffing-apcos');
    
    if (status === 'Filled') {
        fieldsContainer.style.display = 'block';
        empNameInput.required = true;
        empTypeSelect.required = true;
        joinDateInput.required = true;
    } else {
        fieldsContainer.style.display = 'none';
        empNameInput.required = false;
        empTypeSelect.required = false;
        joinDateInput.required = false;
        
        empNameInput.value = '';
        empTypeSelect.value = '';
        joinDateInput.value = '';
        aadharInput.value = '';
        apcosInput.value = '';
    }
}

async function saveAdminStaffing(event) {
    event.preventDefault();
    
    const id = document.getElementById('staffing-edit-id').value;
    const schoolId = document.getElementById('staffing-school-select').value;
    const postName = document.getElementById('staffing-post-name').value.trim();
    const status = document.getElementById('staffing-status').value;
    const employeeName = document.getElementById('staffing-employee-name').value.trim();
    const employmentType = document.getElementById('staffing-employment-type').value;
    const joiningDate = document.getElementById('staffing-joining-date').value;
    const aadharNo = document.getElementById('staffing-aadhar').value.trim();
    const apcosId = document.getElementById('staffing-apcos').value.trim();
    const remarks = document.getElementById('staffing-remarks').value.trim();
    
    if (!schoolId || !postName || !status) {
        showToast('Please fill all required fields.', 'warning');
        return;
    }
    
    if (status === 'Filled') {
        if (!employeeName || !employmentType || !joiningDate) {
            showToast('Please fill all employee details for filled status.', 'warning');
            return;
        }
        if (aadharNo && aadharNo.length !== 12) {
            showToast('Aadhar number must be exactly 12 digits.', 'warning');
            return;
        }
    }
    
    const payload = {
        school_id: schoolId,
        post_name: postName,
        status: status,
        employee_name: status === 'Filled' ? employeeName : null,
        employment_type: status === 'Filled' ? employmentType : null,
        joining_date: status === 'Filled' ? joiningDate : null,
        aadhar_no: status === 'Filled' ? (aadharNo || null) : null,
        apcos_id: status === 'Filled' ? (apcosId || null) : null,
        remarks: remarks || null
    };
    
    showLoading();
    try {
        if (id) {
            const { error } = await supabase
                .from('staffing_particulars')
                .update(payload)
                .eq('id', id);
            if (error) throw error;
            showToast('Staffing position updated successfully', 'success');
        } else {
            const { error } = await supabase
                .from('staffing_particulars')
                .insert(payload);
            if (error) throw error;
            showToast('Staffing position added successfully', 'success');
        }
        closeAdminStaffingModal();
        loadAdminStaffingTable();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

function deleteAdminStaffing(id, postName) {
    if (!confirm(`Are you sure you want to delete staffing position: ${postName}?`)) return;
    
    showLoading();
    supabase
        .from('staffing_particulars')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
            hideLoading();
            if (error) {
                showToast(error.message, 'error');
            } else {
                showToast('Staffing position deleted successfully', 'success');
                loadAdminStaffingTable();
            }
        })
        .catch(err => {
            hideLoading();
            showToast(err.message, 'error');
        });
}

function filterSchoolDropdownForStaffing() {
    const searchVal = document.getElementById('staffing-school-search').value.toLowerCase();
    const select = document.getElementById('staffing-filter-school');
    
    select.innerHTML = '<option value="">All Schools</option>';
    
    const filtered = allSchools.filter(school => 
        school.school_name.toLowerCase().includes(searchVal)
    );
    
    filtered.forEach(school => {
        const option = document.createElement('option');
        option.value = school.id;
        option.textContent = school.school_name;
        select.appendChild(option);
    });
}

async function exportAdminStaffingExcel() {
    if (adminStaffingData.length === 0) {
        showToast('No staffing records found for export', 'warning');
        return;
    }
    
    const reportData = adminStaffingData.map((item, index) => {
        const school = allSchools.find(s => s.id === item.school_id);
        const schoolName = school ? school.school_name : 'Unknown';
        return {
            'S.No': index + 1,
            'Name of the School': schoolName,
            'Name of the Post': item.post_name,
            'Status': item.status,
            'Name of the Employee': item.employee_name || '-',
            'Employment Type': item.employment_type || '-',
            'Date of Joining': item.joining_date || '-',
            'Aadhar No': item.aadhar_no || '-',
            'APCOS ID': item.apcos_id || '-',
            'Remarks': item.remarks || '-'
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Staffing Particulars");
    
    const fileName = `Staffing_Particulars_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast('Staffing particulars Excel export successful', 'success');
}

async function exportAdminStaffingPDF() {
    if (adminStaffingData.length === 0) {
        showToast('No staffing records found for export', 'warning');
        return;
    }
    
    const doc = new jspdf.jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('School Data Portal - Staffing Particulars Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    const head = [['S.No', 'School Name', 'Name of the Post', 'Status', 'Employee Name', 'Type', 'Date of Joining', 'Aadhar No', 'APCOS ID', 'Remarks']];
    const body = adminStaffingData.map((item, index) => {
        const school = allSchools.find(s => s.id === item.school_id);
        const schoolName = school ? school.school_name : 'Unknown';
        return [
            index + 1,
            schoolName,
            item.post_name,
            item.status,
            item.employee_name || '-',
            item.employment_type || '-',
            item.joining_date ? new Date(item.joining_date).toLocaleDateString() : '-',
            item.aadhar_no || '-',
            item.apcos_id || '-',
            item.remarks || '-'
        ];
    });
    
    doc.autoTable({
        head: head,
        body: body,
        startY: 28,
        styles: { fontSize: 8 }
    });
    
    doc.save(`Staffing_Particulars_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Staffing particulars PDF export successful', 'success');
}

let adminOutsourcingAttendanceData = [];

async function loadAdminOutsourcingAttendanceTable() {
    const schoolFilter = document.getElementById('admin-out-filter-school').value;
    const monthFilter = document.getElementById('admin-out-filter-month').value;
    
    showLoading();
    try {
        let query = supabase.from('outsourcing_attendance').select('*');
        
        if (schoolFilter) {
            query = query.eq('school_id', schoolFilter);
        }
        if (monthFilter) {
            query = query.eq('month', monthFilter);
        }
        
        const { data, error } = await query.order('month', { ascending: false }).order('employee_name');
        if (error) throw error;
        
        adminOutsourcingAttendanceData = data || [];
        renderAdminOutsourcingAttendanceTable();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

function renderAdminOutsourcingAttendanceTable() {
    const tbody = document.getElementById('admin-out-attendance-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const searchVal = document.getElementById('admin-out-search-input').value.trim().toLowerCase();
    
    const filtered = adminOutsourcingAttendanceData.filter(item => {
        const matchesSearch = !searchVal || 
            item.employee_name.toLowerCase().includes(searchVal) ||
            item.designation.toLowerCase().includes(searchVal) ||
            (item.remarks && item.remarks.toLowerCase().includes(searchVal));
        return matchesSearch;
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">No attendance records found</td></tr>`;
        return;
    }
    
    filtered.forEach((item, index) => {
        const tr = document.createElement('tr');
        
        const school = allSchools.find(s => s.id === item.school_id);
        const schoolName = school ? school.school_name : 'Unknown';
        
        let displayMonth = item.month;
        if (item.month && item.month.includes('-')) {
            const [year, month] = item.month.split('-');
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            displayMonth = `${monthNames[parseInt(month) - 1]} ${year}`;
        }
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td style="font-weight: 500; color: #1e3a8a;">${schoolName}</td>
            <td style="font-weight: 500;">${displayMonth}</td>
            <td style="font-weight: 500;">${item.employee_name}</td>
            <td>${item.designation}</td>
            <td>${item.aadhar_no || '-'}</td>
            <td>${item.apcos_id || '-'}</td>
            <td>${item.days_present}</td>
            <td>${item.remarks || '-'}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline" onclick="openAdminOutsourcingAttendanceModal('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAdminOutsourcingAttendance('${item.id}', '${item.employee_name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterAdminOutSchoolDropdown() {
    const searchVal = document.getElementById('admin-out-school-search').value.toLowerCase();
    const select = document.getElementById('admin-out-filter-school');
    
    select.innerHTML = '<option value="">All Schools</option>';
    
    const filtered = allSchools.filter(s => s.school_name.toLowerCase().includes(searchVal));
    filtered.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.school_name;
        select.appendChild(opt);
    });
}

async function openAdminOutsourcingAttendanceModal(id = null) {
    const modal = document.getElementById('admin-out-attendance-modal');
    const title = document.getElementById('admin-out-attendance-modal-title');
    const form = document.getElementById('admin-out-attendance-form');
    
    form.reset();
    document.getElementById('admin-out-edit-id').value = id || '';
    
    const schoolSelect = document.getElementById('admin-out-school-select');
    schoolSelect.innerHTML = '<option value="">Select School</option>';
    allSchools.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.school_name;
        schoolSelect.appendChild(opt);
    });
    
    const empSelect = document.getElementById('admin-out-employee');
    const desSelect = document.getElementById('admin-out-designation');
    empSelect.innerHTML = '<option value="">Select Out Sourcing Employee</option>';
    desSelect.innerHTML = '<option value="">Select Designation</option>';
    
    if (id) {
        title.textContent = 'Edit Attendance Record';
        const item = adminOutsourcingAttendanceData.find(x => x.id === id);
        if (item) {
            schoolSelect.value = item.school_id;
            
            await onAdminOutSchoolSelectChange();
            
            document.getElementById('admin-out-month').value = item.month;
            document.getElementById('admin-out-employee').value = item.employee_name;
            document.getElementById('admin-out-designation').value = item.designation;
            document.getElementById('admin-out-aadhar').value = item.aadhar_no || '';
            document.getElementById('admin-out-apcos').value = item.apcos_id || '';
            document.getElementById('admin-out-days-present').value = item.days_present;
            document.getElementById('admin-out-remarks').value = item.remarks || '';
        }
    } else {
        title.textContent = 'Add Attendance Record';
        const filterSchool = document.getElementById('admin-out-filter-school').value;
        if (filterSchool) {
            schoolSelect.value = filterSchool;
            await onAdminOutSchoolSelectChange();
        }
        
        const filterMonth = document.getElementById('admin-out-filter-month').value;
        if (filterMonth) {
            document.getElementById('admin-out-month').value = filterMonth;
        } else {
            const d = new Date();
            document.getElementById('admin-out-month').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
    }
    
    modal.classList.remove('hidden');
}

async function onAdminOutSchoolSelectChange() {
    const schoolId = document.getElementById('admin-out-school-select').value;
    const empSelect = document.getElementById('admin-out-employee');
    const desSelect = document.getElementById('admin-out-designation');
    
    empSelect.innerHTML = '<option value="">Select Out Sourcing Employee</option>';
    desSelect.innerHTML = '<option value="">Select Designation</option>';
    
    if (!schoolId) return;
    
    try {
        const { data: staffList, error } = await supabase
            .from('staffing_particulars')
            .select('*')
            .eq('school_id', schoolId)
            .eq('status', 'Filled')
            .eq('employment_type', 'Out Sourcing');
            
        if (error) throw error;
        
        if (!staffList || staffList.length === 0) {
            showToast('No "Out Sourcing" staff records are currently marked as "Filled" in Staffing Particulars for this school.', 'warning');
        } else {
            const uniquePosts = [...new Set(staffList.map(s => s.post_name))];
            
            staffList.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.employee_name;
                opt.textContent = `${s.employee_name} (${s.post_name})`;
                opt.setAttribute('data-post', s.post_name);
                opt.setAttribute('data-apcos', s.apcos_id || '');
                opt.setAttribute('data-aadhar', s.aadhar_no || '');
                empSelect.appendChild(opt);
            });
            
            uniquePosts.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                desSelect.appendChild(opt);
            });
        }
    } catch (err) {
        showToast('Failed to load school staff: ' + err.message, 'error');
    }
}

function onAdminOutEmployeeChange() {
    const select = document.getElementById('admin-out-employee');
    const selectedOption = select.options[select.selectedIndex];
    if (selectedOption) {
        const postName = selectedOption.getAttribute('data-post');
        if (postName) {
            document.getElementById('admin-out-designation').value = postName;
        }
        const aadharNo = selectedOption.getAttribute('data-aadhar');
        document.getElementById('admin-out-aadhar').value = aadharNo || '';
        const apcosId = selectedOption.getAttribute('data-apcos');
        document.getElementById('admin-out-apcos').value = apcosId || '';
    } else {
        document.getElementById('admin-out-aadhar').value = '';
        document.getElementById('admin-out-apcos').value = '';
    }
}

function closeAdminOutsourcingAttendanceModal() {
    document.getElementById('admin-out-attendance-modal').classList.add('hidden');
}

async function saveAdminOutsourcingAttendance(event) {
    event.preventDefault();
    
    const id = document.getElementById('admin-out-edit-id').value;
    const schoolId = document.getElementById('admin-out-school-select').value;
    const month = document.getElementById('admin-out-month').value;
    const employeeName = document.getElementById('admin-out-employee').value;
    const designation = document.getElementById('admin-out-designation').value;
    const aadharNo = document.getElementById('admin-out-aadhar').value.trim();
    const apcosId = document.getElementById('admin-out-apcos').value.trim();
    const daysPresentVal = document.getElementById('admin-out-days-present').value;
    const remarks = document.getElementById('admin-out-remarks').value.trim();
    
    if (!schoolId || !month || !employeeName || !designation || daysPresentVal === '') {
        showToast('Please fill all required fields.', 'warning');
        return;
    }
    
    const daysPresent = parseFloat(daysPresentVal);
    if (isNaN(daysPresent) || daysPresent < 0 || daysPresent > 31) {
        showToast('No of days present must be between 0 and 31.', 'warning');
        return;
    }
    
    const payload = {
        school_id: schoolId,
        month: month,
        employee_name: employeeName,
        designation: designation,
        aadhar_no: aadharNo || null,
        apcos_id: apcosId || null,
        days_present: daysPresent,
        remarks: remarks || null
    };
    
    showLoading();
    try {
        if (id) {
            const { error } = await supabase
                .from('outsourcing_attendance')
                .update(payload)
                .eq('id', id);
            if (error) throw error;
            showToast('Attendance record updated successfully', 'success');
        } else {
            const { error } = await supabase
                .from('outsourcing_attendance')
                .insert(payload);
            if (error) throw error;
            showToast('Attendance record added successfully', 'success');
        }
        closeAdminOutsourcingAttendanceModal();
        loadAdminOutsourcingAttendanceTable();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        hideLoading();
    }
}

function deleteAdminOutsourcingAttendance(id, employeeName) {
    if (!confirm(`Are you sure you want to delete attendance record for ${employeeName}?`)) return;
    
    showLoading();
    supabase
        .from('outsourcing_attendance')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
            hideLoading();
            if (error) {
                showToast(error.message, 'error');
            } else {
                showToast('Attendance record deleted successfully', 'success');
                loadAdminOutsourcingAttendanceTable();
            }
        })
        .catch(err => {
            hideLoading();
            showToast(err.message, 'error');
        });
}

async function exportAdminOutsourcingAttendanceExcel() {
    if (adminOutsourcingAttendanceData.length === 0) {
        showToast('No attendance records found for export', 'warning');
        return;
    }
    
    const reportData = adminOutsourcingAttendanceData.map((item, index) => {
        const school = allSchools.find(s => s.id === item.school_id);
        const schoolName = school ? school.school_name : 'Unknown';
        
        let displayMonth = item.month;
        if (item.month && item.month.includes('-')) {
            const [year, month] = item.month.split('-');
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            displayMonth = `${monthNames[parseInt(month) - 1]} ${year}`;
        }
        
        return {
            'S.No': index + 1,
            'School Name': schoolName,
            'Month': displayMonth,
            'Name of the Employee': item.employee_name,
            'Designation': item.designation,
            'Aadhar No': item.aadhar_no || '-',
            'APCOS ID': item.apcos_id || '-',
            'No of Days Present': item.days_present,
            'Remarks': item.remarks || '-'
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(reportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Outsourcing Attendance");
    
    const fileName = `Outsourcing_Attendance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    showToast('Outsourcing attendance Excel export successful', 'success');
}

async function exportAdminOutsourcingAttendancePDF() {
    if (adminOutsourcingAttendanceData.length === 0) {
        showToast('No attendance records found for export', 'warning');
        return;
    }
    
    const doc = new jspdf.jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('School Data Portal - Outsourcing Attendance Report', 14, 15);
    doc.setFontSize(10);
    doc.text(`Exported on: ${new Date().toLocaleDateString()}`, 14, 22);
    
    const head = [['S.No', 'School Name', 'Month', 'Name of the Employee', 'Designation', 'Aadhar No', 'APCOS ID', 'Days Present', 'Remarks']];
    const body = adminOutsourcingAttendanceData.map((item, index) => {
        const school = allSchools.find(s => s.id === item.school_id);
        const schoolName = school ? school.school_name : 'Unknown';
        
        let displayMonth = item.month;
        if (item.month && item.month.includes('-')) {
            const [year, month] = item.month.split('-');
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            displayMonth = `${monthNames[parseInt(month) - 1]} ${year}`;
        }
        
        return [
            index + 1,
            schoolName,
            displayMonth,
            item.employee_name,
            item.designation,
            item.aadhar_no || '-',
            item.apcos_id || '-',
            item.days_present,
            item.remarks || '-'
        ];
    });
    
    doc.autoTable({
        head: head,
        body: body,
        startY: 28,
        styles: { fontSize: 9 }
    });
    
    doc.save(`Outsourcing_Attendance_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Outsourcing attendance PDF export successful', 'success');
}

document.addEventListener('DOMContentLoaded', initAdmin);
