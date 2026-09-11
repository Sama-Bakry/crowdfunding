"use strict";

const ACTIVATE_API_BASE_URL =
    "http://127.0.0.1:8000/api/accounts/activate/";


document.addEventListener(
    "DOMContentLoaded",
    handleActivation
);


async function handleActivation() {
    const activationState =
        document.getElementById("activation-state");

    const activationTitle =
        document.getElementById("activation-title");

    const activationMessage =
        document.getElementById("activation-message");

    const activationActions =
        document.getElementById("activation-actions");


    if (
        !activationState ||
        !activationTitle ||
        !activationMessage ||
        !activationActions
    ) {
        return;
    }


    let token =
        window.location.hash.substring(1);


    if (!token) {
        const params =
            new URLSearchParams(
                window.location.search
            );

        token =
            params.get("token") || "";
    }


    token =
        decodeURIComponent(token).trim();


    if (!token) {
        showActivationError(
            activationState,
            activationTitle,
            activationMessage,
            activationActions,
            "No activation token was found. Please open the activation link from your email again."
        );

        return;
    }


    setLoadingState(
        activationState,
        activationTitle,
        activationMessage,
        activationActions
    );


    try {

        const response =
            await fetch(
                `${ACTIVATE_API_BASE_URL}${encodeURIComponent(token)}/`,
                {
                    method: "GET",

                    headers: {
                        Accept:
                            "application/json",
                    },
                }
            );


        let data = null;


        try {
            data =
                await response.json();
        } catch {
            data = null;
        }


        if (!response.ok) {

            const message =
                data &&
                data.detail
                    ? Array.isArray(data.detail)
                        ? data.detail[0]
                        : data.detail
                    : "This activation link is invalid or has expired.";


            showActivationError(
                activationState,
                activationTitle,
                activationMessage,
                activationActions,
                message
            );

            return;
        }


        showActivationSuccess(
            activationState,
            activationTitle,
            activationMessage,
            activationActions,
            data &&
            data.detail
                ? data.detail
                : "Your account has been activated successfully."
        );

    } catch (error) {

        console.error(
            "Activation error:",
            error
        );


        showActivationError(
            activationState,
            activationTitle,
            activationMessage,
            activationActions,
            "Unable to connect to the server. Please make sure the Django server is running and try again."
        );

    }
}


function setLoadingState(
    state,
    title,
    message,
    actions
) {

    state.classList.remove(
        "activation-success",
        "activation-error"
    );


    title.textContent =
        "Activating your account...";


    message.textContent =
        "Please wait while we verify your activation link.";


    actions.innerHTML = "";

}


function showActivationSuccess(
    state,
    title,
    message,
    actions,
    detail
) {

    state.classList.remove(
        "activation-error"
    );


    state.classList.add(
        "activation-success"
    );


    title.textContent =
        "Account activated successfully";


    message.textContent =
        detail;


    actions.innerHTML = `
        <a
            href="login.html"
            class="button button-coral"
        >
            Continue to login
        </a>
    `;

}


function showActivationError(
    state,
    title,
    message,
    actions,
    detail
) {

    state.classList.remove(
        "activation-success"
    );


    state.classList.add(
        "activation-error"
    );


    title.textContent =
        "Activation failed";


    message.textContent =
        detail;


    actions.innerHTML = `
        <a
            href="register.html"
            class="button button-dark"
        >
            Create a new account
        </a>

        <a
            href="login.html"
            class="button button-outline"
        >
            Back to login
        </a>
    `;

}