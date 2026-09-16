"use strict";

/* =========================================================
   GLOBAL STATE
========================================================= */

let currentProject = null;
let currentImageIndex = 0;
let currentRatingValue = 0;

/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const projectId = new URLSearchParams(window.location.search).get("id");

  if (!projectId) {
    showNotFound();
    return;
  }

  /*
   * Image slider buttons
   */

  document.getElementById("slider-prev").addEventListener("click", () => {
    moveSlide(-1);
  });

  document.getElementById("slider-next").addEventListener("click", () => {
    moveSlide(1);
  });

  /*
   * Cancel project button
   */

  document
    .getElementById("cancel-project-button")
    .addEventListener("click", handleCancelClick);

  /*
   * Load project
   */

  loadProject(projectId);
});

/* =========================================================
   LOAD PROJECT
========================================================= */

async function loadProject(projectId) {
  try {
    showLoading();

    const project = await authApiRequest(`/projects/${projectId}/`);

    currentProject = project;

    renderProject(project);

    /*
     * Load all interaction data
     */

    await Promise.all([
      loadAverageRating(project.id),
      loadRatings(project.id),
      loadComments(project.id),
      loadSimilarProjects(project.id),
    ]);
  } catch (error) {
    console.error("Failed to load project:", error);

    showNotFound();
  }
}

/* =========================================================
   LOAD SIMILAR PROJECTS
========================================================= */

async function loadSimilarProjects(projectId) {
  try {
    const data = await authApiRequest(`/projects/${projectId}/similar/`);
    const container = document.getElementById("similar-projects-container");
    const grid = document.getElementById("similar-projects-grid");
    
    if (data && data.length > 0) {
        container.hidden = false;
        // Limit to 4 similar projects
        const projectsToShow = data.slice(0, 4);
        grid.innerHTML = projectsToShow.map(renderSimilarProjectCard).join("");
    } else {
        container.hidden = true;
    }
  } catch (error) {
    console.error("Failed to load similar projects:", error);
  }
}

