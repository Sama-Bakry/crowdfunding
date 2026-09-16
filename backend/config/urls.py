from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve
from django.http import FileResponse
import os

frontend_dir = os.path.join(settings.BASE_DIR.parent, 'frontend')

def serve_index(request):
    return FileResponse(open(os.path.join(frontend_dir, 'index.html'), 'rb'))

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/accounts/", include("accounts.urls")),
    path("api/projects/", include("projects.urls")),
    path("api/interactions/", include("interactions.urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT,
    )

urlpatterns += [
    path("", serve_index),
    re_path(r'^(?P<path>.*)$', serve, kwargs={'document_root': frontend_dir}),
]