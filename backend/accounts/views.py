from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import User
from .serializers import (
    ForgotPasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
)
from .services import (
    send_activation_email,
    send_password_reset_email,
)
from .tokens import (
    verify_activation_token,
    verify_password_reset_token,
)


class RegisterView(generics.CreateAPIView):
    """
    API endpoint for creating a new user account.

    After successful registration, an activation email is sent
    to the user's email address.
    """

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        """
        Create the user and send the activation email.
        """

        user = serializer.save()

        send_activation_email(
            user=user,
            request=self.request,
        )


class LoginView(generics.GenericAPIView):
    """
    API endpoint for authenticating a user using email and password.

    Returns access and refresh JWT tokens after successful authentication.
    """

    serializer_class = LoginSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """
        Authenticate the user and return JWT tokens.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(
            {
                "detail": "Login successful.",
                "access": serializer.validated_data["access"],
                "refresh": serializer.validated_data["refresh"],
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(generics.GenericAPIView):
    """
    API endpoint for logging out an authenticated user.

    The provided refresh token is blacklisted so it cannot be used again.
    """

    serializer_class = LogoutSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        """
        Blacklist the user's refresh token.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": "Logout successful."
            },
            status=status.HTTP_200_OK,
        )


class ActivateAccountView(generics.GenericAPIView):
    """
    API endpoint for activating a user account through
    the email verification token.
    """

    permission_classes = [AllowAny]

    def get(self, request, token):
        """
        Verify the activation token and activate the account.
        """

        user_id = verify_activation_token(token)

        if not user_id:
            return Response(
                {
                    "detail": "Invalid or expired activation link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = get_object_or_404(User, pk=user_id)

        if user.is_email_verified:
            return Response(
                {
                    "detail": "This account has already been activated."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.is_email_verified = True
        user.is_active = True

        user.save(
            update_fields=[
                "is_email_verified",
                "is_active",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Your account has been activated successfully."
            },
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(generics.GenericAPIView):
    """
    API endpoint for requesting a password-reset email.

    The endpoint always returns the same response so that it does not
    reveal whether a particular email address is registered.
    """

    serializer_class = ForgotPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        """
        Accept an email address and send a password-reset email
        when the account exists.
        """

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        if user is not None:
            send_password_reset_email(
                user=user,
                request=request,
            )

        return Response(
            {
                "detail": (
                    "If an account with this email exists, "
                    "a password reset link has been sent."
                )
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(generics.GenericAPIView):
    """
    API endpoint for resetting a user's password using a valid
    password-reset token.
    """

    serializer_class = ResetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, uid, token, *args, **kwargs):
        """
        Validate the password-reset token and set a new password.
        """

        user = get_object_or_404(
            User,
            pk=uid,
        )

        if not verify_password_reset_token(
            user=user,
            token=token,
        ):
            return Response(
                {
                    "detail": "Invalid or expired password reset link."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(
            data=request.data,
        )

        serializer.is_valid(
            raise_exception=True,
        )

        user.set_password(
            serializer.validated_data["new_password"]
        )

        user.save(
            update_fields=[
                "password",
                "updated_at",
            ]
        )

        return Response(
            {
                "detail": "Your password has been reset successfully."
            },
            status=status.HTTP_200_OK,
        )