function renderSimilarProjectCard(project) {
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
                    ${progressBarHtml(project.funding_progress)}
                </div>
            </a>
        </article>
    `;
}

/* =========================================================
   LOADING / ERROR
========================================================= */

function showLoading() {
  document.getElementById("detail-loading").hidden = false;

  document.getElementById("detail-error").hidden = true;

  document.getElementById("detail-content").hidden = true;
}

function showNotFound() {
  document.getElementById("detail-loading").hidden = true;

  document.getElementById("detail-error").hidden = false;

  document.getElementById("detail-content").hidden = true;
}

/* =========================================================
   RENDER PROJECT
========================================================= */

function renderProject(project) {
  document.getElementById("detail-loading").hidden = true;

  document.getElementById("detail-content").hidden = false;

  document.title = `${project.title} — CrowdFund`;

  /*
   * Category + status
   */

  const categoryName = project.category?.name || "Uncategorized";

  document.getElementById("detail-header").innerHTML = `

        <span class="tag-chip">
            ${escapeHtml(categoryName)}
        </span>

        ${statusBadgeHtml(project.status)}

    `;

  /*
   * Title
   */

  document.getElementById("detail-title").textContent = project.title;

  /*
   * Owner
   */

  const firstName = project.owner?.first_name || "";

  const lastName = project.owner?.last_name || "";

  const ownerName = `${firstName} ${lastName}`.trim();

  document.getElementById("detail-owner").textContent =
    `Created by ${ownerName || "Unknown user"}`;

  /*
   * Tags
   */

  document.getElementById("detail-tags").innerHTML = tagListHtml(
    project.tags || [],
  );

  /*
   * Details
   */

  document.getElementById("detail-body").textContent = project.details || "";

  /*
   * Slider
   */

  renderSlider(project.images || []);

  /*
   * Funding
   */

  renderFunding(project);

  /*
   * Owner actions
   */

  renderOwnerActions(project);

  /*
   * Comment form
   */

  renderCommentForm(project);

  /*
   * Rating area
   */

  renderRatingArea(project);
}

/* =========================================================
   IMAGE SLIDER
========================================================= */

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
  if (!images || images.length === 0) {
    return;
  }

  const mainEl = document.getElementById("image-slider-main");

  const dotsEl = document.getElementById("slider-dots");

  const image = images[currentImageIndex];

  mainEl.innerHTML = `

        <img
            src="${escapeHtml(image.image)}"
            alt="Project image ${currentImageIndex + 1}"
        >

    `;

  dotsEl.innerHTML = images
    .map((_, index) => {
      const activeClass = index === currentImageIndex ? " active" : "";

      return `

                <button
                    type="button"
                    class="image-slider-dot${activeClass}"
                    data-index="${index}"
                    aria-label="Go to image ${index + 1}"
                ></button>

            `;
    })
    .join("");

  dotsEl.querySelectorAll(".image-slider-dot").forEach((dot) => {
    dot.addEventListener("click", () => {
      currentImageIndex = Number(dot.dataset.index);

      renderSlide(images);
    });
  });
}

function moveSlide(direction) {
  if (
    !currentProject ||
    !currentProject.images ||
    currentProject.images.length === 0
  ) {
    return;
  }

  const total = currentProject.images.length;

  currentImageIndex = (currentImageIndex + direction + total) % total;

  renderSlide(currentProject.images);
}

/* =========================================================
   FUNDING
========================================================= */

function renderFunding(project) {
  document.getElementById("funding-raised").textContent =
    `${formatCurrency(project.total_donations)} raised`;

  document.getElementById("funding-target").textContent =
    `of ${formatCurrency(project.target_amount)} goal · ${project.funding_progress}% funded`;

  document.getElementById("funding-progress-bar").innerHTML = progressBarHtml(
    project.funding_progress,
  );

  document.getElementById("funding-start").textContent =
    `Starts ${formatDate(project.start_date)}`;

  document.getElementById("funding-end").textContent =
    `Ends ${formatDate(project.end_date)}`;

  const actionsEl = document.getElementById("funding-actions");

  /*
   * Campaign is running
   */

  if (project.status === "running" && !project.is_cancelled) {
    if (!getAccessToken()) {
      actionsEl.innerHTML = `

                <div class="login-required-box">

                    <p>
                        Login to support this project.
                    </p>

                    <a
                        href="login.html"
                        class="button button-coral button-full"
                    >
                        Login to Donate
                    </a>

                </div>

            `;

      return;
    }

    actionsEl.innerHTML = `

            <div class="donation-box">

                <div class="donation-title">
                    Support this project
                </div>

                <div class="donation-subtitle">
                    Enter the amount you want to donate.
                </div>


                <div class="donation-input-row">

                    <input
                        type="number"
                        id="donation-amount"
                        min="1"
                        step="0.01"
                        placeholder="Amount"
                        aria-label="Donation amount"
                    >

                    <button
                        type="button"
                        id="donate-button"
                        class="button button-coral"
                    >
                        Donate
                    </button>

                </div>


                <p
                    id="donation-message"
                    class="interaction-message"
                ></p>

            </div>

        `;

    document
      .getElementById("donate-button")
      .addEventListener("click", handleDonation);

    return;
  }

  /*
   * Campaign is not running
   */

  actionsEl.innerHTML = `

        <div class="campaign-not-running">

            Donations are not available for this campaign.

        </div>

    `;
}

/* =========================================================
   DONATION
========================================================= */

async function handleDonation() {

  if (!currentProject) {
    return;
  }

  const input =
    document.getElementById("donation-amount");

  const button =
    document.getElementById("donate-button");

  const message =
    document.getElementById("donation-message");

  if (!input || !button || !message) {
    return;
  }

  const amount =
    Number(input.value);

  message.textContent = "";
  message.className = "interaction-message";

  /*
   * Frontend validation
   */

  if (!Number.isFinite(amount) || amount < 1) {

    message.textContent =
      "Donation amount must be at least 1.";

    message.classList.add("error");

    return;
  }

  button.disabled = true;
  button.textContent = "Donating...";

  try {

    /*
     * Correct Donation endpoint
     *
     * /api/interactions/donations/
     */

    await authApiRequest(
      "/interactions/donations/",
      {
        method: "POST",

        body: JSON.stringify({
          project: currentProject.id,
          amount: amount.toFixed(2),
        }),
      }
    );

    message.textContent =
      "Donation successful. Thank you for supporting this project!";

    message.classList.add("success");

    input.value = "";

    /*
     * Reload project so:
     *
     * total_donations
     * funding_progress
     * status
     *
     * are updated from backend.
     */

    await loadProject(currentProject.id);

  } catch (error) {

    console.error(
      "Donation failed:",
      error
    );

    message.textContent =
      firstApiErrorMessage(
        error.data,
        "Unable to complete the donation."
      );

    message.classList.add("error");

    button.disabled = false;
    button.textContent = "Donate";
  }
}

/* =========================================================
   RATING
========================================================= */

function renderRatingArea(project) {
  const area = document.getElementById("rating-area");

  if (!getAccessToken()) {
    area.innerHTML = `

            <div class="login-required-box">

                <p>
                    Login to rate this project.
                </p>

                <a
                    href="login.html"
                    class="button button-outline button-small"
                >
                    Login
                </a>

            </div>

        `;

    return;
  }

  if (project.status !== "running" || project.is_cancelled) {
    area.innerHTML = `

            <p class="interaction-muted">
                Rating is available only while the campaign is running.
            </p>

        `;

    return;
  }

  area.innerHTML = `

        <div class="rating-form">

            <p class="rating-form-label">
                Your rating
            </p>


            <div
                id="rating-stars"
                class="rating-stars"
            >

                ${[1, 2, 3, 4, 5]
                  .map(
                    (value) => `

                    <button
                        type="button"
                        class="rating-star"
                        data-rating="${value}"
                        aria-label="Rate ${value} out of 5"
                    >
                        ★
                    </button>

                `,
                  )
                  .join("")}

            </div>


            <div
                id="rating-selected-text"
                class="rating-selected-text"
            >
                Select a rating from 1 to 5.
            </div>


            <button
                type="button"
                id="submit-rating-button"
                class="button button-outline button-small"
                disabled
            >
                Submit rating
            </button>


            <p
                id="rating-message"
                class="interaction-message"
            ></p>

        </div>

    `;

  /*
   * Existing rating
   */

  updateRatingStars(currentRatingValue);

  /*
   * Star click
   */

  document.querySelectorAll(".rating-star").forEach((star) => {
    star.addEventListener("click", () => {
      currentRatingValue = Number(star.dataset.rating);

      updateRatingStars(currentRatingValue);
    });
  });

  /*
   * Submit rating
   */

  document
    .getElementById("submit-rating-button")
    .addEventListener("click", handleRatingSubmit);
}

function updateRatingStars(value) {
  const stars = document.querySelectorAll(".rating-star");

  const selectedText = document.getElementById("rating-selected-text");

  const submitButton = document.getElementById("submit-rating-button");

  if (!stars.length) {
    return;
  }

  stars.forEach((star) => {
    const rating = Number(star.dataset.rating);

    star.classList.toggle("selected", rating <= value);
  });

  if (value > 0) {
    selectedText.textContent = `You selected ${value} out of 5.`;

    submitButton.disabled = false;
  } else {
    selectedText.textContent = "Select a rating from 1 to 5.";

    submitButton.disabled = true;
  }
}

/* =========================================================
   LOAD RATINGS
========================================================= */

async function loadRatings(projectId) {

  try {

    const data = await authApiRequest(
      `/interactions/projects/${projectId}/ratings/`
    );

    const ratings =
      normalizeListResponse(data);

    const currentUserId =
      getCurrentUserId();

    if (!currentUserId) {
      return;
    }

    const myRating =
      ratings.find((rating) => {
        return (
          Number(rating.user?.id) ===
          Number(currentUserId)
        );
      });

    if (myRating) {

      currentRatingValue =
        Number(myRating.value);

      renderRatingArea(currentProject);
    }

  } catch (error) {

    console.error(
      "Failed to load ratings:",
      error
    );
  }
}

/* =========================================================
   LOAD AVERAGE RATING
========================================================= */

async function loadAverageRating(projectId) {

  try {

    const data =
      await authApiRequest(
        `/interactions/projects/${projectId}/ratings/average/`
      );

    const average =
      Number(data.average_rating || 0);

    document.getElementById(
      "rating-average"
    ).textContent =
      `★ ${average.toFixed(2)}`;

  } catch (error) {

    console.error(
      "Failed to load average rating:",
      error
    );

    document.getElementById(
      "rating-average"
    ).textContent =
      "★ 0.00";
  }
}

/* =========================================================
   SUBMIT RATING
========================================================= */

async function handleRatingSubmit() {

  if (
    !currentProject ||
    currentRatingValue < 1 ||
    currentRatingValue > 5
  ) {
    return;
  }

  const button =
    document.getElementById(
      "submit-rating-button"
    );

  const message =
    document.getElementById(
      "rating-message"
    );

  if (!button || !message) {
    return;
  }

  button.disabled = true;
  button.textContent = "Saving...";

  message.textContent = "";
  message.className =
    "interaction-message";

  try {

    /*
     * Backend supports:
     *
     * 201 = new rating
     * 200 = update existing rating
     */

    await authApiRequest(
      `/interactions/projects/${currentProject.id}/ratings/`,
      {
        method: "POST",

        body: JSON.stringify({
          value: currentRatingValue,
        }),
      }
    );

    message.textContent =
      "Your rating has been saved.";

    message.classList.add("success");

    await loadAverageRating(
      currentProject.id
    );

  } catch (error) {

    console.error(
      "Rating failed:",
      error
    );

    message.textContent =
      firstApiErrorMessage(
        error.data,
        "Unable to save your rating."
      );

    message.classList.add("error");

  } finally {

    button.disabled = false;
    button.textContent =
      "Submit rating";
  }
}

/* =========================================================
   COMMENTS
========================================================= */

function renderCommentForm(project) {
  const area = document.getElementById("comment-form-area");

  if (!getAccessToken()) {
    area.innerHTML = `

            <div class="login-required-box">

                <p>
                    Login to leave a comment.
                </p>

                <a
                    href="login.html"
                    class="button button-outline button-small"
                >
                    Login
                </a>

            </div>

        `;

    return;
  }

  if (project.status !== "running" || project.is_cancelled) {
    area.innerHTML = `

            <p class="interaction-muted">
                Comments can only be added while the campaign is running.
            </p>

        `;

    return;
  }

  area.innerHTML = `

        <div class="comment-form">

            <div class="form-group">

                <label for="comment-content">
                    Add a comment
                </label>

                <textarea
                    id="comment-content"
                    placeholder="Write your comment..."
                    maxlength="2000"
                ></textarea>

            </div>


            <button
                type="button"
                id="add-comment-button"
                class="button button-coral button-small"
            >
                Add comment
            </button>


            <p
                id="comment-form-message"
                class="interaction-message"
            ></p>

        </div>

    `;

  document
    .getElementById("add-comment-button")
    .addEventListener("click", handleAddComment);
}

/* =========================================================
   LOAD COMMENTS
========================================================= */

async function loadComments(projectId) {

  const list =
    document.getElementById(
      "comments-list"
    );

  list.innerHTML = `
    <div class="comments-loading">
      Loading comments...
    </div>
  `;

  try {

    const data =
      await authApiRequest(
        `/interactions/projects/${projectId}/comments/`
      );

    const comments =
      normalizeListResponse(data);

    renderComments(comments);

  } catch (error) {

    console.error(
      "Failed to load comments:",
      error
    );

    list.innerHTML = `
      <div class="comments-empty">
        Unable to load comments right now.
      </div>
    `;
  }
}

/* =========================================================
   RENDER COMMENTS
========================================================= */

function renderComments(comments) {
  const list = document.getElementById("comments-list");

  if (!comments.length) {
    list.innerHTML = `
      <div class="comments-empty">
        No comments yet.
        Be the first one to comment!
      </div>
    `;

    return;
  }

  const currentUserId = getCurrentUserId();

  /*
   * Top-level comments
   */
  const topLevelComments = comments.filter(
    (comment) => !comment.parent
  );

  /*
   * Replies grouped by parent comment ID
   */
  const repliesByParent = {};

  comments
    .filter((comment) => comment.parent)
    .forEach((reply) => {
      const parentId = Number(
        typeof reply.parent === "object"
          ? reply.parent.id
          : reply.parent
      );

      if (!repliesByParent[parentId]) {
        repliesByParent[parentId] = [];
      }

      repliesByParent[parentId].push(reply);
    });

  /*
   * Render one comment
   */
  function commentHtml(comment, isReply = false) {
    const user = comment.user || {};

    const firstName = user.first_name || "";
    const lastName = user.last_name || "";

    const fullName =
      `${firstName} ${lastName}`.trim();

    const displayName =
      fullName || `User #${user.id || ""}`;

    const isMine =
      currentUserId &&
      Number(user.id) === Number(currentUserId);

    return `
      <article
        class="comment-item${isReply ? " comment-reply" : ""}"
        data-comment-id="${comment.id}"
      >

        <div class="comment-item-top">

          <div>

            <div class="comment-author">
              ${escapeHtml(displayName)}
            </div>

            <div class="comment-date">
              ${formatDateTime(comment.created_at)}
            </div>

          </div>

          <div class="comment-actions">

            ${
              isMine
                ? `
                  <button
                    type="button"
                    class="button-ghost button-small edit-comment-button"
                    data-comment-id="${comment.id}"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="button-ghost button-small delete-comment-button"
                    data-comment-id="${comment.id}"
                  >
                    Delete
                  </button>
                `
                : ""
            }

            ${
              !isReply
                ? `
                  <button
                    type="button"
                    class="button-ghost button-small reply-comment-button"
                    data-comment-id="${comment.id}"
                  >
                    Reply
                  </button>
                `
                : ""
            }

            <button
              type="button"
              class="button-ghost button-small report-comment-button"
              data-comment-id="${comment.id}"
            >
              Report
            </button>

          </div>

        </div>

        <p class="comment-content">
          ${escapeHtml(comment.content)}
        </p>

        ${
          !isReply && repliesByParent[comment.id]
            ? `
              <div class="comment-replies">
                ${repliesByParent[comment.id]
                  .map((reply) => commentHtml(reply, true))
                  .join("")}
              </div>
            `
            : ""
        }

      </article>
    `;
  }

  list.innerHTML = topLevelComments
    .map((comment) => commentHtml(comment))
    .join("");

  /*
   * Edit buttons
   */
  list
    .querySelectorAll(".edit-comment-button")
    .forEach((button) => {
      button.addEventListener("click", () =>
        editComment(button.dataset.commentId)
      );
    });

  /*
   * Delete buttons
   */
  list
    .querySelectorAll(".delete-comment-button")
    .forEach((button) => {
      button.addEventListener("click", () =>
        deleteComment(button.dataset.commentId)
      );
    });

  /*
   * Report buttons
   */
  list
    .querySelectorAll(".report-comment-button")
    .forEach((button) => {
      button.addEventListener("click", () =>
        reportComment(button.dataset.commentId)
      );
    });

  /*
   * Reply buttons
   */
  list
    .querySelectorAll(".reply-comment-button")
    .forEach((button) => {
      button.addEventListener("click", () =>
        showReplyForm(button.dataset.commentId)
      );
    });
}

