"""
In-memory "active dataset" switch: lets an uploaded fleet temporarily
override the bundled demo data across every procurement-dependent view
(Fleet Overview, Procurement Plan, Digital Twin's diesel-vehicle view,
Carbon Intelligence, and the chat orchestrator's procurement tools),
without needing a database.

Single-instance, single-active-fleet by design -- proportionate for a demo
tool where one person drives the app at a time, not multi-tenant session
storage. Battery Health and Supply Chain Risk deliberately do NOT read
from this: they depend on telemetry and supplier data an uploaded fleet
CSV doesn't (and structurally can't) contain.
"""
from datetime import datetime, timezone

import pandas as pd

_active_fleet_df: pd.DataFrame | None = None
_active_fleet_meta: dict = {}


def set_active_fleet(df: pd.DataFrame, filename: str):
    global _active_fleet_df, _active_fleet_meta
    _active_fleet_df = df
    _active_fleet_meta = {
        "filename": filename,
        "vehicle_count": len(df),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


def clear_active_fleet():
    global _active_fleet_df, _active_fleet_meta
    _active_fleet_df = None
    _active_fleet_meta = {}


def get_active_fleet():
    return _active_fleet_df


def get_active_dataset_info():
    if _active_fleet_df is None:
        return {"active": False, "source": "demo"}
    return {"active": True, "source": "upload", **_active_fleet_meta}
