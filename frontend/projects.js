"use strict";


let currentPage = 1;
let currentFilters = {
    search: "",
    category: "",
    tag: "",
    ordering: "-created_at",
};

let nextPageUrl = null;
let previousPageUrl = null;


document.addEventListener("DOMContentLoaded", () => {

    readFiltersFromUrl();

    loadCategories();
    loadProjects();

    document.getElementById("category-filter")
        .addEventListener("change", handleFilterChange);

    document.getElementById("ordering-filter")
        .addEventListener("change", handleFilterChange);

    const searchInput = document.getElementById("search-filter");
    if (searchInput) {
        searchInput.value = currentFilters.search;
        let searchDebounce = null;
        searchInput.addEventListener("input", () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(handleFilterChange, 350);
        });
    }

    const tagInput = document.getElementById("tag-filter");
    if (tagInput) {
        tagInput.value = currentFilters.tag;
        let tagDebounce = null;
        tagInput.addEventListener("input", () => {
            clearTimeout(tagDebounce);
            tagDebounce = setTimeout(handleFilterChange, 350);
        });
    }

    document.getElementById("pagination-prev")
        .addEventListener("click", () => changePage(currentPage - 1));

    document.getElementById("pagination-next")
        .addEventListener("click", () => changePage(currentPage + 1));

});


function readFiltersFromUrl() {

    const params = new URLSearchParams(window.location.search);

    currentFilters.search = params.get("search") || "";
    currentFilters.category = params.get("category") || "";
    currentFilters.tag = params.get("tag") || "";
    currentFilters.ordering = params.get("ordering") || "-created_at";
    currentPage = Number(params.get("page")) || 1;
}


async function loadCategories() {

    try {
        const categories = await fetchCategories();
        const select = document.getElementById("category-filter");

        const options = categories.map((category) => {
            const selected =
                String(category.id) === currentFilters.category ? " selected" : "";

            return `<option value="${category.id}"${selected}>${escapeHtml(category.name)}</option>`;
        });

        select.innerHTML =
            `<option value="">All categories</option>` + options.join("");

    } catch (error) {
        console.error("Failed to load categories:", error);
    }
}


function handleFilterChange() {

    const searchInput = document.getElementById("search-filter");
    if (searchInput) currentFilters.search = searchInput.value.trim();

    currentFilters.category = document.getElementById("category-filter").value;
    const tagInput = document.getElementById("tag-filter");
    if (tagInput) currentFilters.tag = tagInput.value.trim();
    currentFilters.ordering = document.getElementById("ordering-filter").value;

    changePage(1);
}


function changePage(page) {

    currentPage = Math.max(1, page);

    updateUrl();
    loadProjects();
}


function updateUrl() {

    const params = new URLSearchParams();

    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.category) params.set("category", currentFilters.category);
    if (currentFilters.tag) params.set("tag", currentFilters.tag);
    if (currentFilters.ordering) params.set("ordering", currentFilters.ordering);
    if (currentPage > 1) params.set("page", String(currentPage));

    const query = params.toString();

    window.history.replaceState(
        {},
        "",
        query ? `projects.html?${query}` : "projects.html"
    );
}


async function loadProjects() {

    const loadingEl = document.getElementById("projects-loading");
    const gridEl = document.getElementById("projects-grid");
    const emptyEl = document.getElementById("projects-empty");
    const paginationEl = document.getElementById("projects-pagination");

    loadingEl.hidden = false;
    gridEl.hidden = true;
    emptyEl.hidden = true;
    paginationEl.hidden = true;

    const params = new URLSearchParams();

    if (currentFilters.search) params.set("search", currentFilters.search);
    if (currentFilters.category) params.set("category", currentFilters.category);
    if (currentFilters.tag) params.set("tag", currentFilters.tag);
    if (currentFilters.ordering) params.set("ordering", currentFilters.ordering);
    params.set("page", String(currentPage));

    try {
        const data = await apiRequest(`/projects/?${params.toString()}`);

        loadingEl.hidden = true;

        nextPageUrl = data.next;
        previousPageUrl = data.previous;

        if (!data.results || data.results.length === 0) {
            emptyEl.hidden = false;
            return;
        }

        gridEl.hidden = false;
        gridEl.innerHTML = data.results.map(renderProjectCard).join("");

        renderPagination(data.count);

    } catch (error) {
        console.error("Failed to load projects:", error);

        loadingEl.hidden = true;
        emptyEl.hidden = false;
        emptyEl.querySelector("h3").textContent = "Something went wrong";
        emptyEl.querySelector("p").textContent =
            "We couldn't load projects right now. Please try again shortly.";
    }
}


function renderProjectCard(project) {

    const imageHtml = project.cover_image
        ? `
            <img
                src="${project.cover_image}"
                alt="${escapeHtml(project.title)}"
            >
        `
        : escapeHtml(
            project.category
                ? project.category.name
                : "Project"
        );

    const rating =
        project.average_rating !== null &&
        project.average_rating !== undefined
            ? Number(project.average_rating).toFixed(1)
            : "0.0";

    return `
        <a
            class="browse-card"
            href="project-details.html?id=${project.id}"
        >

            <div class="browse-card-image">
                ${imageHtml}
            </div>

            <div class="browse-card-body">

                <div class="browse-card-meta">

                    <span>
                        ${escapeHtml(
                            project.category
                                ? project.category.name
                                : "Uncategorized"
                        )}
                    </span>

                    ${statusBadgeHtml(project.status)}

                </div>

                <div
                    style="
                        display:flex;
                        align-items:flex-start;
                        justify-content:space-between;
                        gap:12px;
                    "
                >

                    <h3>
                        ${escapeHtml(project.title)}
                    </h3>

                    <span
                        style="
                            flex-shrink:0;
                            color:#d98225;
                            font-size:12px;
                            font-weight:800;
                            white-space:nowrap;
                        "
                    >
                        ★ ${rating}
                    </span>

                </div>

                <p
                    style="
                        margin:9px 0 13px;
                        color:var(--muted);
                        font-size:11px;
                    "
                >
                    Target:
                    ${formatCurrency(project.target_amount)}
                </p>

                ${progressBarHtml(project.funding_progress)}

                <div class="browse-card-footer">

                    <span class="browse-card-amount">
                        <strong>
                            ${Number(
                                project.funding_progress || 0
                            ).toFixed(2)}%
                        </strong>
                        funded
                    </span>

                    <span class="browse-card-amount">
                        Target
                        ${formatCurrency(
                            project.target_amount
                        )}
                    </span>

                </div>

            </div>

        </a>
    `;
}


function renderPagination(totalCount) {

    const paginationEl = document.getElementById("projects-pagination");
    const infoEl = document.getElementById("pagination-info");
    const prevButton = document.getElementById("pagination-prev");
    const nextButton = document.getElementById("pagination-next");

    const pageSize = 12;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    if (totalPages <= 1) {
        paginationEl.hidden = true;
        return;
    }

    paginationEl.hidden = false;
    infoEl.textContent = `Page ${currentPage} of ${totalPages}`;

    prevButton.disabled = !previousPageUrl;
    nextButton.disabled = !nextPageUrl;
}