function showReplyForm(commentId) {
  if (!getAccessToken()) {
    window.location.href = "login.html";
    return;
  }

  /*
   * Don't create multiple reply forms
   */
  document
    .querySelectorAll(".reply-form")
    .forEach((form) => form.remove());

  const commentElement = document.querySelector(
    `.comment-item[data-comment-id="${commentId}"]`
  );

  if (!commentElement) {
    return;
  }

  const form = document.createElement("div");

  form.className = "reply-form";

  form.innerHTML = `
    <textarea
      class="reply-content"
      placeholder="Write your reply..."
      maxlength="2000"
    ></textarea>

    <div class="reply-form-actions">

      <button
        type="button"
        class="button button-coral button-small submit-reply-button"
      >
        Reply
      </button>

      <button
        type="button"
        class="button-ghost button-small cancel-reply-button"
      >
        Cancel
      </button>

    </div>

    <p class="interaction-message reply-message"></p>
  `;

  commentElement.appendChild(form);

  form
    .querySelector(".submit-reply-button")
    .addEventListener("click", () =>
      handleAddReply(commentId, form)
    );

  form
    .querySelector(".cancel-reply-button")
    .addEventListener("click", () => {
      form.remove();
    });

  form
    .querySelector(".reply-content")
    .focus();
}

