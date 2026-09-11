from django.conf import settings
from django.core.mail import send_mail
from django.urls import reverse

from .tokens import generate_activation_token, generate_password_reset_token


def send_activation_email(user, request):
    """
    Send an account activation email to the newly registered user.
    """

    token = generate_activation_token(user)

    activation_path = reverse(
        "accounts:activate",
        kwargs={"token": token},
    )

    activation_url = request.build_absolute_uri(activation_path)

    subject = "Activate your Crowdfunding account"

    message = (
        f"Hello {user.first_name},\n\n"
        "Thank you for creating an account with Crowdfunding.\n\n"
        "Please activate your account using the link below:\n\n"
        f"{activation_url}\n\n"
        "This activation link will expire after 24 hours.\n\n"
        "If you did not create this account, you can safely ignore "
        "this email.\n\n"
        "Best regards,\n"
        "Crowdfunding Team"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset_email(user, request):
    """
    Send a password-reset email to the user.
    """

    token = generate_password_reset_token(user)

    reset_path = reverse(
        "accounts:reset-password",
        kwargs={
            "uid": user.pk,
            "token": token,
        },
    )

    reset_url = request.build_absolute_uri(reset_path)

    subject = "Reset your Crowdfunding password"

    message = (
        f"Hello {user.first_name},\n\n"
        "We received a request to reset your Crowdfunding password.\n\n"
        "Please use the link below to choose a new password:\n\n"
        f"{reset_url}\n\n"
        "For your security, this link can only be used with your "
        "account and will become invalid after the password is changed.\n\n"
        "If you did not request a password reset, you can safely ignore "
        "this email.\n\n"
        "Best regards,\n"
        "Crowdfunding Team"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )