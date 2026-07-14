from django.urls import path, re_path

from media.video.api import views

urlpatterns = [
    path("videos/<str:video_id>/play", views.VideoPlayView.as_view(), name="video-play"),
    path("progress", views.WatchProgressUpdateView.as_view(), name="progress-update"),
    path("progress/<str:lesson_id>", views.WatchProgressDetailView.as_view(), name="progress-detail"),
    path("videos/<str:video_id>/captions", views.VideoCaptionsView.as_view(), name="video-captions"),
    path("videos/<str:video_id>/thumbnail", views.VideoThumbnailView.as_view(), name="video-thumbnail"),
    
    # Capture all file paths under /media/ or /files/ for signature checks
    re_path(r"^media/(?P<storage_key>.+)$", views.ServeMediaFileView.as_view(), name="serve-media-file"),
    re_path(r"^files/(?P<storage_key>.+)$", views.ServeMediaFileView.as_view(), name="serve-media-file-compat"),
]
