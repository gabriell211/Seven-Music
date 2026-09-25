import unittest

from app import main


class SoundCloudTests(unittest.TestCase):
    def test_normalizes_track(self):
        item = main._normalize_track({
            "id": 123,
            "title": "Seven",
            "duration": 185400,
            "access": "playable",
            "permalink_url": "https://soundcloud.com/example/seven",
            "artwork_url": "https://i1.sndcdn.com/artworks-test-large.jpg",
            "user": {"username": "Gabriel"},
            "publisher_metadata": {"artist": "Seven Artist"},
        })

        self.assertIsNotNone(item)
        assert item is not None
        self.assertEqual(item["trackUrn"], "soundcloud:tracks:123")
        self.assertEqual(item["artist"], "Seven Artist")
        self.assertEqual(item["durationSeconds"], 185)

    def test_prefers_aac_160_stream(self):
        url, stream_format = main._select_stream({
            "hls_aac_96_url": "https://audio.example/96.m3u8",
            "hls_aac_160_url": "https://audio.example/160.m3u8",
        })

        self.assertEqual(url, "https://audio.example/160.m3u8")
        self.assertEqual(stream_format, "hls-aac-160")

    def test_falls_back_to_aac_96_stream(self):
        url, stream_format = main._select_stream({
            "hls_aac_96_url": "https://audio.example/96.m3u8",
        })

        self.assertEqual(url, "https://audio.example/96.m3u8")
        self.assertEqual(stream_format, "hls-aac-96")

    def test_rejects_missing_full_stream(self):
        with self.assertRaises(main.SoundCloudApiError):
            main._select_stream({"preview_mp3_128_url": "https://audio.example/preview.mp3"})


if __name__ == "__main__":
    unittest.main()
