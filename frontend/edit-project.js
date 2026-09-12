"use strict";


let editingProjectId = null;
let editingProject = null;


document.addEventListener("DOMContentLoaded", () => {

    if (!requireAuthOrRedirect()) {
        return;
    }

    editingProjectId = new URLSearchParams(window.location.search).get("id");

    if (!editingProjectId) {
        showEditError("Project not found", "No project was specified.");
        return;
    }

    initializeEditPage();

    document.getElementById("edit-project-form")
        .addEventListener("submit", handleSaveSubmit);

    document.getElementById("image-input")
        .addEventListener("change", handleImageSelected);

    document.getElementById("cancel-project-button")
        .addEventListener("click", handleCancelProject);

    document.getElementById("delete-project-button")
        .addEventListener("click", handleDeleteProject);

});


async function initializeEditPage() {

    try {
        const [project, categories] = await Promise.all([
            authApiRequest(`/projects/${editingProjectId}/`),
            fetchCategories(),
        ]);

        if (!project.is_owner) {
            showEditError(
                "You don't have permission to edit this",
                "Only the creator of a project can edit it."
            );
            return;
        }

        editingProject = project;

        populateCategorySelect(document.getElementById("category"), categories, project.category.id);
        populateForm(project);
        renderExistingImages(project.images);
        renderCancellationSection(project);

        document.getElementById("edit-loading").hidden = true;
        document.getElementById("edit-content").hidden = false;

    } catch (error) {
        console.error("Failed to load project:", error);
        showEditError(
            "Project not found",
            "This project may have been removed or the link is incorrect."
        );
    }
}


function showEditError(title, message) {
    document.getElementById("edit-loading").hidden = true;
    document.getElementById("edit-error").hidden = false;
    document.getElementById("edit-error-title").textContent = title;
    document.getElementById("edit-error-message").textContent = message;
}


function populateForm(project) {

    document.getElementById("title").value = project.title;
    document.getElementById("details").value = project.details;
    document.getElementById("target_amount").value = project.target_amount;
    document.getElementById("tags").value = project.tags.map((tag) => tag.name).join(", ");
    document.getElementById("start_date").value = project.start_date;
    document.getElementById("end_date").value = project.end_date;

    document.title = `Edit ${project.title} — CrowdFund`;
}


function renderExistingImages(images) {

    const grid = document.getElementById("image-upload-grid");
    const addButton = grid.querySelector(".image-upload-add");

    images.forEach((image) => {

        const item = document.createElement("div");
        item.className = "image-upload-item";
        item.innerHTML = `
            <img src="${image.image}" alt="Project image">
            <button type="button" class="image-upload-remove" data-image-id="${image.id}">&times;</button>
        `;

        item.querySelector(".image-upload-remove")
            .addEventListener("click", () => removeImage(image.id, item));

        grid.insertBefore(item, addButton);
    });
}


function renderCancellationSection(project) {

    const button = document.getElementById("cancel-project-button");
    const note = document.getElementById("cancel-note");

    if (project.is_cancelled) {
        button.hidden = true;
        note.textContent = "This project has already been cancelled.";
        return;
    }

    if (!project.can_be_cancelled) {
        button.hidden = true;
        note.textContent =
            "This project can no longer be cancelled — either the campaign has ended or donations have passed 25% of the target.";
        return;
    }

    button.hidden = false;
    note.textContent =
        "You can cancel this project as long as total donations remain below 25% of the target amount.";
}


function collectFormValues() {

    return {
        title: document.getElementById("title").value.trim(),
        details: document.getElementById("details").value.trim(),
        category: document.getElementById("category").value,
        target_amount: document.getElementById("target_amount").value,
        tags: document.getElementById("tags").value
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        start_date: document.getElementById("start_date").value,
        end_date: document.getElementById("end_date").value,
    };
}


