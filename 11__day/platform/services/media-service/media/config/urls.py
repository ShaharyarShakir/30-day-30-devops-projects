from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("media.upload.api.urls")),
    path("api/", include("media.video.api.urls")),
    path("media/", include("media.upload.api.urls")),
    path("media/", include("media.video.api.urls")),
]