async function handleAddReply(commentId, form) {
  if (!currentProject) {
    return;
  }

  const textarea =
    form.querySelector(".reply-content");

  const button =
    form.querySelector(".submit-reply-button");

  const message =
    form.querySelector(".reply-message");

  if (!textarea || !button || !message) {
    return;
  }

  const content = textarea.value.trim();

  message.textContent = "";
  message.className = "interaction-message reply-message";

  if (!content) {
    message.textContent =
      "Please write a reply first.";

    message.classList.add("error");

    return;
  }

  button.disabled = true;
  button.textContent = "Replying...";

  try {
    await authApiRequest(
      `/interactions/projects/${currentProject.id}/comments/`,
      {
        method: "POST",

        body: JSON.stringify({
          project: currentProject.id,
          content: content,
          parent: Number(commentId),
        }),
      }
    );

    await loadComments(currentProject.id);

  } catch (error) {
    console.error(
      "Failed to add reply:",
      error
    );

    message.textContent =
      firstApiErrorMessage(
        error.data,
        "Unable to add your reply."
      );

    message.classList.add("error");

    button.disabled = false;
    button.textContent = "Reply";
  }
}


/* =========================================================
   ADD COMMENT
========================================================= */

async function handleAddComment() {

  if (!currentProject) {
    return;
  }

  const textarea =
    document.getElementById(
      "comment-content"
    );

  const button =
    document.getElementById(
      "add-comment-button"
    );

  const message =
    document.getElementById(
      "comment-form-message"
    );

  if (!textarea || !button || !message) {
    return;
  }

  const content =
    textarea.value.trim();

  message.textContent = "";
  message.className =
    "interaction-message";

  if (!content) {

    message.textContent =
      "Please write a comment first.";

    message.classList.add("error");

    return;
  }

  button.disabled = true;
  button.textContent = "Adding...";

  try {

    await authApiRequest(
      `/interactions/projects/${currentProject.id}/comments/`,
      {
        method: "POST",

        body: JSON.stringify({
          project: currentProject.id,
          content: content,
        }),
      }
    );

    textarea.value = "";

    message.textContent =
      "Comment added successfully.";

    message.classList.add("success");

    await loadComments(
      currentProject.id
    );

  } catch (error) {

    console.error(
      "Failed to add comment:",
      error
    );

    message.textContent =
      firstApiErrorMessage(
        error.data,
        "Unable to add your comment."
      );

    message.classList.add("error");

  } finally {

    button.disabled = false;
    button.textContent =
      "Add comment";
  }
}

