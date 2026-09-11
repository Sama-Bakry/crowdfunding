from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import signing


ACTIVATION_TOKEN_MAX_AGE = 60 * 60 * 24  # 24 hours


def generate_activation_token(user):
    """
    Generate a signed activation token for the given user.

    The token contains only the user's ID and is cryptographically
    signed using Django's SECRET_KEY.
    """

    return signing.dumps(
        {
            "user_id": user.pk,
        },
        salt="accounts-email-activation",
    )


def verify_activation_token(token):
    """
    Verify and decode an activation token.

    Returns the user ID if the token is valid and has not expired.
    Returns None for invalid or expired tokens.
    """

    try:
        data = signing.loads(
            token,
            salt="accounts-email-activation",
            max_age=ACTIVATION_TOKEN_MAX_AGE,
        )
    except signing.BadSignature:
        return None

    return data.get("user_id")


password_reset_token_generator = PasswordResetTokenGenerator()


def generate_password_reset_token(user):
    """
    Generate a secure password-reset token for the given user.
    """

    return password_reset_token_generator.make_token(user)


def verify_password_reset_token(user, token):
    """
    Verify a password-reset token.

    Returns True if the token is valid, otherwise False.
    """

    return password_reset_token_generator.check_token(
        user,
        token,
    )