import os
import unittest
from unittest.mock import patch

from app import main
from app.providers import CallableYouTubeProvider, YouTubeProviderChain


class ProviderChainTests(unittest.TestCase):
    def test_falls_back_to_second_provider(self):
        def broken_search(query: str, limit: int):
            raise OSError("offline")

        def working_search(query: str, limit: int):
            return [{"videoId": "FGBhQbmPwH8", "title": query, "limit": limit}]

        chain = YouTubeProviderChain([
            CallableYouTubeProvider(name="primary", search_fn=broken_search),
            CallableYouTubeProvider(name="fallback", search_fn=working_search),
        ])

        result = chain.search("Seven", 5)

        self.assertEqual(result.provider, "fallback")
        self.assertEqual(result.value[0]["title"], "Seven")

    def test_fatal_exception_does_not_try_next_provider(self):
        class FatalResolverError(RuntimeError):
            pass

        fallback_called = False

        def fatal_resolve(video_id: str):
            raise FatalResolverError(video_id)

        def fallback_resolve(video_id: str):
            nonlocal fallback_called
            fallback_called = True
            return {"streamUrl": "https://audio.example/test"}

        chain = YouTubeProviderChain(
            [
                CallableYouTubeProvider(name="primary", resolve_fn=fatal_resolve),
                CallableYouTubeProvider(name="fallback", resolve_fn=fallback_resolve),
            ],
            fatal_exceptions=(FatalResolverError,),
        )

        with self.assertRaises(FatalResolverError):
            chain.resolve("FGBhQbmPwH8")

        self.assertFalse(fallback_called)

    def test_extracts_expiry_from_signed_stream_url(self):
        with patch.object(main.time, "time", return_value=1_900_000_000):
            expiry = main._stream_expiry_timestamp(
                "https://rr.example/videoplayback?expire=2000000000&id=test"
            )

        self.assertEqual(expiry, 2_000_000_000)

    def test_cache_never_outlives_stream_safety_window(self):
        deadline = main._cache_deadline(1000, 1100)
        self.assertEqual(
            deadline,
            1100 - main.STREAM_EXPIRY_SAFETY_SECONDS,
        )

    def test_vercel_resolve_uses_only_upstream_provider(self):
        with patch.dict(os.environ, {"VERCEL": "1"}), patch.object(
            main,
            "_resolver_upstreams",
            return_value=["https://resolver.example"],
        ):
            chain = main._youtube_resolve_chain()

        self.assertEqual(chain.provider_names, ("upstream",))

    def test_non_vercel_resolve_keeps_local_fallback(self):
        with patch.dict(os.environ, {}, clear=True), patch.object(
            main,
            "_resolver_upstreams",
            return_value=["https://resolver.example"],
        ):
            chain = main._youtube_resolve_chain()

        self.assertEqual(chain.provider_names, ("upstream", "yt-dlp"))


if __name__ == "__main__":
    unittest.main()