/* =========================================================
   EDIT COMMENT
========================================================= */

async function editComment(commentId) {

  const commentElement =
    document.querySelector(
      `.comment-item[data-comment-id="${commentId}"]`
    );

  if (!commentElement) {
    return;
  }

  const contentElement =
    commentElement.querySelector(
      ".comment-content"
    );

  if (!contentElement) {
    return;
  }

  const oldContent =
    contentElement.textContent.trim();

  const newContent =
    window.prompt(
      "Edit your comment:",
      oldContent
    );

  if (newContent === null) {
    return;
  }

  const cleanedContent =
    newContent.trim();

  if (!cleanedContent) {

    window.alert(
      "Comment cannot be empty."
    );

    return;
  }

  try {

    await authApiRequest(
      `/interactions/comments/${commentId}/`,
      {
        method: "PATCH",

        body: JSON.stringify({
          content: cleanedContent,
        }),
      }
    );

    await loadComments(
      currentProject.id
    );

  } catch (error) {

    console.error(
      "Failed to edit comment:",
      error
    );

    window.alert(
      firstApiErrorMessage(
        error.data,
        "Unable to edit this comment."
      )
    );
  }
}

/* =========================================================
   DELETE COMMENT
========================================================= */

async function deleteComment(commentId) {

  const confirmed =
    window.confirm(
      "Are you sure you want to delete this comment?"
    );

  if (!confirmed) {
    return;
  }

  try {

    await authApiRequest(
      `/interactions/comments/${commentId}/`,
      {
        method: "DELETE",
      }
    );

    await loadComments(
      currentProject.id
    );

  } catch (error) {

    console.error(
      "Failed to delete comment:",
      error
    );

    window.alert(
      firstApiErrorMessage(
        error.data,
        "Unable to delete this comment."
      )
    );
  }
}

