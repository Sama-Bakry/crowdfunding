from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):


    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.owner_id == request.user.id

class IsOwnerOrAdminOrReadOnly(
    permissions.BasePermission
):

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        if request.method in permissions.SAFE_METHODS:
            return True

        if (
            request.method == "DELETE"
            and request.user.is_staff
        ):
            return True

        return obj.owner_id == request.user.id
    
class IsAdminOrReadOnly(permissions.BasePermission):


    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return bool(request.user and request.user.is_staff)
