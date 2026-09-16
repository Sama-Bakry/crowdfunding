"use strict";

document.addEventListener("DOMContentLoaded", () => {
    loadCategoriesPage();
});

async function loadCategoriesPage() {
    const loadingEl = document.getElementById("categories-loading");
    const gridEl = document.getElementById("categories-grid");
    const emptyEl = document.getElementById("categories-empty");

    try {
        const categories = await apiRequest("/projects/categories/");
        
        loadingEl.hidden = true;
        
        if (!categories || categories.length === 0) {
            emptyEl.hidden = false;
            return;
        }

        gridEl.hidden = false;
        gridEl.innerHTML = categories.map(category => `
            <a class="category-card-large" href="projects.html?category=${category.id}">
                <h3>${escapeHtml(category.name)}</h3>
            </a>
        `).join("");

    } catch (error) {
        console.error("Failed to load categories:", error);
        loadingEl.hidden = true;
        emptyEl.hidden = false;
        emptyEl.querySelector("h3").textContent = "Something went wrong";
    }
}
