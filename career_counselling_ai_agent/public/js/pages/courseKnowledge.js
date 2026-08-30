/* ═══════════════════════════════════════════════════════════════
   Assam Down Town University (AdtU) — Course Knowledge Base Page Module
   ═══════════════════════════════════════════════════════════════ */

'use strict';

function renderCoursesPage() {
  return `
    <div class="app-view active" id="view-courses">
      <div class="card">
        <div class="crm-toolbar">
          <div class="crm-toolbar-left">
            <div>
              <h2 class="card-title">Assam Down Town University — Course Knowledge Base</h2>
              <p class="card-desc">Programs, tuition fees, and eligibility criteria queried by AI Voice Agents</p>
            </div>
          </div>
          <div class="crm-toolbar-right">
            <div class="search-box">
              <input type="text" id="course-search" placeholder="Search course by code, name, or eligibility…" />
            </div>
          </div>
        </div>
        <div class="card-body p-0">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 110px;">Code</th>
                  <th style="width: 260px;">Program Name & Department</th>
                  <th style="width: 100px;">Level</th>
                  <th style="width: 160px;">Tuition Fees</th>
                  <th>Eligibility Criteria</th>
                </tr>
              </thead>
              <tbody id="courses-body"></tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function initCoursesPage() {
  const courseSearchInput = $('course-search');
  if (courseSearchInput) {
    courseSearchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        renderCoursesTable(cachedCourses);
        return;
      }
      const filtered = cachedCourses.filter((c) => {
        const code = String(c.courseCode || '').toLowerCase();
        const name = String(c.courseName || '').toLowerCase();
        const dept = String(c.department || '').toLowerCase();
        const elig = String(c.eligibilityCriteria || '').toLowerCase();
        return code.includes(query) || name.includes(query) || dept.includes(query) || elig.includes(query);
      });
      renderCoursesTable(filtered);
    });
  }

  loadCourses();
}

async function loadCourses() {
  try {
    const r = await api('/api/courses');
    cachedCourses = r.courses || [];
    renderCoursesTable(cachedCourses);
  } catch (_) {}
}

function renderCoursesTable(list) {
  const tbody = $('courses-body');
  if (!tbody) return;
  if (!Array.isArray(list) || !list.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="5">No matching courses found in AdtU Knowledge Base</td></tr>`;
    return;
  }
  tbody.innerHTML = list
    .map((c) => `<tr>
      <td class="mono nowrap">${esc(c.courseCode || '—')}</td>
      <td><b>${esc(c.courseName || '')}</b><div class="muted">${esc(c.department || '')}</div></td>
      <td class="nowrap"><span class="chip ${c.degreeLevel === 'PG' ? 'chip-amber' : 'chip-green'}">${esc(c.degreeLevel || 'UG')}</span></td>
      <td class="mono nowrap">₹${((c.totalTuitionFee || 0) / 100000).toFixed(2)}L <div class="muted">₹${((c.annualTuitionFee || 0) / 100000).toFixed(2)}L/yr</div></td>
      <td>${esc(c.eligibilityCriteria || '—')}</td>
    </tr>`)
    .join('');
}