async function handleSaveSubmit(event) {

    event.preventDefault();

    const form = document.getElementById("edit-project-form");

    clearFieldErrors(form);
    hideEditAlert();

    const values = collectFormValues();

    setSaveLoading(true);

    try {
        const updated = await authApiRequest(`/projects/${editingProjectId}/`, {
            method: "PATCH",
            body: JSON.stringify(values),
        });

        editingProject = { ...editingProject, ...updated };

        showEditAlert("Your changes have been saved.", "success");
        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (error) {
        console.error("Failed to update project:", error);

        applyFieldErrors(error.data, {
            title: "title",
            details: "details",
            category: "category",
            target_amount: "target_amount",
            start_date: "start_date",
            end_date: "end_date",
        });

        showEditAlert(
            firstApiErrorMessage(error.data, "Unable to save your changes. Please review the form and try again."),
            "error"
        );

    } finally {
        setSaveLoading(false);
    }
}


async function handleImageSelected(event) {

    const files = Array.from(event.target.files || []);

    if (files.length === 0) {
        return;
    }

    for (const file of files) {
        await uploadImage(file);
    }

    event.target.value = "";
}


async function uploadImage(file) {

    const grid = document.getElementById("image-upload-grid");
    const addButton = grid.querySelector(".image-upload-add");

    const placeholder = document.createElement("div");
    placeholder.className = "image-upload-item";
    placeholder.innerHTML = `<img src="${URL.createObjectURL(file)}" alt="Uploading...">`;

    grid.insertBefore(placeholder, addButton);

    try {
        const formData = new FormData();
        formData.append("image", file);

        const image = await authMultipartRequest(
            `/projects/${editingProjectId}/images/`,
            formData
        );

        placeholder.innerHTML = `
            <img src="${image.image}" alt="Project image">
            <button type="button" class="image-upload-remove" data-image-id="${image.id}">&times;</button>
        `;

        placeholder.querySelector(".image-upload-remove")
            .addEventListener("click", () => removeImage(image.id, placeholder));

    } catch (error) {
        console.error("Failed to upload image:", error);
        placeholder.remove();

        showEditAlert(
            firstApiErrorMessage(error.data, "One of your images could not be uploaded."),
            "error"
        );
    }
}


async function removeImage(imageId, element) {

    try {
        await authApiRequest(`/projects/${editingProjectId}/images/${imageId}/`, {
            method: "DELETE",
        });

        element.remove();

    } catch (error) {
        console.error("Failed to remove image:", error);
    }
}


async function handleCancelProject() {

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
        await authApiRequest(`/projects/${editingProjectId}/cancel/`, {
            method: "POST",
        });

        window.location.href = `project-details.html?id=${editingProjectId}`;

    } catch (error) {
        console.error("Failed to cancel project:", error);

        showEditAlert(
            firstApiErrorMessage(error.data, "Unable to cancel this project right now."),
            "error"
        );

        button.disabled = false;
        button.textContent = "Cancel project";
    }
}


async function handleDeleteProject() {

    const confirmed = window.confirm(
        "Are you sure you want to permanently delete this project? This cannot be undone."
    );

    if (!confirmed) {
        return;
    }

    const button = document.getElementById("delete-project-button");

    button.disabled = true;
    button.textContent = "Deleting...";

    try {
        await authApiRequest(`/projects/${editingProjectId}/`, {
            method: "DELETE",
        });

        window.location.href = "my-projects.html";

    } catch (error) {
        console.error("Failed to delete project:", error);

        showEditAlert(
            firstApiErrorMessage(error.data, "Unable to delete this project right now."),
            "error"
        );

        button.disabled = false;
        button.textContent = "Delete project";
    }
}


function setSaveLoading(isLoading) {

    const button = document.getElementById("save-button");
    const buttonText = document.getElementById("save-button-text");

    button.disabled = isLoading;
    buttonText.textContent = isLoading ? "Saving..." : "Save changes";
}


function showEditAlert(message, type = "error") {

    const el = document.getElementById("edit-alert");

    el.hidden = false;
    el.textContent = message;
    el.classList.toggle("success", type === "success");
}


function hideEditAlert() {

    const el = document.getElementById("edit-alert");

    el.hidden = true;
    el.textContent = "";
    el.classList.remove("success");
}
