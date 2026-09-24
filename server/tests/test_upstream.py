import asyncio
import io
import json
import os
import threading
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app import main


class UpstreamResolverTests(unittest.TestCase):
    def test_uses_first_successful_upstream_without_waiting_for_first_candidate(self):
        second_started = threading.Event()

        def fake_urlopen(request, timeout):
            if "slow.example" in request.full_url:
                if not second_started.wait(2):
                    raise TimeoutError("upstreams were called sequentially")
                raise OSError("first upstream unavailable")
            second_started.set()
            return io.BytesIO(json.dumps({"streamUrl": "https://audio.example/track"}).encode())

        with patch.object(main, "_resolver_upstreams", return_value=[
            "https://slow.example", "https://fast.example",
        ]), patch.object(main.urllib.request, "urlopen", side_effect=fake_urlopen):
            result = main._resolve_upstream_sync("FGBhQbmPwH8")

        self.assertEqual(result["streamUrl"], "https://audio.example/track")

    def test_vercel_reports_upstream_failure_without_starting_local_resolver(self):
        with patch.dict(os.environ, {"VERCEL": "1"}), \
                patch.object(main, "_resolver_upstreams", return_value=["https://audio.example"]), \
                patch.object(main, "_resolve_upstream_sync", side_effect=OSError("offline")), \
                patch.object(main, "_resolve_sync", side_effect=AssertionError("unexpected fallback")):
            with self.assertRaises(HTTPException) as caught:
                asyncio.run(main.youtube_resolve("FGBhQbmPwH8"))

        self.assertEqual(caught.exception.status_code, 502)


if __name__ == "__main__":
    unittest.main()
