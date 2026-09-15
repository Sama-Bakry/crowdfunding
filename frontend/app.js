"use strict";


const API_BASE_URL =
    "http://127.0.0.1:8000/api";


document.addEventListener(
    "DOMContentLoaded",
    () => {

        initializeNavigation();

        initializeScrollEffects();

        initializeProjectInteractions();

        initializeAuthNavigation();

    }
);


/* =========================
   Landing page navigation
   ========================= */

function initializeNavigation() {

    const navigationLinks =
        document.querySelectorAll(
            '.main-nav a[href^="#"]'
        );


    navigationLinks.forEach(
        (link) => {

            link.addEventListener(
                "click",
                (event) => {

                    const targetId =
                        link.getAttribute(
                            "href"
                        );


                    if (
                        !targetId ||
                        targetId === "#"
                    ) {
                        return;
                    }


                    const targetElement =
                        document.querySelector(
                            targetId
                        );


                    if (!targetElement) {
                        return;
                    }


                    event.preventDefault();


                    targetElement.scrollIntoView(
                        {
                            behavior:
                                "smooth",

                            block:
                                "start",
                        }
                    );

                }
            );

        }
    );
}


/* =========================
   Header scroll effect
   ========================= */

function initializeScrollEffects() {

    const header =
        document.querySelector(
            ".site-header"
        );


    if (!header) {
        return;
    }


    const updateHeader =
        () => {

            if (
                window.scrollY > 20
            ) {

                header.classList.add(
                    "header-scrolled"
                );

            } else {

                header.classList.remove(
                    "header-scrolled"
                );

            }

        };


    updateHeader();


    window.addEventListener(
        "scroll",
        updateHeader,
        {
            passive: true,
        }
    );
}


/* =========================
   Project interactions
   ========================= */

function initializeProjectInteractions() {

    const projectCards =
        document.querySelectorAll(
            ".project-card"
        );


    projectCards.forEach(
        (card) => {

            card.addEventListener(
                "click",
                () => {

                    const titleElement =
                        card.querySelector(
                            "h3"
                        );


                    if (
                        !titleElement
                    ) {
                        return;
                    }


                    const title =
                        titleElement
                            .textContent
                            .trim();


                    console.log(
                        `Project selected: ${title}`
                    );

                }
            );

        }
    );
}


/* =========================
   Authentication navigation
   ========================= */

function initializeAuthNavigation() {

    const navActions =
        document.getElementById(
            "nav-actions"
        );


    if (!navActions) {
        return;
    }


    const accessToken =
        localStorage.getItem(
            "access_token"
        );


    if (!accessToken) {

        showLoggedOutNavigation(
            navActions
        );

        return;
    }


    showLoggedInNavigation(
        navActions
    );
}


/* =========================
   Logged out navigation
   ========================= */

function showLoggedOutNavigation(
    navActions
) {

    navActions.innerHTML = `
        <a
            href="login.html"
            class="nav-login"
        >
            Sign in
        </a>

        <a
            href="register.html"
            class="button button-dark"
        >
            Join CrowdFund
        </a>
    `;
}


/* =========================
   Logged in navigation
   ========================= */

function showLoggedInNavigation(
    navActions
) {

    const email =
        localStorage.getItem(
            "auth_user_email"
        );


    navActions.innerHTML = `
        <span class="nav-question">
            ${escapeHtml(
                email || "Welcome back"
            )}
        </span>

        

        <a
            href="create-project.html"
            class="button button-outline"
        >
            Start a project
        </a>

        <a
            href="profile.html"
            class="button button-outline"
        >
            My profile
        </a>

        <button
            type="button"
            class="button button-dark"
            id="nav-logout-button"
        >
            Sign out
        </button>
    `;


    const logoutButton =
        document.getElementById(
            "nav-logout-button"
        );


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        handleNavigationLogout
    );
}



/* =========================
   Logout
   ========================= */

