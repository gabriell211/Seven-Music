from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Iterable


SearchFn = Callable[[str, int], list[dict[str, Any]]]
ResolveFn = Callable[[str], dict[str, Any]]


@dataclass(frozen=True, slots=True)
class ProviderResponse:
    provider: str
    value: Any


@dataclass(frozen=True, slots=True)
class ProviderFailure:
    provider: str
    error: Exception


class ProviderChainError(RuntimeError):
    def __init__(self, operation: str, failures: Iterable[ProviderFailure]) -> None:
        self.operation = operation
        self.failures = tuple(failures)
        super().__init__(self.summary())

    @property
    def last_error(self) -> Exception | None:
        return self.failures[-1].error if self.failures else None

    def summary(self) -> str:
        if not self.failures:
            return f"{self.operation}: no provider available"

        attempts = ", ".join(
            f"{failure.provider}={type(failure.error).__name__}"
            for failure in self.failures
        )
        return f"{self.operation}: {attempts}"


@dataclass(frozen=True, slots=True)
class CallableYouTubeProvider:
    name: str
    search_fn: SearchFn | None = None
    resolve_fn: ResolveFn | None = None

    def search(self, query: str, limit: int) -> list[dict[str, Any]]:
        if self.search_fn is None:
            raise NotImplementedError(f"{self.name} does not support search")
        return self.search_fn(query, limit)

    def resolve(self, video_id: str) -> dict[str, Any]:
        if self.resolve_fn is None:
            raise NotImplementedError(f"{self.name} does not support resolve")
        return self.resolve_fn(video_id)


class YouTubeProviderChain:
    def __init__(
        self,
        providers: Iterable[CallableYouTubeProvider],
        *,
        fatal_exceptions: tuple[type[BaseException], ...] = (),
    ) -> None:
        self._providers = tuple(providers)
        self._fatal_exceptions = fatal_exceptions

    @property
    def provider_names(self) -> tuple[str, ...]:
        return tuple(provider.name for provider in self._providers)

    def search(self, query: str, limit: int) -> ProviderResponse:
        failures: list[ProviderFailure] = []

        for provider in self._providers:
            if provider.search_fn is None:
                continue
            try:
                return ProviderResponse(
                    provider=provider.name,
                    value=provider.search(query, limit),
                )
            except self._fatal_exceptions:
                raise
            except Exception as exc:
                failures.append(ProviderFailure(provider.name, exc))

        raise ProviderChainError("search", failures)

    def resolve(self, video_id: str) -> ProviderResponse:
        failures: list[ProviderFailure] = []

        for provider in self._providers:
            if provider.resolve_fn is None:
                continue
            try:
                return ProviderResponse(
                    provider=provider.name,
                    value=provider.resolve(video_id),
                )
            except self._fatal_exceptions:
                raise
            except Exception as exc:
                failures.append(ProviderFailure(provider.name, exc))

        raise ProviderChainError("resolve", failures)
