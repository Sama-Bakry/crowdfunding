"use strict";

document.addEventListener("DOMContentLoaded", () => {
    checkAdminAccess();

    // Setup tabs
    document.querySelectorAll(".admin-nav-item").forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            document.querySelectorAll(".admin-nav-item").forEach(nav => nav.classList.remove("active"));
            document.querySelectorAll(".section-panel").forEach(panel => panel.classList.remove("active"));
            
            e.target.classList.add("active");
            const targetId = e.target.dataset.target;
            document.getElementById(`section-${targetId}`).classList.add("active");

            // Load data for the selected tab
            if (targetId === "users") loadUsers();
            if (targetId === "projects") loadProjects();
            if (targetId === "categories") loadCategories();
            if (targetId === "reports") loadReports();
        });
    });

    // Setup Add Category
    document.getElementById("add-category-btn").addEventListener("click", () => {
        document.getElementById("add-category-form").hidden = false;
    });
    document.getElementById("cancel-category-btn").addEventListener("click", () => {
        document.getElementById("add-category-form").hidden = true;
        document.getElementById("new-category-name").value = "";
    });
    document.getElementById("save-category-btn").addEventListener("click", createCategory);
});

async function checkAdminAccess() {
    try {
        const user = await authApiRequest("/accounts/profile/");
        // In Django, is_staff is not directly exposed in UserProfileSerializer unless we added it.
        // Assuming if the API call to /accounts/admin/users/ works, they are admin.
        const testRes = await authApiRequest("/accounts/admin/users/");
        
        document.getElementById("admin-container").hidden = false;
        loadUsers(); // Load initial tab
    } catch (error) {
        document.getElementById("admin-error").hidden = false;
    }
}

/* ====================================
   USERS
==================================== */
async function loadUsers() {
    try {
        const data = await authApiRequest("/accounts/admin/users/");
        const tbody = document.getElementById("users-tbody");
        const users = data.results || data; // handle paginated or direct list
        
        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5">No users found.</td></tr>`;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${escapeHtml(user.first_name)} ${escapeHtml(user.last_name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>${escapeHtml(user.phone_number)}</td>
                <td class="admin-actions">
                    <button class="admin-btn btn-danger" onclick="deleteUser(${user.id})">Delete</button>
                </td>
            </tr>
        `).join("");
    } catch (error) {
        console.error("Failed to load users", error);
    }
}

async function deleteUser(id) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
        await authApiRequest(`/accounts/admin/users/${id}/`, { method: "DELETE" });
        loadUsers();
    } catch (error) {
        alert("Failed to delete user.");
    }
}

/* ====================================
   PROJECTS
==================================== */
async function loadProjects() {
    try {
        const data = await apiRequest("/projects/"); // Anyone can list, but admin sees all
        const tbody = document.getElementById("projects-tbody");
        const projects = data.results || data;
        
        if (projects.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">No projects found.</td></tr>`;
            return;
        }

        tbody.innerHTML = projects.map(proj => `
            <tr>
                <td>${proj.id}</td>
                <td><a href="project-details.html?id=${proj.id}">${escapeHtml(proj.title)}</a></td>
                <td>${proj.category ? escapeHtml(proj.category.name) : '-'}</td>
                <td>${proj.status}</td>
                <td>${proj.is_featured ? 'Yes' : 'No'}</td>
                <td class="admin-actions">
                    <button class="admin-btn ${proj.is_featured ? 'btn-danger' : 'btn-success'}" onclick="toggleFeature(${proj.id})">
                        ${proj.is_featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button class="admin-btn btn-danger" onclick="deleteProject(${proj.id})">Delete</button>
                </td>
            </tr>
        `).join("");
    } catch (error) {
        console.error("Failed to load projects", error);
    }
}

async function toggleFeature(id) {
    try {
        await authApiRequest(`/projects/${id}/feature/`, { method: "POST" });
        loadProjects();
    } catch (error) {
        alert("Failed to toggle feature status.");
    }
}

async function deleteProject(id) {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
        await authApiRequest(`/projects/${id}/`, { method: "DELETE" });
        loadProjects();
    } catch (error) {
        alert("Failed to delete project.");
    }
}

/* ====================================
   CATEGORIES
==================================== */
async function loadCategories() {
    try {
        const data = await apiRequest("/projects/categories/");
        const tbody = document.getElementById("categories-tbody");
        const cats = data.results || data;
        
        if (cats.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">No categories found.</td></tr>`;
            return;
        }

        tbody.innerHTML = cats.map(cat => `
            <tr>
                <td>${cat.id}</td>
                <td>${escapeHtml(cat.name)}</td>
                <td>${escapeHtml(cat.slug)}</td>
                <td class="admin-actions">
                    <button class="admin-btn btn-danger" onclick="deleteCategory(${cat.id})">Delete</button>
                </td>
            </tr>
        `).join("");
    } catch (error) {
        console.error("Failed to load categories", error);
    }
}

async function createCategory() {
    const nameInput = document.getElementById("new-category-name");
    if (!nameInput.value.trim()) return;
    
    try {
        await authApiRequest("/projects/categories/", {
            method: "POST",
            body: JSON.stringify({ name: nameInput.value.trim() })
        });
        nameInput.value = "";
        document.getElementById("add-category-form").hidden = true;
        loadCategories();
    } catch (error) {
        alert("Failed to create category. Ensure the name is unique.");
    }
}

async function deleteCategory(id) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
        await authApiRequest(`/projects/categories/${id}/`, { method: "DELETE" });
        loadCategories();
    } catch (error) {
        alert("Failed to delete category (it might be in use).");
    }
}

/* ====================================
   REPORTS
==================================== */
async function loadReports() {
    try {
        const data = await authApiRequest("/interactions/admin/reports/");
        const tbody = document.getElementById("reports-tbody");
        const reports = data.results || data;
        
        if (reports.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6">No reports found.</td></tr>`;
            return;
        }

        tbody.innerHTML = reports.map(rep => {
            let targetHtml = rep.report_type === 'project' 
                ? `Project: <a href="project-details.html?id=${rep.project.id}">${escapeHtml(rep.project.title)}</a>` 
                : `Comment ID: ${rep.comment ? rep.comment.id : 'N/A'}`;
                
            let targetId = rep.report_type === 'project' ? rep.project.id : (rep.comment ? rep.comment.id : null);
            
            return `
            <tr>
                <td>${rep.id}</td>
                <td>${rep.reporter ? escapeHtml(rep.reporter.email) : 'Unknown'}</td>
                <td>${rep.report_type}</td>
                <td>${targetHtml}</td>
                <td>${escapeHtml(rep.reason)}</td>
                <td class="admin-actions">
                    ${targetId ? `<button class="admin-btn btn-danger" onclick="removeInappropriate('${rep.report_type}', ${targetId})">Delete Target</button>` : ''}
                </td>
            </tr>
        `}).join("");
    } catch (error) {
        console.error("Failed to load reports", error);
    }
}

async function removeInappropriate(type, id) {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return;
    try {
        if (type === 'project') {
            await authApiRequest(`/projects/${id}/`, { method: "DELETE" });
        } else if (type === 'comment') {
            await authApiRequest(`/interactions/comments/${id}/`, { method: "DELETE" });
        }
        alert(`${type} deleted successfully.`);
        loadReports(); // Reload to see changes
    } catch (error) {
        alert(`Failed to delete ${type}.`);
    }
}
