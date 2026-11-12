"""Behave environment for mazo-cesta-solidaria BDD tests."""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Register the table type with behave's step registry
from behave.matchers import ParseMatcher
from behave.model import Table

ParseMatcher.TYPE_REGISTRY["table"] = Table


def before_all(context) -> None:
    os.environ.setdefault("SUPABASE_URL", "http://localhost:54321")
    os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
    os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")


def before_scenario(context, scenario) -> None:
    context.context = {}


def after_scenario(context, scenario) -> None:
    pass
