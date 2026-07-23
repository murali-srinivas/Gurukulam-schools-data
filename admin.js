let allSchools = [];

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
        'marks': 'Exam Marks',
        'reports': 'Reports & Export'
    };
    document.getElementById('page-title').textContent = titles[tabName] || 'Dashboard';

    if (tabName === 'schools') {
        renderSchoolsTable();
    } else if (tabName === 'students') {
        loadAdminStudents();
    } else if (tabName === 'staff') {
        loadAdminStaff();
    } else if (tabName === 'marks') {
        onAdminMarksFilterChange();
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
    } catch (err) {
        console.error(err);
        showToast('Failed to load schools list', 'error');
    } finally {
        hideLoading();
    }
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
    const schoolName = document.getElementById('school-name-input').value;
    const username = document.getElementById('school-username-input').value;
    const password = document.getElementById('school-password-input').value;
    
    showLoading();
    try {
        const payload = {
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
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No schools found</td></tr>';
        return;
    }
    
    allSchools.forEach((school, index) => {
        const tr = document.createElement('tr');
        
        const createdDate = school.created_at ? new Date(school.created_at).toLocaleDateString() : 'N/A';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
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
        
        const tbody = document.getElementById('admin-students-table');
        tbody.innerHTML = '';
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No students found</td></tr>';
            return;
        }
        
        data.forEach(student => {
            const school = allSchools.find(s => s.id === student.school_id);
            const schoolName = school ? school.school_name : 'Unknown';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${student.roll_number}</td>
                <td>${student.student_name}</td>
                <td>${student.gender || '-'}</td>
                <td>${classDisplayName(student.class_number)}</td>
                <td>${student.section}</td>
                <td>${schoolName}</td>
            `;
            tbody.appendChild(tr);
        });
        
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
    loadAdminStudents();
}

function onAdminMarksFilterChange() {
    const s = document.getElementById('marks-filter-school').value;
    const c = document.getElementById('marks-filter-class').value;
    const sec = document.getElementById('marks-filter-section').value;
    const e = document.getElementById('marks-filter-exam').value;
    
    const btn = document.getElementById('load-marks-btn');
    if (btn) {
        btn.disabled = !(s && c && sec && e);
    }
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
        
        const subjects = getSubjects(classNum);
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
            <div class="d-flex justify-end mb-4">
                <button class="btn btn-primary" onclick="saveAdminMarks()">
                    <i class="fas fa-save"></i> Save Marks
                </button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Roll No</th>
                        <th>Student Name</th>
                        ${subjects.map(sub => `<th>${sub} (${getMaxMarks(examType)})</th>`).join('')}
                        <th>Result</th>
                    </tr>
                </thead>
                <tbody id="admin-marks-tbody">
        `;
        
        students.forEach(student => {
            const studentMarks = marksData.filter(m => m.student_id === student.id) || [];
            
            html += `<tr data-studentid="${student.id}">
                <td>${student.roll_number}</td>
                <td>${student.student_name}</td>
            `;
            
            let allPass = true;
            let hasMarks = false;
            let anyFail = false;
            
            subjects.forEach(sub => {
                const markRecord = studentMarks.find(m => m.subject === sub);
                const markVal = markRecord && markRecord.marks !== null ? markRecord.marks : '';
                
                if (markVal !== '') hasMarks = true;
                if (markRecord && markRecord.pass_fail === 'Fail') anyFail = true;
                if (!markRecord || markRecord.pass_fail === 'Fail') allPass = false;
                
                html += `
                    <td>
                        <input type="number" class="marks-input mark-input" 
                               data-subject="${sub}" 
                               value="${markVal}" 
                               min="0" max="${getMaxMarks(examType)}">
                    </td>
                `;
            });
            
            let resultHtml = '-';
            if (hasMarks) {
                if (anyFail) {
                    resultHtml = '<span class="badge badge-fail">Fail</span>';
                } else if (allPass) {
                    resultHtml = '<span class="badge badge-pass">Pass</span>';
                }
            }
            
            html += `<td>${resultHtml}</td></tr>`;
        });
        
        html += `</tbody></table>`;
        container.innerHTML = html;
        
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
        
        const upsertData = [];
        
        rows.forEach(row => {
            const studentId = row.dataset.studentid;
            const inputs = row.querySelectorAll('.mark-input');
            
            inputs.forEach(input => {
                const subject = input.dataset.subject;
                const markStr = input.value;
                
                if (markStr.trim() !== '') {
                    const marksNum = parseInt(markStr);
                    const pf = calculatePassFail(marksNum, examType, subject);
                    
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
            });
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

async function exportAdminExcel() {
    const schoolId = document.getElementById('report-filter-school').value;
    const classVal = document.getElementById('report-filter-class').value;
    const sectionVal = document.getElementById('report-filter-section').value;
    const examType = document.getElementById('report-filter-exam').value;
    
    if (!schoolId || !examType) {
        showToast('Please select at least School and Exam for report', 'warning');
        return;
    }
    
    showLoading();
    try {
        let stuQuery = supabase.from('students').select('*').eq('school_id', schoolId);
        if (classVal) stuQuery = stuQuery.eq('class_number', classVal);
        if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
        const { data: students, error: stuError } = await stuQuery.order('class_number').order('section').order('roll_number');
        if (stuError) throw stuError;
        
        if (!students || students.length === 0) {
            showToast('No students found for export', 'warning');
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
        
        const school = allSchools.find(s => s.id === schoolId);
        const schoolName = school ? school.school_name : 'Unknown';
        
        const reportData = [];
        
        students.forEach(student => {
            const row = {
                'School': schoolName,
                'Class': classDisplayName(student.class_number),
                'Section': student.section,
                'Roll No': student.roll_number,
                'Student Name': student.student_name,
                'Gender': student.gender || ''
            };
            
            const subjects = getSubjects(student.class_number);
            const studentMarks = marks.filter(m => m.student_id === student.id);
            
            let anyFail = false;
            let allPass = true;
            let hasMarks = false;
            
            subjects.forEach(sub => {
                const mark = studentMarks.find(m => m.subject === sub);
                if (mark && mark.marks !== null) {
                    row[sub] = mark.marks;
                    hasMarks = true;
                    if (mark.pass_fail === 'Fail') anyFail = true;
                } else {
                    row[sub] = '';
                    allPass = false;
                }
            });
            
            if (hasMarks) {
                row['Result'] = anyFail ? 'Fail' : (allPass ? 'Pass' : 'Incomplete');
            } else {
                row['Result'] = '';
            }
            
            reportData.push(row);
        });
        
        const worksheet = XLSX.utils.json_to_sheet(reportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        
        const fileName = `School_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        
        showToast('Export successful', 'success');
    } catch (err) {
        console.error(err);
        showToast('Export failed', 'error');
    } finally {
        hideLoading();
    }
}

async function exportAdminPDF() {
    const schoolId = document.getElementById('report-filter-school').value;
    const classVal = document.getElementById('report-filter-class').value;
    const sectionVal = document.getElementById('report-filter-section').value;
    const examType = document.getElementById('report-filter-exam').value;
    
    if (!schoolId || !classVal || !examType) {
        showToast('Please select School, Class, and Exam for PDF', 'warning');
        return;
    }
    
    showLoading();
    try {
        let stuQuery = supabase.from('students').select('*').eq('school_id', schoolId).eq('class_number', classVal);
        if (sectionVal) stuQuery = stuQuery.eq('section', sectionVal);
        
        const { data: students, error: stuError } = await stuQuery.order('section').order('roll_number');
        if (stuError) throw stuError;
        
        if (!students || students.length === 0) {
            showToast('No students found for export', 'warning');
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
        
        const school = allSchools.find(s => s.id === schoolId);
        const schoolName = school ? school.school_name : 'Unknown';
        
        const subjects = getSubjects(classVal);
        
        const head = [['Roll No', 'Name', 'Sec', ...subjects, 'Result']];
        const body = [];
        
        students.forEach(student => {
            const studentMarks = marks.filter(m => m.student_id === student.id);
            const row = [student.roll_number, student.student_name, student.section];
            
            let anyFail = false;
            let allPass = true;
            let hasMarks = false;
            
            subjects.forEach(sub => {
                const mark = studentMarks.find(m => m.subject === sub);
                if (mark && mark.marks !== null) {
                    row.push(mark.marks);
                    hasMarks = true;
                    if (mark.pass_fail === 'Fail') anyFail = true;
                } else {
                    row.push('-');
                    allPass = false;
                }
            });
            
            const result = hasMarks ? (anyFail ? 'Fail' : (allPass ? 'Pass' : 'Incomp')) : '-';
            row.push(result);
            body.push(row);
        });
        
        const doc = new jspdf.jsPDF('landscape');
        
        doc.setFontSize(16);
        doc.text('School Data Portal - Report', 14, 15);
        
        doc.setFontSize(10);
        doc.text(`School: ${schoolName} | Class: ${classDisplayName(classVal)} | Exam: ${examType}`, 14, 22);
        
        doc.autoTable({
            head: head,
            body: body,
            startY: 28,
            styles: { fontSize: 8 }
        });
        
        doc.save(`School_Report_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Export successful', 'success');
        
    } catch (err) {
        console.error(err);
        showToast('Export failed', 'error');
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
        const tbody = document.getElementById('admin-staff-table');
        tbody.innerHTML = '';
        
        if (adminStaffData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No staff records found.</td></tr>';
            return;
        }
        
        adminStaffData.forEach(s => {
            const school = allSchools.find(sc => sc.id === s.school_id);
            const schoolName = school ? school.school_name : 'Unknown School';
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.staff_name}</td>
                <td>${s.designation}</td>
                <td><span class="badge ${s.employment_type === 'Regular' ? 'badge-pass' : 'badge-info'}">${s.employment_type}</span></td>
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
        }
    } else {
        title.textContent = 'Add Staff Member';
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
    
    const payload = {
        school_id: schoolId,
        staff_name: name,
        designation: designation,
        employment_type: empType,
        subject: subject,
        joined_service_date: joinedService,
        joined_institution_date: joinedInst
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

document.addEventListener('DOMContentLoaded', initAdmin);