/* =========================================================
   REPORT PROJECT
========================================================= */

function renderProjectReport() {
  const area = document.getElementById("project-report-area");

  if (!getAccessToken()) {
    area.innerHTML = `

            <div class="login-required-box">

                <p>
                    Login to report this project.
                </p>

                <a
                    href="login.html"
                    class="button button-outline button-small"
                >
                    Login
                </a>

            </div>

        `;

    return;
  }

  area.innerHTML = `

        <div class="report-form">

            <div class="form-group">

                <label for="project-report-reason">
                    Reason
                </label>

                <textarea
                    id="project-report-reason"
                    placeholder="Explain why you are reporting this project..."
                    maxlength="2000"
                ></textarea>

            </div>


            <button
                type="button"
                id="report-project-button"
                class="button-danger button-small"
            >
                Submit report
            </button>


            <p
                id="project-report-message"
                class="interaction-message"
            ></p>

        </div>

    `;

  document
    .getElementById("report-project-button")
    .addEventListener("click", handleReportProject);
}

/* =========================================================
   REPORT PROJECT SUBMIT
========================================================= */

async function handleReportProject() {

  if (!currentProject) {
    return;
  }

  const textarea =
    document.getElementById(
      "project-report-reason"
    );

  const button =
    document.getElementById(
      "report-project-button"
    );

  const message =
    document.getElementById(
      "project-report-message"
    );

  if (!textarea || !button || !message) {
    return;
  }

  const reason =
    textarea.value.trim();

  message.textContent = "";
  message.className =
    "interaction-message";

  if (!reason) {

    message.textContent =
      "Please provide a reason for the report.";

    message.classList.add("error");

    return;
  }

  button.disabled = true;
  button.textContent = "Submitting...";

  try {

    await authApiRequest(
      "/interactions/reports/",
      {
        method: "POST",

        body: JSON.stringify({
          project: currentProject.id,
          reason: reason,
          report_type: "project",
        }),
      }
    );

    textarea.value = "";

    message.textContent =
      "Project report submitted successfully.";

    message.classList.add("success");

  } catch (error) {

    console.error(
      "Failed to report project:",
      error
    );

    message.textContent =
      firstApiErrorMessage(
        error.data,
        "Unable to submit this report."
      );

    message.classList.add("error");

  } finally {

    button.disabled = false;
    button.textContent =
      "Submit report";
  }
}
/* =========================================================
   REPORT COMMENT
========================================================= */

