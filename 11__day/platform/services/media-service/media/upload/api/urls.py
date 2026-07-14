from django.urls import path

from media.upload.api import views

urlpatterns = [
    path("uploads/", views.create_upload, name="create-upload"),
    path("uploads/<str:upload_id>/complete/", views.complete_upload, name="complete-upload"),
    path("files/<str:media_id>/", views.MediaFileDetailView.as_view(), name="media-file-detail"),
]
