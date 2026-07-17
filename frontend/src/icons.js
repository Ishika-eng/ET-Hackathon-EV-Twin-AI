import {
  Zap, UploadCloud, Truck, ClipboardList, Layers, BatteryCharging,
  AlertTriangle, Globe2, MessageCircle,
} from "lucide-react";

// Single source of truth so the sidebar nav and landing page feature grid
// can never drift out of sync with each other.
export const SECTION_ICONS = {
  upload: UploadCloud,
  fleet: Truck,
  procurement: ClipboardList,
  twin: Layers,
  health: BatteryCharging,
  supply: AlertTriangle,
  carbon: Globe2,
  chat: MessageCircle,
};

export const LogoIcon = Zap;
