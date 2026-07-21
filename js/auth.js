// ============================================
// Authentication Module
// ============================================

// Check if already logged in on page load
(function checkAuth() {
    const session = getSession();
    const path = window.location.pathname;
    let currentPage = 'index.html';
    
    if (path.endsWith('admin.html')) {
        currentPage = 'admin.html';
    } else if (path.endsWith('school.html')) {
        currentPage = 'school.html';
    }
    
    const baseUrl = getAppBaseUrl();

    if (currentPage === 'index.html') {
        // On login page - redirect if already logged in
        if (session) {
            window.location.href = baseUrl + (session.is_admin ? 'admin.html' : 'school.html');
        }
    } else if (currentPage === 'admin.html') {
        if (!session || !session.is_admin) {
            clearSession();
            window.location.href = baseUrl + 'index.html';
        }
    } else if (currentPage === 'school.html') {
        if (!session || session.is_admin) {
            clearSession();
            window.location.href = baseUrl + 'index.html';
        }
    }
})();

// Handle login form submission
async function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');

    if (!username || !password) {
        showToast('Please enter both User ID and Password', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    try {
        // Query the schools table for matching credentials
        const { data, error } = await supabase
            .from('schools')
            .select('id, school_name, username, password, is_admin')
            .eq('username', username)
            .single();

        if (error || !data) {
            showToast('Invalid User ID or Password', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            return;
        }

        // Check password (plain text comparison - for production, use hashing)
        if (data.password !== password) {
            showToast('Invalid User ID or Password', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
            return;
        }

        // Set session
        setSession({
            id: data.id,
            school_name: data.school_name,
            username: data.username,
            is_admin: data.is_admin
        });

        showToast('Login successful! Redirecting...', 'success');

        const baseUrl = getAppBaseUrl();
        setTimeout(() => {
            window.location.href = baseUrl + (data.is_admin ? 'admin.html' : 'school.html');
        }, 800);

    } catch (err) {
        console.error('Login error:', err);
        showToast('Connection error. Please check your internet.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
}
