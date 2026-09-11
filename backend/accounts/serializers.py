from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone

from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .validators import validate_egyptian_mobile


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer responsible for validating and creating a new user account.

    The account remains inactive until email verification is completed.
    """

    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    class Meta:
        model = User

        fields = [
            "first_name",
            "last_name",
            "email",
            "phone_number",
            "password",
            "confirm_password",
            "profile_picture",
        ]

        extra_kwargs = {
            "first_name": {
                "required": True,
                "allow_blank": False,
            },
            "last_name": {
                "required": True,
                "allow_blank": False,
            },
            "email": {
                "required": True,
                "allow_blank": False,
            },
            "phone_number": {
                "required": True,
                "allow_blank": False,
            },
            "profile_picture": {
                "required": False,
                "allow_null": True,
            },
        }

    def validate_email(self, value):
        value = value.strip().lower()

        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )

        return value

    def validate_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

        return value

    def validate_phone_number(self, value):
        value = validate_egyptian_mobile(value)

        if User.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError(
                "An account with this phone number already exists."
            )

        return value

    def validate(self, attrs):
        password = attrs.get("password")
        confirm_password = attrs.get("confirm_password")

        if password != confirm_password:
            raise serializers.ValidationError(
                {
                    "confirm_password": "Passwords do not match."
                }
            )

        return attrs

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")

        user = User(
            **validated_data,
            is_active=False,
            is_email_verified=False,
        )

        user.set_password(password)
        user.save()

        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer responsible for authenticating users using
    email and password and returning JWT tokens.
    """

    email = serializers.EmailField(
        required=True,
    )

    password = serializers.CharField(
        write_only=True,
        required=True,
        style={"input_type": "password"},
    )

    def validate(self, attrs):
        email = attrs["email"].strip().lower()
        password = attrs["password"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {
                    "detail": "Invalid email or password."
                }
            )

        if not user.check_password(password):
            raise serializers.ValidationError(
                {
                    "detail": "Invalid email or password."
                }
            )

        if not user.is_email_verified or not user.is_active:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Please activate your account before logging in."
                    )
                }
            )

        refresh = RefreshToken.for_user(user)

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        attrs["user"] = user
        attrs["refresh"] = str(refresh)
        attrs["access"] = str(refresh.access_token)

        return attrs


class LogoutSerializer(serializers.Serializer):
    """
    Serializer responsible for invalidating a user's refresh token.
    """

    refresh = serializers.CharField(
        required=True,
        write_only=True,
    )

    def validate_refresh(self, value):
        try:
            RefreshToken(value)
        except Exception:
            raise serializers.ValidationError(
                "Invalid or expired refresh token."
            )

        return value

    def save(self, **kwargs):
        refresh_token = self.validated_data["refresh"]

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            raise serializers.ValidationError(
                {
                    "refresh": "Invalid or expired refresh token."
                }
            )


class ForgotPasswordSerializer(serializers.Serializer):
    """
    Serializer responsible for accepting an email address and
    initiating the password-reset flow.

    The API intentionally returns the same response whether the
    email exists or not to avoid exposing registered accounts.
    """

    email = serializers.EmailField(
        required=True,
    )

    def validate_email(self, value):
        return value.strip().lower()

    def save(self, **kwargs):
        email = self.validated_data["email"]

        try:
            user = User.objects.get(
                email__iexact=email,
            )
        except User.DoesNotExist:
            return None

        self.user = user

        return user


class ResetPasswordSerializer(serializers.Serializer):
    """
    Serializer responsible for validating and setting a new password.
    """

    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"},
    )

    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
    )

    def validate_new_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages)

        return value

    def validate(self, attrs):
        new_password = attrs.get("new_password")
        confirm_password = attrs.get("confirm_password")

        if new_password != confirm_password:
            raise serializers.ValidationError(
                {
                    "confirm_password": "Passwords do not match."
                }
            )

        return attrs