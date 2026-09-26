import unittest
from unittest.mock import patch

from app import main


class SoundCloudTests(unittest.TestCase):
    def test_normalizes_playable_track(self):
        item = main._normalize_track({
            "id": 123,
            "title": "Seven",
            "full_duration": 185400,
            "streamable": True,
            "policy": "ALLOW",
            "permalink_url": "https://soundcloud.com/example/seven",
            "artwork_url": "https://i1.sndcdn.com/artworks-test-large.jpg",
            "user": {"username": "Gabriel"},
            "publisher_metadata": {"artist": "Seven Artist"},
            "media": {
                "transcodings": [{
                    "url": "https://api-v2.soundcloud.com/media/test/stream/progressive",
                    "snipped": False,
                    "preset": "mp3_1_0",
                    "format": {"protocol": "progressive", "mime_type": "audio/mpeg"},
                    "quality": "sq",
                }]
            },
        })

        self.assertIsNotNone(item)
        assert item is not None
        self.assertEqual(item["trackUrn"], "soundcloud:tracks:123")
        self.assertEqual(item["artist"], "Seven Artist")
        self.assertEqual(item["durationSeconds"], 185)
        self.assertEqual(item["access"], "playable")
        self.assertNotIn("trackAuthorization", item)
        self.assertNotIn("transcodingUrl", item)

    def test_blocks_snipped_only_track(self):
        item = main._normalize_track({
            "id": 123,
            "title": "Preview only",
            "duration": 30000,
            "streamable": True,
            "user": {"username": "Gabriel"},
            "media": {
                "transcodings": [{
                    "url": "https://api-v2.soundcloud.com/media/test/stream/progressive",
                    "snipped": True,
                    "format": {"protocol": "progressive", "mime_type": "audio/mpeg"},
                }]
            },
        })

        assert item is not None
        self.assertEqual(item["access"], "blocked")

    def test_prefers_hls_aac_for_current_soundcloud_playback(self):
        selected = main._select_transcoding({
            "media": {
                "transcodings": [
                    {
                        "url": "https://audio.example/hls",
                        "snipped": False,
                        "preset": "aac_1_0",
                        "format": {"protocol": "hls", "mime_type": "audio/mp4"},
                        "quality": "hq",
                    },
                    {
                        "url": "https://audio.example/progressive",
                        "snipped": False,
                        "preset": "mp3_1_0",
                        "format": {"protocol": "progressive", "mime_type": "audio/mpeg"},
                        "quality": "sq",
                    },
                ]
            }
        })

        self.assertEqual(selected["url"], "https://audio.example/hls")

    def test_resolve_adds_track_authorization(self):
        track = {
            "track_authorization": "track-jwt",
            "media": {
                "transcodings": [{
                    "url": "https://api-v2.soundcloud.com/media/test/stream/progressive",
                    "snipped": False,
                    "preset": "mp3_1_0",
                    "format": {"protocol": "progressive", "mime_type": "audio/mpeg"},
                    "quality": "sq",
                }]
            },
        }

        with patch.object(
            main,
            "_soundcloud_request",
            return_value={"url": "https://cf-media.sndcdn.com/audio.mp3"},
        ) as request:
            stream_url, stream_format = main._resolve_transcoding(track)

        self.assertEqual(stream_url, "https://cf-media.sndcdn.com/audio.mp3")
        self.assertEqual(stream_format, "progressive-mp3_1_0")
        request.assert_called_once_with(
            "https://api-v2.soundcloud.com/media/test/stream/progressive",
            {"track_authorization": "track-jwt"},
            send_access_token=False,
        )

    def test_resolve_falls_back_when_best_transcoding_is_stale(self):
        track = {
            "track_authorization": "fresh-track-jwt",
            "media": {
                "transcodings": [
                    {
                        "url": "https://api-v2.soundcloud.com/media/test/stream/hls",
                        "snipped": False,
                        "preset": "aac_160k",
                        "format": {"protocol": "hls", "mime_type": "audio/mp4"},
                        "quality": "hq",
                    },
                    {
                        "url": "https://api-v2.soundcloud.com/media/test/stream/progressive",
                        "snipped": False,
                        "preset": "mp3_1_0",
                        "format": {"protocol": "progressive", "mime_type": "audio/mpeg"},
                        "quality": "sq",
                    },
                ]
            },
        }

        def request(url, params, *, send_access_token=True, **kwargs):
            if url.endswith("/hls"):
                raise main.SoundCloudApiError(404, "stale hls")
            return {"url": "https://cf-media.sndcdn.com/fallback.mp3"}

        with patch.object(main, "_soundcloud_request", side_effect=request):
            stream_url, stream_format = main._resolve_transcoding(track)

        self.assertEqual(stream_url, "https://cf-media.sndcdn.com/fallback.mp3")
        self.assertEqual(stream_format, "progressive-mp3_1_0")

    def test_identity_search_recovers_exact_track_urn(self):
        wanted = {
            "id": 219074813,
            "title": "In the End",
            "streamable": True,
            "media": {"transcodings": []},
        }
        other = {"id": 999, "title": "Other"}

        with patch.object(
            main,
            "_soundcloud_request",
            return_value={"collection": [other, wanted]},
        ):
            track = main._find_track_via_search(
                "soundcloud:tracks:219074813",
                permalink_url="https://soundcloud.com/linkinpark/in-the-end",
            )

        self.assertIs(track, wanted)


if __name__ == "__main__":
    unittest.main()
