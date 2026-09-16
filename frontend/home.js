"use strict";

document.addEventListener("DOMContentLoaded", () => {
    loadHomeData();
});

async function loadHomeData() {
    try {
        const data = await apiRequest("/projects/home/");
        
        renderGrid("highest-rated-grid", data.highest_rated);
        renderGrid("latest-projects-grid", data.latest);
        renderGrid("featured-projects-grid", data.featured);
        renderCategories("categories-grid", data.categories);
        
    } catch (error) {
        console.error("Failed to load home data:", error);
    }
}

function renderGrid(containerId, projects) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!projects || projects.length === 0) {
        container.innerHTML = `<p class="empty-state">No projects found.</p>`;
        return;
    }
    
    container.innerHTML = projects.map(renderProjectCard).join("");
}

function renderCategories(containerId, categories) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!categories || categories.length === 0) {
        container.innerHTML = `<p class="empty-state">No categories found.</p>`;
        return;
    }
    
    container.innerHTML = categories.map(category => `
        <a class="category-card" href="projects.html?category=${category.id}">
            <h3>${escapeHtml(category.name)}</h3>
        </a>
    `).join("");
}

function renderProjectCard(project) {
    const imageHtml = project.cover_image
        ? `<img src="${project.cover_image}" alt="${escapeHtml(project.title)}">`
        : escapeHtml(project.category ? project.category.name : "Project");

    return `
        <article class="project-card">
            <a href="project-details.html?id=${project.id}" style="text-decoration: none; color: inherit; display: block;">
                <div class="project-card-visual">
                    ${imageHtml}
                </div>
                <div class="project-card-body">
                    <div class="project-card-meta">
                        <span>${escapeHtml(project.category ? project.category.name : "Uncategorized")}</span>
                        ${statusBadgeHtml(project.status)}
                    </div>
                    <h3>${escapeHtml(project.title)}</h3>
                    <p style="margin-bottom: 15px; color: #555;">Target: ${formatCurrency(project.target_amount)}</p>
                    ${progressBarHtml(project.funding_progress)}
                    <div style="margin-top: 10px; font-size: 0.9rem;">
                        <strong>${project.funding_progress}%</strong> funded
                    </div>
                </div>
            </a>
        </article>
    `;
}
