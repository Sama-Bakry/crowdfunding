"use strict";

document.addEventListener("DOMContentLoaded", () => {
    loadHomeData();

    const searchForm =
        document.getElementById("hero-search-form");

    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const input =
                document.getElementById("hero-search-input");

            const query =
                input ? input.value.trim() : "";

            if (query) {
                window.location.href =
                    `projects.html?search=${encodeURIComponent(query)}`;
            } else {
                window.location.href =
                    "projects.html";
            }
        });
    }
});


async function loadHomeData() {
    try {
        const data =
            await apiRequest("/projects/home/");

        renderGrid(
            "highest-rated-grid",
            data.highest_rated,
            "highest"
        );

        renderGrid(
            "latest-projects-grid",
            data.latest,
            "latest"
        );

        renderGrid(
            "featured-projects-grid",
            data.featured,
            "featured"
        );

        renderCategories(
            "categories-grid",
            data.categories
        );

    } catch (error) {
        console.error(
            "Failed to load home data:",
            error
        );
    }
}


function renderGrid(
    containerId,
    projects,
    type
) {
    const container =
        document.getElementById(containerId);

    if (!container) {
        return;
    }

    if (!projects || projects.length === 0) {

        const message =
            type === "featured"
                ? "No featured projects yet."
                : "No projects found.";

        container.innerHTML = `
            <p class="empty-state">
                ${message}
            </p>
        `;

        return;
    }

    container.innerHTML =
        projects
            .map(project =>
                renderProjectCard(
                    project,
                    type
                )
            )
            .join("");
}


function renderCategories(
    containerId,
    categories
) {
    const container =
        document.getElementById(containerId);

    if (!container) {
        return;
    }

    if (!categories || categories.length === 0) {
        container.innerHTML = `
            <p class="empty-state">
                No categories found.
            </p>
        `;

        return;
    }

    container.innerHTML =
        categories
            .map(category =>
                renderCategoryCard(category)
            )
            .join("");
}


function renderProjectCard(
    project,
    type
) {
    const title =
        escapeHtml(
            project.title || "Untitled Project"
        );

    const categoryName =
        project.category
            ? project.category.name
            : "Uncategorized";

    const category =
        escapeHtml(categoryName);

    const details =
        project.details
            ? escapeHtml(
                project.details
                    .replace(/\s+/g, " ")
                    .trim()
              )
            : "Support this project and help make a difference.";

    const rating =
        project.average_rating !== null &&
        project.average_rating !== undefined
            ? Number(
                project.average_rating
              ).toFixed(1)
            : "0.0";

    const funding =
        Number(
            project.funding_progress || 0
        );

    const safeFunding =
        Math.min(
            Math.max(funding, 0),
            100
        );

    const target =
        formatCurrency(
            project.target_amount
        );

    const imageHtml =
        project.cover_image
            ? `
                <img
                    src="${project.cover_image}"
                    alt="${title}"
                    loading="lazy"
                >
            `
            : `
                <div
                    class="project-image-placeholder"
                    aria-label="${category}"
                >
                    <span>
                        ${category}
                    </span>
                </div>
            `;

    const featuredBadge =
        type === "featured"
            ? `
                <span class="featured-badge">
                    Featured
                </span>
            `
            : "";

    return `
        <article
            class="project-card homepage-project-card homepage-card-${type}"
        >

            <a
                href="project-details.html?id=${project.id}"
                class="project-card-link"
            >

                <div class="project-card-image">
                    ${imageHtml}
                </div>

                <div class="project-card-content">

                    <div class="project-card-top">

                        <span class="project-category">
                            ${category}
                        </span>

                        ${featuredBadge}

                    </div>

                    <div class="project-card-title-row">

                        <h3>
                            ${title}
                        </h3>

                        <span class="project-rating">
                            <span class="rating-star">★</span>
                            ${rating}
                        </span>

                    </div>

                    <p class="project-description">
                        ${details}
                    </p>

                    <div class="project-progress">

                        <div
                            class="project-progress-bar"
                            style="width: ${safeFunding}%"
                        ></div>

                    </div>

                    <div class="project-card-bottom">

                        <span class="funding-text">
                            ${funding.toFixed(2)}% funded
                        </span>

                        <span class="target-text">
                            ${target}
                        </span>

                    </div>

                </div>

            </a>

        </article>
    `;
}


function renderCategoryCard(category) {
    const name =
        escapeHtml(
            category.name || "Category"
        );

    const icon =
        getCategoryIcon(
            category.name
        );

    return `
        <a
            class="category-card homepage-category-card"
            href="projects.html?category=${category.id}"
        >

            <span class="category-icon">
                ${icon}
            </span>

            <span class="category-name">
                ${name}
            </span>

        </a>
    `;
}


function getCategoryIcon(name) {
    const normalized =
        String(name || "")
            .trim()
            .toLowerCase();

    const icons = {
        charity: "♥",
        community: "♟",
        education: "🎓",
        environment: "♧",
        healthcare: "✚",
        technology: "▣"
    };

    return icons[normalized] || "•";
}