async function reportComment(commentId) {
    if (!getAccessToken()) {
        window.location.href = "login.html";
        return;
    }

    document
        .querySelectorAll(".comment-report-form")
        .forEach((form) => form.remove());

    const commentElement = document.querySelector(
        `.comment-item[data-comment-id="${commentId}"]`
    );

    if (!commentElement) {
        return;
    }

    const form = document.createElement("div");
    form.className = "comment-report-form";

    form.innerHTML = `
        <div class="form-group">
            <label for="comment-report-reason-${commentId}">
                Report reason
            </label>

            <textarea
                id="comment-report-reason-${commentId}"
                class="comment-report-reason"
                placeholder="Explain why you are reporting this comment..."
                maxlength="2000"
            ></textarea>
        </div>

        <div class="comment-report-actions">
            <button
                type="button"
                class="button button-coral button-small submit-comment-report-button"
            >
                Submit report
            </button>

            <button
                type="button"
                class="button-ghost button-small cancel-comment-report-button"
            >
                Cancel
            </button>
        </div>

        <p class="interaction-message comment-report-message"></p>
    `;

    commentElement.appendChild(form);

    const textarea = form.querySelector(
        ".comment-report-reason"
    );

    const submitButton = form.querySelector(
        ".submit-comment-report-button"
    );

    const cancelButton = form.querySelector(
        ".cancel-comment-report-button"
    );

    const message = form.querySelector(
        ".comment-report-message"
    );

    cancelButton.addEventListener("click", () => {
        form.remove();
    });

    submitButton.addEventListener("click", async () => {
        const reason = textarea.value.trim();

        message.textContent = "";
        message.className =
            "interaction-message comment-report-message";

        if (!reason) {
            message.textContent =
                "Please provide a reason for the report.";
            message.classList.add("error");
            textarea.focus();
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = "Submitting...";

        try {
            await authApiRequest(
                "/interactions/reports/",
                {
                    method: "POST",
                    body: JSON.stringify({
                        comment: Number(commentId),
                        reason: reason,
                        report_type: "comment"
                    })
                }
            );

            message.textContent =
                "Comment report submitted successfully.";
            message.classList.add("success");

            textarea.value = "";

            setTimeout(() => {
                form.remove();
            }, 1200);

        } catch (error) {
            console.error(
                "Failed to report comment:",
                error
            );

            message.textContent =
                firstApiErrorMessage(
                    error.data,
                    "Unable to submit this report."
                );

            message.classList.add("error");

            submitButton.disabled = false;
            submitButton.textContent = "Submit report";
        }
    });

    textarea.focus();
}
/* =========================================================
   OWNER ACTIONS
========================================================= */

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

/* =========================================================
   CANCEL PROJECT
========================================================= */

async function handleCancelClick() {
  if (!currentProject) {
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to cancel this project? This cannot be undone.",
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
      firstApiErrorMessage(
        error.data,
        "Unable to cancel this project right now.",
      );
  } finally {
    button.disabled = false;

    button.textContent = "Cancel project";
  }
}

/* =========================================================
   HELPERS
========================================================= */

/*
 * DRF may return:
 *
 * [
 *   {...},
 *   {...}
 * ]
 *
 * OR:
 *
 * {
 *   count: 10,
 *   next: "...",
 *   previous: null,
 *   results: [...]
 * }
 */

function normalizeListResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}

/*
 * Get current logged-in user ID
 *
 * SimpleJWT normally stores it as:
 * user_id
 */

function getCurrentUserId() {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    while (payload.length % 4 !== 0) {
      payload += "=";
    }

    const decoded = JSON.parse(atob(payload));

    return decoded.user_id ?? decoded.sub ?? null;
  } catch (error) {
    console.error("Unable to decode access token:", error);

    return null;
  }
}

/*
 * Format date + time for comments
 */

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   INITIALIZE REPORT SECTION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  renderProjectReport();
});
