let currentSchool = null;

async function initSchool() {
  currentSchool = getSession();
  if (!currentSchool) {
    window.location.href = getAppBaseUrl() + 'index.html';
    return;
  }
  
  document.getElementById('school-brand-name').textContent = currentSchool.school_name;
  document.getElementById('school-user-name').textContent = currentSchool.school_name;
  document.getElementById('user-avatar-letter').textContent = currentSchool.school_name.charAt(0).toUpperCase();
  document.getElementById('current-date').textContent = new Date().toLocaleDateString();
  
  const classDropdowns = ['stu-class', 'marks-class', 'report-class'];
  classDropdowns.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    if (id === 'report-class') {
        select.innerHTML = '<option value="">All Classes</option>';
    } else {
        select.innerHTML = '';
    }
    CLASSES.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = classDisplayName(c);
      select.appendChild(option);
    });
  });
  
  updateExamDropdown('marks-class', 'marks-exam');
  updateExamDropdown('report-class', 'report-exam', true);
  
  await loadOverviewData();
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
    'students': 'Student Data Entry',
    'staff': 'Staff Profile',
    'marks': 'Enter Exam Marks',
    'reports': 'Export Reports'
  };
  document.getElementById('page-title').textContent = titles[tabName] || 'Overview';
  
  if (tabName === 'students') {
    const searchInput = document.getElementById('stu-search-input');
    if (searchInput) searchInput.value = '';
    loadStudentTable();
  } else if (tabName === 'staff') {
    const searchInput = document.getElementById('staff-search-input');
    if (searchInput) searchInput.value = '';
    loadStaffTable();
  } else if (tabName === 'overview') {
    loadOverviewData();
  } else if (tabName === 'marks') {
    const searchInput = document.getElementById('marks-search-input');
    if (searchInput) searchInput.value = '';
    onMarksFilterChange();
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

async function loadOverviewData() {
  showLoading();
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('class_number, section')
      .eq('school_id', currentSchool.id);
      
    if (error) throw error;
    
    let totalStudents = students.length;
    let totalClasses = 8;
    let totalSections = 16;
    let totalExams = 6;
    
    const statsGrid = document.getElementById('stats-grid');
    statsGrid.innerHTML = `
      <div class="stat-card accent-primary">
        <div class="stat-icon icon-primary"><i class="fas fa-users"></i></div>
        <div class="stat-value">${totalStudents}</div>
        <div class="stat-label">Total Students</div>
      </div>
      <div class="stat-card accent-success">
        <div class="stat-icon icon-success"><i class="fas fa-layer-group"></i></div>
        <div class="stat-value">${totalClasses}</div>
        <div class="stat-label">Classes</div>
      </div>
      <div class="stat-card accent-warning">
        <div class="stat-icon icon-warning"><i class="fas fa-chalkboard"></i></div>
        <div class="stat-value">${totalSections}</div>
        <div class="stat-label">Sections</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon icon-info"><i class="fas fa-file-alt"></i></div>
        <div class="stat-value">${totalExams}</div>
        <div class="stat-label">Exams</div>
      </div>
    `;
    
    let classCounts = {};
    CLASSES.forEach(c => {
      classCounts[c] = { A: 0, B: 0, total: 0 };
    });
    
    students.forEach(s => {
      if (classCounts[s.class_number]) {
        if (s.section === 'A') classCounts[s.class_number].A++;
        if (s.section === 'B') classCounts[s.class_number].B++;
        classCounts[s.class_number].total++;
      }
    });
    
    const tbody = document.getElementById('overview-class-table');
    tbody.innerHTML = '';
    CLASSES.forEach(c => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${classDisplayName(c)}</td>
        <td>${classCounts[c].A}</td>
        <td>${classCounts[c].B}</td>
        <td><strong>${classCounts[c].total}</strong></td>
      `;
      tbody.appendChild(row);
    });
    
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function renderStudentTable() {
  const searchVal = document.getElementById('stu-search-input').value.trim().toLowerCase();
  const tbody = document.getElementById('students-table-body');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const nameInput = row.querySelector('.student-name');
    const rollNo = row.cells[0].textContent;
    const name = nameInput ? nameInput.value.toLowerCase() : '';
    
    if (!searchVal || name.includes(searchVal) || rollNo.toLowerCase().includes(searchVal)) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
}

async function loadStudentTable() {
  const classNum = document.getElementById('stu-class').value;
  const section = document.getElementById('stu-section').value;
  
  if (!classNum || !section) return;
  
  showLoading();
  try {
    const { data: students, error } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', currentSchool.id)
      .eq('class_number', classNum)
      .eq('section', section)
      .order('roll_number', { ascending: true });
      
    if (error) throw error;
    
    const studentsMap = {};
    students.forEach(s => {
      studentsMap[s.roll_number] = s;
    });
    
    const tbody = document.getElementById('students-table-body');
    tbody.innerHTML = '';
    
    for (let i = 1; i <= MAX_STUDENTS; i++) {
      const s = studentsMap[i] || null;
      const row = document.createElement('tr');
      if (s) row.dataset.id = s.id;
      
      row.innerHTML = `
        <td>${i}</td>
        <td><input type="text" class="table-input student-name" placeholder="Student Name" value="${s ? s.student_name : ''}"></td>
        <td>
          <select class="table-select student-gender">
            <option value="">Select</option>
            <option value="Male" ${s && s.gender === 'Male' ? 'selected' : ''}>Male</option>
            <option value="Female" ${s && s.gender === 'Female' ? 'selected' : ''}>Female</option>
            <option value="Other" ${s && s.gender === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </td>
        <td>
          ${s ? `<button class="btn btn-sm btn-danger" onclick="deleteStudent('${s.id}', '${s.student_name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </td>
      `;
      tbody.appendChild(row);
    }
    
    const searchInput = document.getElementById('stu-search-input');
    if (searchInput) searchInput.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function saveStudents() {
  const classNum = document.getElementById('stu-class').value;
  const section = document.getElementById('stu-section').value;
  const tbody = document.getElementById('students-table-body');
  
  const rows = tbody.querySelectorAll('tr');
  const updates = [];
  const inserts = [];
  
  rows.forEach((row, index) => {
    const rollNo = index + 1;
    const name = row.querySelector('.student-name').value.trim();
    const gender = row.querySelector('.student-gender').value;
    const id = row.dataset.id;
    
    if (name) {
      const data = {
        school_id: currentSchool.id,
        class_number: classNum,
        section: section,
        roll_number: rollNo,
        student_name: name,
        gender: gender || 'Other'
      };
      if (id) {
        data.id = id;
        updates.push(data);
      } else {
        inserts.push(data);
      }
    }
  });
  
  if (updates.length === 0 && inserts.length === 0) {
    showToast('No students to save.', 'info');
    return;
  }
  
  showLoading();
  try {
    if (inserts.length > 0) {
      const { error } = await supabase.from('students').insert(inserts);
      if (error) throw error;
    }
    if (updates.length > 0) {
      const { error } = await supabase.from('students').upsert(updates);
      if (error) throw error;
    }
    showToast('Students saved successfully!', 'success');
    loadStudentTable();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function onMarksFilterChange() {
  updateExamDropdown('marks-class', 'marks-exam');
  const exam = document.getElementById('marks-exam').value;
  document.getElementById('save-marks-btn').disabled = !exam;
}

async function loadMarksTable() {
  const classNum = document.getElementById('marks-class').value;
  const section = document.getElementById('marks-section').value;
  const exam = document.getElementById('marks-exam').value;
  
  if (!exam) {
    showToast('Please select an exam first.', 'warning');
    return;
  }
  
  showLoading();
  try {
    const subjects = getSubjects(classNum, exam);
    const maxMarks = getMaxMarks(exam);
    
    const { data: students, error: stuError } = await supabase
      .from('students')
      .select('*')
      .eq('school_id', currentSchool.id)
      .eq('class_number', classNum)
      .eq('section', section)
      .order('roll_number', { ascending: true });
      
    if (stuError) throw stuError;
    
    if (students.length === 0) {
      document.getElementById('marks-table-container').innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users-slash"></i>
          <h4>No students found</h4>
          <p>Please enter students for this class and section first.</p>
        </div>
      `;
      return;
    }
    
    const studentIds = students.map(s => s.id);
    const { data: marksData, error: marksError } = await supabase
      .from('exam_marks')
      .select('*')
      .in('student_id', studentIds)
      .eq('exam_type', exam);
      
    if (marksError) throw marksError;
    
    const marksMap = {}; 
    marksData.forEach(m => {
      if (!marksMap[m.student_id]) marksMap[m.student_id] = {};
      marksMap[m.student_id][m.subject] = m;
    });
    
    let tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Roll No</th>
            <th>Student Name</th>
            ${subjects.map(sub => `<th>${sub} (Max: ${getMaxMarks(exam, sub, classNum)})</th>`).join('')}
            <th>Total</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody id="marks-table-body">
        </tbody>
      </table>
    `;
    
    document.getElementById('marks-table-container').innerHTML = tableHtml;
    const tbody = document.getElementById('marks-table-body');
    
    students.forEach(s => {
      const row = document.createElement('tr');
      row.dataset.studentId = s.id;
      row.dataset.class = classNum;
      
      let rowHtml = `
        <td>${s.roll_number}</td>
        <td>${s.student_name}</td>
      `;
      
      const sMarks = marksMap[s.id] || {};
      
      const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(exam);
      
      subjects.forEach(sub => {
        const m = sMarks[sub];
        const val = m ? (isGraded ? m.pass_fail : (m.pass_fail === 'AB' ? 'AB' : (m.marks !== null ? m.marks : ''))) : '';
        
        if (isGraded) {
          rowHtml += `
            <td>
              <select class="table-select marks-input" data-subject="${sub}" onchange="updateRowResult(this.closest('tr'), '${JSON.stringify(subjects).replace(/"/g, '&quot;')}', '${exam}')">
                <option value="">--</option>
                <option value="A" ${val === 'A' ? 'selected' : ''}>A</option>
                <option value="B" ${val === 'B' ? 'selected' : ''}>B</option>
                <option value="C" ${val === 'C' ? 'selected' : ''}>C</option>
              </select>
            </td>
          `;
        } else {
          rowHtml += `
            <td>
              <input type="text" class="table-input marks-input" data-subject="${sub}" value="${val}" placeholder="Max: ${getMaxMarks(exam, sub, classNum)} or AB" oninput="updateRowResult(this.closest('tr'), '${JSON.stringify(subjects).replace(/"/g, '&quot;')}', '${exam}')">
            </td>
          `;
        }
      });
      
      rowHtml += `<td class="total-cell">-</td>`;
      rowHtml += `<td class="result-cell">-</td>`;
      row.innerHTML = rowHtml;
      tbody.appendChild(row);
      
      updateRowResult(row, JSON.stringify(subjects), exam);
    });
    
    document.getElementById('save-marks-btn').disabled = false;
    
    const searchInput = document.getElementById('marks-search-input');
    if (searchInput) searchInput.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function filterMarksTable() {
  const searchVal = document.getElementById('marks-search-input').value.trim().toLowerCase();
  const tbody = document.getElementById('marks-table-body');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    const nameCell = row.cells[1];
    const rollCell = row.cells[0];
    const name = nameCell ? nameCell.textContent.toLowerCase() : '';
    const roll = rollCell ? rollCell.textContent.toLowerCase() : '';
    
    if (!searchVal || name.includes(searchVal) || roll.toLowerCase().includes(searchVal)) {
      row.classList.remove('hidden');
    } else {
      row.classList.add('hidden');
    }
  });
}

function updateRowResult(row, subjectsStr, examType) {
  const inputs = row.querySelectorAll('.marks-input');
  const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(examType);
  const classVal = row.dataset.class;
  
  let allFilled = true;
  let allPass = true;
  let anyAbsent = false;
  let totalSum = 0;
  let allEmpty = true;
  
  inputs.forEach(input => {
    let val = input.value.trim();
    const subject = input.dataset.subject;
    const maxMarks = getMaxMarks(examType, subject, classVal);
    if (val === '') {
      allFilled = false;
      input.classList.remove('invalid');
      return;
    }
    
    if (isGraded) {
      input.classList.remove('invalid');
    } else {
      if (val.toUpperCase() === 'AB') {
        anyAbsent = true;
        allEmpty = false;
        input.classList.remove('invalid');
        return;
      }
      
      val = parseInt(val);
      if (isNaN(val) || val < 0 || val > maxMarks) {
        input.classList.add('invalid');
        allFilled = false; 
      } else {
        allEmpty = false;
        totalSum += val;
        input.classList.remove('invalid');
        const passMark = getPassMark(examType, subject, classVal);
        if (val < passMark) allPass = false;
      }
    }
  });
  
  const totalCell = row.querySelector('.total-cell');
  if (totalCell) {
    totalCell.textContent = isGraded ? '-' : (allEmpty ? '-' : totalSum);
  }
  
  const resultCell = row.querySelector('.result-cell');
  if (!allFilled) {
    resultCell.innerHTML = '-';
  } else {
    if (isGraded) {
      resultCell.innerHTML = '<span class="badge badge-pass">Graded</span>';
    } else if (anyAbsent) {
      resultCell.innerHTML = '<span class="badge badge-info" style="background-color: #64748b; color: white;">Absent</span>';
    } else {
      if (allPass) {
        resultCell.innerHTML = '<span class="badge badge-pass">Pass</span>';
      } else {
        resultCell.innerHTML = '<span class="badge badge-fail">Fail</span>';
      }
    }
  }
}

async function saveMarks() {
  const classNum = document.getElementById('marks-class').value;
  const exam = document.getElementById('marks-exam').value;
  
  if (!exam) return;
  
  const tbody = document.getElementById('marks-table-body');
  if (!tbody) return;
  
  const rows = tbody.querySelectorAll('tr');
  const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(exam);
  
  const upserts = [];
  let hasInvalid = false;
  
  rows.forEach(row => {
    const studentId = row.dataset.studentId;
    const inputs = row.querySelectorAll('.marks-input');
    
    let hasAnyMark = false;
    inputs.forEach(inp => { if (inp.value !== '') hasAnyMark = true; });
    
    if (hasAnyMark) {
      let totalSum = 0;
      let anyFail = false;
      let allPass = true;
      let anyAbsent = false;
      let allAbsent = true;
      let allEmpty = true;
      
      inputs.forEach(inp => {
        const valStr = inp.value.trim();
        const sub = inp.dataset.subject;
        if (valStr !== '') {
          allEmpty = false;
          const maxMarksVal = getMaxMarks(exam, sub, classNum);
          if (isGraded) {
            upserts.push({
              student_id: studentId,
              school_id: currentSchool.id,
              class_number: classNum,
              exam_type: exam,
              subject: sub,
              marks: null,
              pass_fail: valStr
            });
          } else {
            const valUpper = valStr.toUpperCase();
            if (valUpper === 'AB') {
              anyAbsent = true;
              upserts.push({
                student_id: studentId,
                school_id: currentSchool.id,
                class_number: classNum,
                exam_type: exam,
                subject: sub,
                marks: null,
                pass_fail: 'AB'
              });
            } else {
              const marks = parseFloat(valStr);
              if (!isNaN(marks) && marks >= 0 && marks <= maxMarksVal) {
                totalSum += marks;
                allAbsent = false;
                const passFail = calculatePassFail(marks, exam, sub, classNum);
                if (passFail === 'Fail' || passFail === 'Grade-D') anyFail = true;
                
                upserts.push({
                  student_id: studentId,
                  school_id: currentSchool.id,
                  class_number: classNum,
                  exam_type: exam,
                  subject: sub,
                  marks: marks,
                  pass_fail: passFail
                });
              } else {
                hasInvalid = true;
              }
            }
          }
        } else {
          allPass = false;
        }
      });
      
      if (!isGraded && !hasInvalid && !allEmpty) {
        let pf = 'Incomplete';
        if (anyAbsent && allAbsent) {
          pf = 'AB';
        } else if (anyFail) {
          pf = 'Fail';
        } else if (allPass) {
          pf = 'Pass';
        }
        
        upserts.push({
          student_id: studentId,
          school_id: currentSchool.id,
          class_number: classNum,
          exam_type: exam,
          subject: 'Total',
          marks: totalSum,
          pass_fail: pf
        });
      }
    }
  });
  
  if (hasInvalid) {
    showToast('Some marks are out of valid range. Please correct them.', 'error');
    return;
  }
  
  if (upserts.length === 0) {
    showToast('No marks to save.', 'info');
    return;
  }
  
  showLoading();
  try {
    const { error } = await supabase
      .from('exam_marks')
      .upsert(upserts, { onConflict: 'student_id,exam_type,subject' });
      
    if (error) throw error;
    showToast('Marks saved successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function fetchReportData() {
  const rClass = document.getElementById('report-class').value;
  const rSection = document.getElementById('report-section').value;
  const rExam = document.getElementById('report-exam').value;
  
  let stuQuery = supabase
    .from('students')
    .select('*')
    .eq('school_id', currentSchool.id)
    .order('class_number', { ascending: true })
    .order('section', { ascending: true })
    .order('roll_number', { ascending: true });
    
  if (rClass) stuQuery = stuQuery.eq('class_number', rClass);
  if (rSection) stuQuery = stuQuery.eq('section', rSection);
  
  const { data: students, error: stuErr } = await stuQuery;
  if (stuErr) throw stuErr;
  
  if (students.length === 0) return { students: [], marksMap: {}, exams: [] };
  
  const studentIds = students.map(s => s.id);
  
  let marksQuery = supabase
    .from('exam_marks')
    .select('*')
    .in('student_id', studentIds);
    
  if (rExam) marksQuery = marksQuery.eq('exam_type', rExam);
  
  const { data: marks, error: marksErr } = await marksQuery;
  if (marksErr) throw marksErr;
  
  const marksMap = {}; 
  const examsSet = new Set();
  
  marks.forEach(m => {
    if (!marksMap[m.student_id]) marksMap[m.student_id] = {};
    if (!marksMap[m.student_id][m.exam_type]) marksMap[m.student_id][m.exam_type] = {};
    marksMap[m.student_id][m.exam_type][m.subject] = m;
    examsSet.add(m.exam_type);
  });
  
  const exams = rExam ? [rExam] : Array.from(examsSet).sort();
  
  return { students, marksMap, exams };
}

function onReportClassChange() {
  updateExamDropdown('report-class', 'report-exam', true);
}

async function exportExcel() {
  showLoading();
  try {
    const { students, marksMap, exams } = await fetchReportData();
    if (students.length === 0) {
      showToast('No data found for the selected filters', 'warning');
      return;
    }
    
    let allData = [];
    
    students.forEach(s => {
      const subjects = getSubjects(s.class_number);
      const sMarks = marksMap[s.id] || {};
      
      if (exams.length === 0) {
         let row = {
           'Class': classDisplayName(s.class_number),
           'Section': s.section,
           'Roll No': s.roll_number,
           'Student Name': s.student_name,
           'Gender': s.gender
         };
         allData.push(row);
      } else {
        exams.forEach(ex => {
          let row = {
            'Class': classDisplayName(s.class_number),
            'Section': s.section,
            'Roll No': s.roll_number,
            'Student Name': s.student_name,
            'Gender': s.gender,
            'Exam': ex
          };
          
          const subjects = getSubjects(s.class_number, ex);
          let exMarks = sMarks[ex] || {};
          let allPass = true;
          let anyMark = false;
          let anyAbsent = false;
          let totalSum = 0;
          let allEmpty = true;
          const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(ex);
          
          subjects.forEach(sub => {
            const m = exMarks[sub];
            if (m) {
              row[`${sub}`] = isGraded ? m.pass_fail : (m.pass_fail === 'AB' ? 'AB' : m.marks);
              if (!isGraded) {
                row[`${sub} Result`] = m.pass_fail;
                if (m.pass_fail === 'AB') {
                  anyAbsent = true;
                } else if (m.marks !== null) {
                  totalSum += m.marks;
                  allEmpty = false;
                }
                if (m.pass_fail === 'Fail' || m.pass_fail === 'Grade-D') allPass = false;
              }
              anyMark = true;
            } else {
              row[`${sub}`] = '';
              if (!isGraded) {
                row[`${sub} Result`] = '';
                allPass = false; 
              }
            }
          });
          
          row['Total'] = isGraded ? '-' : (allEmpty ? '-' : totalSum);
          
          if (isGraded) {
            row['Overall Result'] = anyMark ? 'Graded' : '-';
          } else {
            row['Overall Result'] = anyMark ? (anyAbsent ? 'Absent' : (allPass ? 'Pass' : 'Fail')) : '-';
          }
          allData.push(row);
        });
      }
    });
    
    const ws = XLSX.utils.json_to_sheet(allData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    if (exams.length === 1) {
      const activeExam = exams[0];
      const dist = {};
      
      students.forEach(student => {
        const subjects = getSubjects(student.class_number, activeExam);
        const sMarks = marksMap[student.id] || {};
        const exMarks = sMarks[activeExam] || {};
        
        subjects.forEach(sub => {
          if (!dist[sub]) {
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
          }
          const isGradedExcel = ['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(String(activeExam).toUpperCase());
          const m = exMarks[sub];
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
                grade = calculatePassFail(marksVal, activeExam, sub, student.class_number);
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
            
            if (grade && dist[sub][grade] !== undefined) {
              dist[sub][grade]++;
              dist[sub]['Total']++;
            }
          }
        });
      });
      
      const distData = Object.keys(dist).map(sub => {
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
            const maxMarks = getMaxMarks(activeExam, sub, students[0] ? students[0].class_number : '');
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
      XLSX.utils.book_append_sheet(wb, distWorksheet, "Grade Distribution");
    }
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${currentSchool.school_name.replace(/\s+/g, '_')}_Report_${dateStr}.xlsx`);
    
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function exportPDF() {
  showLoading();
  try {
    const { students, marksMap, exams } = await fetchReportData();
    if (students.length === 0) {
      showToast('No data found for the selected filters', 'warning');
      return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape' });
    
    const dateStr = new Date().toISOString().split('T')[0];
    doc.setFontSize(16);
    doc.text(`${currentSchool.school_name} - Student Report`, 14, 15);
    
    doc.setFontSize(10);
    const filterText = `Filters: Class ${document.getElementById('report-class').value || 'All'}, Section ${document.getElementById('report-section').value || 'All'}, Exam ${document.getElementById('report-exam').value || 'All'}`;
    doc.text(filterText, 14, 22);
    
    let tableHead = [['Class', 'Sec', 'Roll', 'Name', 'Exam', 'Subjects...', 'Total', 'Overall']];
    let tableBody = [];
    
    students.forEach(s => {
      const sMarks = marksMap[s.id] || {};
      
      if (exams.length === 0) {
         tableBody.push([
           classDisplayName(s.class_number),
           s.section,
           s.roll_number,
           s.student_name,
           '-',
           '-',
           '-',
           '-'
         ]);
      } else {
        exams.forEach(ex => {
          const subjects = getSubjects(s.class_number, ex);
          let exMarks = sMarks[ex] || {};
          let allPass = true;
          let anyMark = false;
          let anyAbsent = false;
          let subStr = [];
          
          const isGraded = ['MBLP Exam1', 'MBLP Exam2', 'MBLP Exam3', 'End line test'].includes(ex);
          
          let totalSum = 0;
          let allEmpty = true;
          subjects.forEach(sub => {
            const m = exMarks[sub];
            if (m) {
              subStr.push(isGraded ? `${sub}: ${m.pass_fail}` : `${sub}: ${m.pass_fail === 'AB' ? 'AB' : m.marks}`);
              anyMark = true;
              if (m.pass_fail === 'AB') {
                anyAbsent = true;
              } else if (m.marks !== null) {
                totalSum += m.marks;
                allEmpty = false;
              }
              if (!isGraded && (m.pass_fail === 'Fail' || m.pass_fail === 'Grade-D')) allPass = false;
            }
          });
          
          let totalVal = isGraded ? '-' : (allEmpty ? '-' : totalSum);
          let overall = anyMark ? (isGraded ? 'Graded' : (anyAbsent ? 'Absent' : (allPass ? 'Pass' : 'Fail'))) : '-';
          
          tableBody.push([
            classDisplayName(s.class_number),
            s.section,
            s.roll_number,
            s.student_name,
            ex,
            subStr.join(', '),
            totalVal,
            overall
          ]);
        });
      }
    });
    
    doc.autoTable({
      startY: 28,
      head: tableHead,
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    if (exams.length === 1) {
      const activeExam = exams[0];
      const dist = {};
      
      students.forEach(student => {
        const subjects = getSubjects(student.class_number, activeExam);
        const sMarks = marksMap[student.id] || {};
        const exMarks = sMarks[activeExam] || {};
        
        subjects.forEach(sub => {
          if (!dist[sub]) {
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
          }
          const isGradedPDF = ['MBLP EXAM1', 'MBLP EXAM2', 'MBLP EXAM3', 'END LINE TEST'].includes(String(activeExam).toUpperCase());
          const m = exMarks[sub];
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
                grade = calculatePassFail(marksVal, activeExam, sub, student.class_number);
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
            
            if (grade && dist[sub][grade] !== undefined) {
              dist[sub][grade]++;
              dist[sub]['Total']++;
            }
          }
        });
      });
      
      doc.addPage();
      doc.setFontSize(16);
      doc.text('Grade Distribution Summary', 14, 15);
      doc.setFontSize(10);
      doc.text(`School: ${currentSchool.school_name} | Exam: ${activeExam}`, 14, 22);
      
      const distHead = [['Subject', 'Grade-A', 'Grade-B', 'Grade-C', 'Grade-D', 'Total', 'Passed', 'Failed', 'Pass %', 'Avg Marks (Avg %)', 'Highest / Lowest']];
      const distBody = Object.keys(dist).map(sub => {
        const sDist = dist[sub];
        const passed = sDist['Grade-A'] + sDist['Grade-B'] + sDist['Grade-C'];
        const failed = sDist['Grade-D'];
        const totalGraded = sDist['Total'];
        const passPercent = totalGraded > 0 ? Math.round((passed / totalGraded) * 100) : 0;
        
        let avgStr = '-';
        let highLowStr = '-';
        
        if (!isGradedPDF && sDist['countMarks'] > 0) {
            const avg = sDist['sumMarks'] / sDist['countMarks'];
            const maxMarks = getMaxMarks(activeExam, sub, students[0] ? students[0].class_number : '');
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
        styles: { fontSize: 8 },
        headStyles: { fillColor: [41, 128, 185] }
      });
    }
    
    doc.save(`${currentSchool.school_name.replace(/\s+/g, '_')}_Report_${dateStr}.pdf`);
    
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ============================================
// Staff Profile CRUD logic
// ============================================
let allStaff = [];

function renderStaffTable() {
  const tbody = document.getElementById('staff-table-body');
  tbody.innerHTML = '';
  
  const searchVal = document.getElementById('staff-search-input').value.trim().toLowerCase();
  
  const filtered = allStaff.filter(s => {
    if (!searchVal) return true;
    return (
      s.staff_name.toLowerCase().includes(searchVal) ||
      s.designation.toLowerCase().includes(searchVal) ||
      s.subject.toLowerCase().includes(searchVal) ||
      formatQualificationSummary(s).toLowerCase().includes(searchVal)
    );
  });
  
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No staff records found. Click Add to create one.</td></tr>';
    return;
  }
  
  filtered.forEach(s => {
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
      <td>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline" onclick="openStaffModal('${s.id}')"><i class="fas fa-edit"></i> Edit</button>
          <button class="btn btn-sm btn-danger" onclick="deleteStaff('${s.id}', '${s.staff_name.replace(/'/g, "\\'")}')"><i class="fas fa-trash"></i> Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function loadStaffTable() {
  showLoading();
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('*')
      .eq('school_id', currentSchool.id)
      .order('created_at', { ascending: false });
      
    if (error) throw error;
    
    allStaff = data || [];
    renderStaffTable();
    
    const searchInput = document.getElementById('staff-search-input');
    if (searchInput) searchInput.value = '';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function openStaffModal(id = null) {
  const modal = document.getElementById('staff-modal');
  const title = document.getElementById('staff-modal-title');
  const form = document.getElementById('staff-form');
  
  form.reset();
  document.getElementById('staff-edit-id').value = '';
  
  if (id) {
    const s = allStaff.find(item => item.id === id);
    if (s) {
      title.textContent = 'Edit Staff Member';
      document.getElementById('staff-edit-id').value = s.id;
      document.getElementById('staff-name').value = s.staff_name;
      document.getElementById('staff-designation').value = s.designation;
      document.getElementById('staff-emp-type').value = s.employment_type;
      document.getElementById('staff-subject').value = s.subject;
      document.getElementById('staff-joined-service').value = s.joined_service_date || '';
      document.getElementById('staff-joined-institution').value = s.joined_institution_date || '';
      document.getElementById('staff-phone1').value = s.phone_1 || '';
      document.getElementById('staff-phone2').value = s.phone_2 || '';
      
      populateQualFormFields('staff', s);
    }
  } else {
    title.textContent = 'Add Staff Member';
    populateQualFormFields('staff', null);
  }
  
  modal.classList.remove('hidden');
}

function closeStaffModal() {
  document.getElementById('staff-modal').classList.add('hidden');
}

async function saveStaff(event) {
  event.preventDefault();
  
  const id = document.getElementById('staff-edit-id').value;
  const name = document.getElementById('staff-name').value.trim();
  const designation = document.getElementById('staff-designation').value.trim();
  const empType = document.getElementById('staff-emp-type').value;
  const subject = document.getElementById('staff-subject').value.trim();
  const joinedService = document.getElementById('staff-joined-service').value || null;
  const joinedInst = document.getElementById('staff-joined-institution').value || null;
  const phone1 = document.getElementById('staff-phone1').value.trim() || null;
  const phone2 = document.getElementById('staff-phone2').value.trim() || null;
  
  const qualData = readQualFormFields('staff');
  
  const payload = {
    school_id: currentSchool.id,
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
    closeStaffModal();
    loadStaffTable();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function deleteStaff(id, name) {
  if (!confirm(`Are you sure you want to delete staff member: ${name}?`)) return;
  
  showLoading();
  try {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
    showToast('Staff member deleted successfully', 'success');
    loadStaffTable();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function openBulkPasteModal() {
  const modal = document.getElementById('bulk-paste-modal');
  const textarea = document.getElementById('bulk-paste-textarea');
  textarea.value = '';
  modal.classList.remove('hidden');
  textarea.focus();
}

function closeBulkPasteModal() {
  document.getElementById('bulk-paste-modal').classList.add('hidden');
}

function applyBulkPaste() {
  const text = document.getElementById('bulk-paste-textarea').value;
  const lines = text.split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0);
                    
  if (lines.length === 0) {
    showToast('Please paste at least one name.', 'warning');
    return;
  }
  
  const tbody = document.getElementById('students-table-body');
  if (!tbody) {
    showToast('Student list is not loaded yet.', 'error');
    return;
  }
  
  const rows = tbody.querySelectorAll('tr');
  let count = 0;
  
  lines.forEach((name, index) => {
    if (index < rows.length) {
      const input = rows[index].querySelector('.student-name');
      if (input) {
        input.value = name;
        count++;
      }
    }
  });
  
  showToast(`Successfully populated ${count} student names. Click 'Save Students' to save.`, 'success');
  closeBulkPasteModal();
}

function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to delete student: ${name}? This will also delete all their exam marks.`)) return;
  
  showLoading();
  supabase
    .from('students')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      hideLoading();
      if (error) {
        showToast(error.message, 'error');
      } else {
        showToast('Student deleted successfully', 'success');
        loadStudentTable();
      }
    })
    .catch(err => {
      hideLoading();
      showToast(err.message, 'error');
    });
}

document.addEventListener('DOMContentLoaded', initSchool);
