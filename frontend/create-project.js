"use strict";


let createdProjectId = null;


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

    setCreateLoading(true);

    try {
        const project = await authApiRequest("/projects/", {
            method: "POST",
            body: JSON.stringify(values),
        });

        createdProjectId = project.id;

        document.getElementById("details-card").hidden = true;
        document.getElementById("images-card").hidden = false;

        document.getElementById("finish-button").href =
            `project-details.html?id=${createdProjectId}`;

        window.scrollTo({ top: 0, behavior: "smooth" });

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

    } finally {
        setCreateLoading(false);
    }
}


async function handleImageSelected(event) {

    const files = Array.from(event.target.files || []);

    if (files.length === 0 || !createdProjectId) {
        return;
    }

    for (const file of files) {
        await uploadProjectImage(file);
    }

    event.target.value = "";
}


async function uploadProjectImage(file) {

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
            `/projects/${createdProjectId}/images/`,
            formData
        );

        placeholder.innerHTML = `
            <img src="${image.image}" alt="Project image">
            <button type="button" class="image-upload-remove" data-image-id="${image.id}">&times;</button>
        `;

        placeholder.querySelector(".image-upload-remove")
            .addEventListener("click", () => removeUploadedImage(image.id, placeholder));

    } catch (error) {
        console.error("Failed to upload image:", error);
        placeholder.remove();

        showAlertOn(
            "create-alert",
            firstApiErrorMessage(error.data, "One of your images could not be uploaded."),
            "error"
        );
    }
}


async function removeUploadedImage(imageId, element) {

    try {
        await authApiRequest(`/projects/${createdProjectId}/images/${imageId}/`, {
            method: "DELETE",
        });

        element.remove();

    } catch (error) {
        console.error("Failed to remove image:", error);
    }
}


function setCreateLoading(isLoading) {

    const button = document.getElementById("create-button");
    const buttonText = document.getElementById("create-button-text");

    button.disabled = isLoading;
    buttonText.textContent = isLoading ? "Creating project..." : "Create project";
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
