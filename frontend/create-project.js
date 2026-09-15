"use strict";

let selectedImages = [];
let nextLocalImageId = 1;

document.addEventListener("DOMContentLoaded", () => {
    if (!requireAuthOrRedirect()) {
        return;
    }
    loadCategoryOptions();
    setMinimumStartDate();
    document.getElementById("create-project-form")
        .addEventListener("submit", handleCreateSubmit);
    document.getElementById("start_date")
        .addEventListener("change", () => {
            document.getElementById("end_date").min =
                document.getElementById("start_date").value;
        });
    document.getElementById("image-input")
        .addEventListener("change", handleImageSelected);
});

async function loadCategoryOptions() {
    try {
        const categories = await fetchCategories();
        populateCategorySelect(document.getElementById("category"), categories);
    } catch (error) {
        console.error("Failed to load categories:", error);
    }
}

function setMinimumStartDate() {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("start_date").min = today;
    document.getElementById("end_date").min = today;
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

function validateFormValues(values) {
    const errors = {};
    if (!values.title) {
        errors.title = "Title is required.";
    }
    if (!values.details) {
        errors.details = "Project details are required.";
    }
    if (!values.category) {
        errors.category = "Please select a category.";
    }
    if (!values.target_amount || Number(values.target_amount) <= 0) {
        errors.target_amount = "Target amount must be greater than zero.";
    }
    if (!values.start_date) {
        errors.start_date = "Start date is required.";
    }
    if (!values.end_date) {
        errors.end_date = "End date is required.";
    } else if (values.start_date && values.end_date <= values.start_date) {
        errors.end_date = "End date must be after the start date.";
    }
    return errors;
}

/* =========================
   Image selection (local, pre-upload)
   ========================= */

function handleImageSelected(event) {
    const files = Array.from(event.target.files || []);
    files.forEach(addLocalImage);
    event.target.value = "";
}

function addLocalImage(file) {
    const localId = nextLocalImageId++;
    const previewUrl = URL.createObjectURL(file);

    selectedImages.push({ localId, file, previewUrl });

    const grid = document.getElementById("image-upload-grid");
    const addButton = grid.querySelector(".image-upload-add");

    const item = document.createElement("div");
    item.className = "image-upload-item";
    item.dataset.localId = String(localId);
    item.innerHTML = `
        <img src="${previewUrl}" alt="Selected image">
        <button type="button" class="image-upload-remove" data-local-id="${localId}">&times;</button>
    `;
    grid.insertBefore(item, addButton);

    item.querySelector(".image-upload-remove")
        .addEventListener("click", () => removeLocalImage(localId, item));
}

function removeLocalImage(localId, element) {
    const index = selectedImages.findIndex((img) => img.localId === localId);
    if (index !== -1) {
        URL.revokeObjectURL(selectedImages[index].previewUrl);
        selectedImages.splice(index, 1);
    }
    element.remove();
}

/* =========================
   Submit: create project, then upload images
   ========================= */

async function handleCreateSubmit(event) {
    event.preventDefault();
    const form = document.getElementById("create-project-form");
    clearFieldErrors(form);
    hideAlert("create-alert");

    const values = collectFormValues();
    const errors = validateFormValues(values);

    if (Object.keys(errors).length > 0) {
        Object.entries(errors).forEach(([field, message]) => {
            const errorEl = document.getElementById(`${field}-error`);
            const inputEl = document.getElementById(field);
            if (errorEl) errorEl.textContent = message;
            if (inputEl) inputEl.classList.add("is-invalid");
        });
        return;
    }

    setCreateLoading(true, "Creating project...");

    let project;
    try {
        project = await authApiRequest("/projects/", {
            method: "POST",
            body: JSON.stringify(values),
        });
    } catch (error) {
        console.error("Failed to create project:", error);
        applyFieldErrors(error.data, {
            title: "title",
            details: "details",
            category: "category",
            target_amount: "target_amount",
            start_date: "start_date",
            end_date: "end_date",
        });
        showAlertOn(
            "create-alert",
            firstApiErrorMessage(error.data, "Unable to create the project. Please review your information and try again."),
            "error"
        );
        setCreateLoading(false);
        return;
    }

    if (selectedImages.length > 0) {
        setCreateLoading(true, "Uploading images...");
        const failedUploads = await uploadAllSelectedImages(project.id);

        if (failedUploads > 0) {
            showAlertOn(
                "create-alert",
                `Project created, but ${failedUploads} image(s) failed to upload. You can add them from the edit page.`,
                "error"
            );
            setCreateLoading(false);
            setTimeout(() => {
                window.location.href = `project-details.html?id=${project.id}`;
            }, 1800);
            return;
        }
    }

    window.location.href = `project-details.html?id=${project.id}`;
}

async function uploadAllSelectedImages(projectId) {
    let failedCount = 0;

    for (const image of selectedImages) {
        try {
            const formData = new FormData();
            formData.append("image", image.file);
            await authMultipartRequest(`/projects/${projectId}/images/`, formData);
        } catch (error) {
            console.error("Failed to upload image:", error);
            failedCount += 1;
        }
    }

    return failedCount;
}

function setCreateLoading(isLoading, loadingText = "Creating project...") {
    const button = document.getElementById("create-button");
    const buttonText = document.getElementById("create-button-text");
    button.disabled = isLoading;
    buttonText.textContent = isLoading ? loadingText : "Create project";
}

function showAlertOn(elementId, message, type = "error") {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.classList.toggle("success", type === "success");
}

function hideAlert(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.hidden = true;
    el.textContent = "";
    el.classList.remove("success");
}