async function handleNavigationLogout() {

    const logoutButton =
        document.getElementById(
            "nav-logout-button"
        );


    const accessToken =
        localStorage.getItem(
            "access_token"
        );


    const refreshToken =
        localStorage.getItem(
            "refresh_token"
        );


    if (logoutButton) {

        logoutButton.disabled =
            true;

        logoutButton.textContent =
            "Signing out...";

    }


    try {

        if (
            accessToken &&
            refreshToken
        ) {

            await fetch(
                `${API_BASE_URL}/accounts/logout/`,
                {
                    method: "POST",

                    headers: {
                        Accept:
                            "application/json",

                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${accessToken}`,
                    },

                    body:
                        JSON.stringify(
                            {
                                refresh:
                                    refreshToken,
                            }
                        ),
                }
            );

        }

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        localStorage.removeItem(
            "access_token"
        );

        localStorage.removeItem(
            "refresh_token"
        );

        localStorage.removeItem(
            "auth_user_email"
        );


        window.location.href =
            "index.html";
    }
}


/* =========================
   Generic API request
   ========================= */

async function apiRequest(endpoint, options = {}) {

    const headers = new Headers(options.headers || {});

    headers.set("Accept", "application/json");

    /*
     * Add Content-Type only when the request
     * has a body and the body is not FormData.
     */
    if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers.has("Content-Type")
    ) {
        headers.set(
            "Content-Type",
            "application/json"
        );
    }

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,
            headers,
        }
    );

    let data = null;

    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {

        const error = new Error(
            "API request failed."
        );

        error.status = response.status;
        error.data = data;

        throw error;
    }

    return data;
}
/* =========================
   Auth helpers
   ========================= */

function saveAccessToken(
    token
) {

    localStorage.setItem(
        "access_token",
        token
    );
}


function saveRefreshToken(
    token
) {

    localStorage.setItem(
        "refresh_token",
        token
    );
}


function getAccessToken() {

    return localStorage.getItem(
        "access_token"
    );
}


function getRefreshToken() {

    return localStorage.getItem(
        "refresh_token"
    );
}


function clearAuthTokens() {

    localStorage.removeItem(
        "access_token"
    );

    localStorage.removeItem(
        "refresh_token"
    );

    localStorage.removeItem(
        "auth_user_email"
    );
}


/* =========================
   Register helper
   ========================= */

async function registerUser(
    userData
) {

    return apiRequest(
        "/accounts/register/",
        {
            method: "POST",

            body:
                JSON.stringify(
                    userData
                ),
        }
    );
}


/* =========================
   Login helper
   ========================= */

async function loginUser(
    email,
    password
) {

    const data =
        await apiRequest(
            "/accounts/login/",
            {
                method: "POST",

                body:
                    JSON.stringify(
                        {
                            email,
                            password,
                        }
                    ),
            }
        );


    saveAccessToken(
        data.access
    );


    saveRefreshToken(
        data.refresh
    );


    localStorage.setItem(
        "auth_user_email",
        email
    );


    return data;
}


/* =========================
   Logout helper
   ========================= */

async function logoutUser() {

    const accessToken =
        getAccessToken();


    const refreshToken =
        getRefreshToken();


    if (
        !accessToken ||
        !refreshToken
    ) {

        clearAuthTokens();

        return;

    }


    try {

        await apiRequest(
            "/accounts/logout/",
            {
                method: "POST",

                headers: {
                    Authorization:
                        `Bearer ${accessToken}`,
                },

                body:
                    JSON.stringify(
                        {
                            refresh:
                                refreshToken,
                        }
                    ),
            }
        );

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    } finally {

        clearAuthTokens();

    }
}


/* =========================
   Forgot password helper
   ========================= */

async function requestPasswordReset(
    email
) {

    return apiRequest(
        "/accounts/forgot-password/",
        {
            method: "POST",

            body:
                JSON.stringify(
                    {
                        email,
                    }
                ),
        }
    );
}


/* =========================
   Reset password helper
   ========================= */

async function resetPassword(
    uid,
    token,
    newPassword,
    confirmPassword
) {

    return apiRequest(
        `/accounts/reset-password/${uid}/${token}/`,
        {
            method: "POST",

            body:
                JSON.stringify(
                    {
                        new_password:
                            newPassword,

                        confirm_password:
                            confirmPassword,
                    }
                ),
        }
    );
}


/* =========================
   HTML escaping
   ========================= */

function escapeHtml(
    value
) {

    return String(value)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}