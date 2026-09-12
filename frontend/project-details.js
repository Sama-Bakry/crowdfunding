"use strict";


let currentProject = null;
let currentImageIndex = 0;


document.addEventListener("DOMContentLoaded", () => {

    const projectId = new URLSearchParams(window.location.search).get("id");

    if (!projectId) {
        showNotFound();
        return;
    }

    loadProject(projectId);

    document.getElementById("slider-prev")
        .addEventListener("click", () => moveSlide(-1));

    document.getElementById("slider-next")
        .addEventListener("click", () => moveSlide(1));

    document.getElementById("cancel-project-button")
        .addEventListener("click", handleCancelClick);

});


async function loadProject(projectId) {

    try {
        const project = await authApiRequest(`/projects/${projectId}/`);

        currentProject = project;

        renderProject(project);

    } catch (error) {
        console.error("Failed to load project:", error);
        showNotFound();
    }
}


function showNotFound() {
    document.getElementById("detail-loading").hidden = true;
    document.getElementById("detail-error").hidden = false;
}


function renderProject(project) {

    document.getElementById("detail-loading").hidden = true;
    document.getElementById("detail-content").hidden = false;

    document.title = `${project.title} — CrowdFund`;

    document.getElementById("detail-header").innerHTML = `
        <span class="tag-chip">${escapeHtml(project.category.name)}</span>
        ${statusBadgeHtml(project.status)}
    `;

    document.getElementById("detail-title").textContent = project.title;

    document.getElementById("detail-owner").textContent =
        `Created by ${project.owner.first_name} ${project.owner.last_name}`;

    document.getElementById("detail-tags").innerHTML = tagListHtml(project.tags);

    document.getElementById("detail-body").textContent = project.details;

    renderSlider(project.images);
    renderFunding(project);
    renderOwnerActions(project);
}


/* =========================
   Image slider
   ========================= */

function renderSlider(images) {

    const sliderEl = document.getElementById("image-slider");

    if (!images || images.length === 0) {
        sliderEl.hidden = true;
        return;
    }

    sliderEl.hidden = false;
    currentImageIndex = 0;

    renderSlide(images);

    document.getElementById("slider-prev").hidden = images.length <= 1;
    document.getElementById("slider-next").hidden = images.length <= 1;
}


function renderSlide(images) {

    const mainEl = document.getElementById("image-slider-main");
    const dotsEl = document.getElementById("slider-dots");

    mainEl.innerHTML =
        `<img src="${images[currentImageIndex].image}" alt="Project image ${currentImageIndex + 1}">`;

    dotsEl.innerHTML = images.map((_, index) => {
        const activeClass = index === currentImageIndex ? " active" : "";
        return `<button type="button" class="image-slider-dot${activeClass}" data-index="${index}"></button>`;
    }).join("");

    dotsEl.querySelectorAll(".image-slider-dot").forEach((dot) => {
        dot.addEventListener("click", () => {
            currentImageIndex = Number(dot.dataset.index);
            renderSlide(images);
        });
    });
}


function moveSlide(direction) {

    if (!currentProject || !currentProject.images || currentProject.images.length === 0) {
        return;
    }

    const total = currentProject.images.length;

    currentImageIndex = (currentImageIndex + direction + total) % total;

    renderSlide(currentProject.images);
}


/* =========================
   Funding sidebar
   ========================= */

function renderFunding(project) {

    document.getElementById("funding-raised").textContent =
        `${formatCurrency(project.total_donations)} raised`;

    document.getElementById("funding-target").textContent =
        `of ${formatCurrency(project.target_amount)} goal · ${project.funding_progress}% funded`;

    document.getElementById("funding-progress-bar").innerHTML =
        progressBarHtml(project.funding_progress);

    document.getElementById("funding-start").textContent =
        `Starts ${formatDate(project.start_date)}`;

    document.getElementById("funding-end").textContent =
        `Ends ${formatDate(project.end_date)}`;

    const actionsEl = document.getElementById("funding-actions");

    if (project.status === "running" && !project.is_cancelled) {
        actionsEl.innerHTML = `
            <button type="button" class="button button-coral button-full" disabled title="Donations are coming soon">
                Donate
            </button>
        `;
    } else {
        actionsEl.innerHTML = "";
    }
}


/* =========================
   Owner actions
   ========================= */

function renderOwnerActions(project) {

    const card = document.getElementById("owner-actions-card");

    if (!project.is_owner) {
        card.hidden = true;
        return;
    }

    card.hidden = false;

    document.getElementById("edit-project-link").href =
        `edit-project.html?id=${project.id}`;

    const cancelButton = document.getElementById("cancel-project-button");
    const noteEl = document.getElementById("cancel-project-note");

    if (project.is_cancelled) {
        cancelButton.hidden = true;
        noteEl.textContent = "This project has been cancelled.";
        return;
    }

    if (!project.can_be_cancelled) {
        cancelButton.hidden = true;
        noteEl.textContent =
            "This project can no longer be cancelled — either the campaign has ended or donations have passed 25% of the target.";
        return;
    }

    cancelButton.hidden = false;
    noteEl.textContent = "";
}


async function handleCancelClick() {

    if (!currentProject) {
        return;
    }

    const confirmed = window.confirm(
        "Are you sure you want to cancel this project? This cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    const button = document.getElementById("cancel-project-button");

    button.disabled = true;
    button.textContent = "Cancelling...";

    try {
        await authApiRequest(`/projects/${currentProject.id}/cancel/`, {
            method: "POST",
        });

        await loadProject(currentProject.id);

    } catch (error) {
        console.error("Failed to cancel project:", error);

        document.getElementById("cancel-project-note").textContent =
            firstApiErrorMessage(error.data, "Unable to cancel this project right now.");

    } finally {
        button.disabled = false;
        button.textContent = "Cancel project";
    }
}
