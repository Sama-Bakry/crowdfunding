"use strict";


let myProjectsPage = 1;
let myProjectsNextUrl = null;
let myProjectsPreviousUrl = null;


document.addEventListener("DOMContentLoaded", () => {

    if (!requireAuthOrRedirect()) {
        return;
    }

    loadMyProjects();

    document.getElementById("pagination-prev")
        .addEventListener("click", () => {
            myProjectsPage = Math.max(1, myProjectsPage - 1);
            loadMyProjects();
        });

    document.getElementById("pagination-next")
        .addEventListener("click", () => {
            myProjectsPage += 1;
            loadMyProjects();
        });

});


async function loadMyProjects() {

    const loadingEl = document.getElementById("my-projects-loading");
    const listEl = document.getElementById("my-projects-list");
    const emptyEl = document.getElementById("my-projects-empty");
    const paginationEl = document.getElementById("my-projects-pagination");

    loadingEl.hidden = false;
    listEl.innerHTML = "";
    emptyEl.hidden = true;
    paginationEl.hidden = true;

    try {
        const data = await authApiRequest(`/projects/my-projects/?page=${myProjectsPage}`);

        loadingEl.hidden = true;

        myProjectsNextUrl = data.next;
        myProjectsPreviousUrl = data.previous;

        if (!data.results || data.results.length === 0) {
            emptyEl.hidden = false;
            return;
        }

        listEl.innerHTML = data.results.map(renderProjectRow).join("");

        listEl.querySelectorAll("[data-cancel-id]").forEach((button) => {
            button.addEventListener("click", () => handleCancel(button.dataset.cancelId));
        });

        listEl.querySelectorAll("[data-delete-id]").forEach((button) => {
            button.addEventListener("click", () => handleDelete(button.dataset.deleteId));
        });

        renderPagination(data.count);

    } catch (error) {
        console.error("Failed to load your projects:", error);

        loadingEl.hidden = true;
        emptyEl.hidden = false;
        emptyEl.querySelector("h3").textContent = "Something went wrong";
        emptyEl.querySelector("p").textContent =
            "We couldn't load your projects right now. Please try again shortly.";
    }
}


function renderProjectRow(project) {

    const thumbHtml = project.cover_image
        ? `<img src="${project.cover_image}" alt="${escapeHtml(project.title)}">`
        : "";

    const cancelButtonHtml = (!project.is_cancelled && project.can_be_cancelled)
        ? `<button type="button" class="button-ghost button-small" data-cancel-id="${project.id}">Cancel</button>`
        : "";

    return `
        <div class="my-project-row">

            <div class="my-project-thumb">${thumbHtml}</div>

            <div class="my-project-info">
                <h3>${escapeHtml(project.title)}</h3>
                <p>
                    ${escapeHtml(project.category ? project.category.name : "Uncategorized")}
                    · ${formatCurrency(project.target_amount)} target
                    · ${project.funding_progress}% funded
                </p>
                ${statusBadgeHtml(project.status)}
            </div>

            <div class="my-project-actions">
                <a href="project-details.html?id=${project.id}" class="button-ghost button-small">View</a>
                <a href="edit-project.html?id=${project.id}" class="button-ghost button-small">Edit</a>
                ${cancelButtonHtml}
                <button type="button" class="button-danger button-small" data-delete-id="${project.id}">Delete</button>
            </div>

        </div>
    `;
}


async function handleCancel(projectId) {

    const confirmed = window.confirm(
        "Are you sure you want to cancel this project? This cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    try {
        await authApiRequest(`/projects/${projectId}/cancel/`, { method: "POST" });
        loadMyProjects();

    } catch (error) {
        console.error("Failed to cancel project:", error);
        window.alert(firstApiErrorMessage(error.data, "Unable to cancel this project right now."));
    }
}


async function handleDelete(projectId) {

    const confirmed = window.confirm(
        "Are you sure you want to permanently delete this project? This cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    try {
        await authApiRequest(`/projects/${projectId}/`, { method: "DELETE" });
        loadMyProjects();

    } catch (error) {
        console.error("Failed to delete project:", error);
        window.alert(firstApiErrorMessage(error.data, "Unable to delete this project right now."));
    }
}


function renderPagination(totalCount) {

    const paginationEl = document.getElementById("my-projects-pagination");
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
    infoEl.textContent = `Page ${myProjectsPage} of ${totalPages}`;

    prevButton.disabled = !myProjectsPreviousUrl;
    nextButton.disabled = !myProjectsNextUrl;
}
