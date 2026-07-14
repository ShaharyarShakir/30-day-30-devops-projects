from rest_framework import serializers


class CaptionSerializer(serializers.Serializer):
    language = serializers.CharField()
    url = serializers.CharField()


class PlaybackResponseSerializer(serializers.Serializer):
    mediaId = serializers.UUIDField(source="media_id")
    status = serializers.CharField()
    duration = serializers.IntegerField()
    playlistUrl = serializers.CharField(source="playlist_url")
    thumbnailUrl = serializers.CharField(source="thumbnail_url", required=False, allow_null=True)
    captions = CaptionSerializer(many=True, required=False, allow_null=True)


class ProgressUpdateRequestSerializer(serializers.Serializer):
    lessonId = serializers.UUIDField(source="lesson_id")
    position = serializers.IntegerField(min_value=0)
    duration = serializers.IntegerField(min_value=1)
    event = serializers.CharField(required=False, allow_blank=True, allow_null=True)


class WatchProgressSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    userId = serializers.UUIDField(source="user_id")
    lessonId = serializers.UUIDField(source="lesson_id")
    mediaId = serializers.UUIDField(source="media_id")
    position = serializers.IntegerField()
    duration = serializers.IntegerField()
    completed = serializers.BooleanField()
    updatedAt = serializers.DateTimeField(source="updated_at")
