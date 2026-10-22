#!/usr/bin/env python3
"""
AI7 Solaris — Konsol v3 WCAG 2.1 Contrast Ratio Calculator
Precision verification for Konsol v3 Craftsmanship Redesign tokens.
Aesthetic: Deep Obsidian Slate Surfaces + Luminous Electric Azure/Cyan & Indigo Accents.
Author: Iris (AI7 Luminary — Lead UI/UX Artisan & Frontend Architect)
"""

import re
from pathlib import Path

def srgb_to_linear(c_byte: int) -> float:
    c = c_byte / 255.0
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4

def relative_luminance(hex_str: str) -> float:
    hex_str = hex_str.lstrip('#')
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    r_lin = srgb_to_linear(r)
    g_lin = srgb_to_linear(g)
    b_lin = srgb_to_linear(b)
    return 0.2126 * r_lin + 0.7152 * g_lin + 0.0722 * b_lin

def contrast_ratio(hex1: str, hex2: str) -> float:
    l1 = relative_luminance(hex1)
    l2 = relative_luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def evaluate(fg_name: str, fg_hex: str, bg_name: str, bg_hex: str, min_req: float = 4.5):
    cr = contrast_ratio(fg_hex, bg_hex)
    l_fg = relative_luminance(fg_hex)
    l_bg = relative_luminance(bg_hex)
    passed = cr >= min_req
    status = "PASS (AAA)" if cr >= 7.0 else ("PASS (AA)" if cr >= 4.5 else ("PASS (AA-Large / 3:1)" if cr >= 3.0 else "FAIL"))
    return {
        "fg_name": fg_name,
        "fg_hex": fg_hex,
        "bg_name": bg_name,
        "bg_hex": bg_hex,
        "l_fg": l_fg,
        "l_bg": l_bg,
        "ratio": cr,
        "status": status,
        "passed": passed
    }

def verify_tokens_css():
    css_path = Path(__file__).resolve().parent.parent / "tokens.css"
    if not css_path.exists():
        print(f"Error: {css_path} not found.")
        return []
    content = css_path.read_text(encoding="utf-8")
    hex_list = sorted(list(set(re.findall(r'#[0-9a-fA-F]{6}', content))))
    return hex_list

def main():
    surfaces = {
        "surface_base": ("Surface Base (Canvas)", "#06080D"),
        "surface_container": ("Surface Container (App)", "#090D16"),
        "surface_sidebar": ("Surface Sidebar / Card", "#0F1726"),
        "surface_rail": ("Surface Rail", "#141D2E"),
        "surface_inset": ("Surface Inset / Well", "#131D31"),
        "surface_field": ("Surface Input / Field", "#111A2A"),
        "surface_elevated": ("Surface Elevated / Modal", "#182236"),
        
        # Chip wells
        "chip_nominal": ("Chip Nominal BG", "#072B20"),
        "chip_running": ("Chip Running BG", "#0C243E"),
        "chip_warning": ("Chip Warning BG", "#2B1D06"),
        "chip_critical": ("Chip Critical BG", "#2F0E13"),
        "chip_resolved": ("Chip Resolved BG", "#172132"),
    }

    elements = {
        # Core Typography (Obsidian Slate Craftsmanship)
        "text_primary": ("Text Primary", "#F8FAFC"),
        "text_secondary": ("Text Secondary", "#94A3B8"),
        "text_muted": ("Text Muted (High Contrast UI)", "#8494A7"),
        "text_on_light": ("Text on Light", "#06080D"),

        # Brand Accents (Luminous Electric Azure / Cyan & Indigo)
        "accent_cyan": ("Electric Cyan / Sky", "#38BDF8"),
        "accent_cyan_highlight": ("Electric Sky Highlight", "#7DD3FC"),
        "primary_indigo": ("Luminous Indigo", "#818CF8"),
        "primary_indigo_core": ("Electric Indigo Core", "#6366F1"),

        # Semantic Statuses (Calibrated Vivid & Crisp on Deep Obsidian)
        "status_nominal": ("Status Nominal (Emerald Mint)", "#34D399"),
        "status_running": ("Status Running (Electric Sky)", "#38BDF8"),
        "status_warning": ("Status Warning (Warm Amber)", "#FBBF24"),
        "status_critical": ("Status Critical (Vivid Scarlet)", "#F87171"),
        "status_resolved": ("Status Resolved (Slate Titanium)", "#94A3B8"),

        # Interactive controls & borders (WCAG 1.4.11 UI Components min 3.0:1)
        "border_focus": ("Border Focus Ring", "#38BDF8"),
    }

    test_suite = [
        # 1. Canvas / Base pairs (#06080D)
        ("text_primary", "surface_base", 4.5),
        ("text_secondary", "surface_base", 4.5),
        ("text_muted", "surface_base", 3.0),
        ("accent_cyan", "surface_base", 4.5),
        ("primary_indigo", "surface_base", 4.5),
        ("accent_cyan_highlight", "surface_base", 4.5),

        # 2. App Container pairs (#090D16)
        ("text_primary", "surface_container", 4.5),
        ("text_secondary", "surface_container", 4.5),
        ("text_muted", "surface_container", 3.0),
        ("accent_cyan", "surface_container", 4.5),
        ("primary_indigo", "surface_container", 4.5),

        # 3. Card / Sidebar pairs (#0F1726)
        ("text_primary", "surface_sidebar", 4.5),
        ("text_secondary", "surface_sidebar", 4.5),
        ("text_muted", "surface_sidebar", 3.0),
        ("accent_cyan", "surface_sidebar", 4.5),
        ("primary_indigo", "surface_sidebar", 4.5),
        ("status_nominal", "surface_sidebar", 4.5),
        ("status_running", "surface_sidebar", 4.5),
        ("status_warning", "surface_sidebar", 4.5),
        ("status_critical", "surface_sidebar", 4.5),
        ("status_resolved", "surface_sidebar", 4.5),

        # 4. Inset / Well pairs (#131D31)
        ("text_primary", "surface_inset", 4.5),
        ("text_secondary", "surface_inset", 4.5),
        ("text_muted", "surface_inset", 3.0),
        ("accent_cyan", "surface_inset", 4.5),
        ("primary_indigo", "surface_inset", 4.5),
        ("status_nominal", "surface_inset", 4.5),
        ("status_running", "surface_inset", 4.5),
        ("status_warning", "surface_inset", 4.5),
        ("status_critical", "surface_inset", 4.5),
        ("status_resolved", "surface_inset", 4.5),

        # 5. Badges / Chips (Text on Chip Background)
        ("status_nominal", "chip_nominal", 4.5),
        ("status_running", "chip_running", 4.5),
        ("status_warning", "chip_warning", 4.5),
        ("status_critical", "chip_critical", 4.5),
        ("status_resolved", "chip_resolved", 4.5),

        # 6. Non-text UI controls (WCAG 1.4.11 min 3.0:1)
        ("border_focus", "surface_sidebar", 3.0),
        ("border_focus", "surface_base", 3.0),
    ]

    print("=" * 105)
    print("AI7 SOLARIS — KONSOL v3 DESIGN SYSTEM CRAFTSMANSHIP REDESIGN WCAG 2.1 CONTRAST SUITE")
    print("Author: Iris (Lead UI/UX Artisan) — Zero-Dependency Precision Verification")
    print("=" * 105)
    print(f"{'Pasangan Uji (Elemen @ Latar)':<42} | {'Elemen':<9} | {'Latar':<9} | {'L1 / L2 Lum':<15} | {'Rasio':<8} | {'Vonis Standar'}")
    print("-" * 105)

    all_passed = True
    for el_key, surf_key, min_req in test_suite:
        el_name, el_hex = elements[el_key]
        surf_name, surf_hex = surfaces[surf_key]
        res = evaluate(el_name, el_hex, surf_name, surf_hex, min_req)
        lum_str = f"{res['l_fg']:.4f}/{res['l_bg']:.4f}"
        print(f"{res['fg_name'] + ' @ ' + surf_name.split()[1]:<42} | {res['fg_hex']:<9} | {res['bg_hex']:<9} | {lum_str:<15} | {res['ratio']:>6.2f}:1 | {res['status']}")
        if not res['passed']:
            all_passed = False

    print("=" * 105)
    outcome = "LULUS PENUH (Seluruh pasangan teks >= 4.5:1 AA / 3.0:1 Large UI; elemen non-teks >= 3:1)" if all_passed else "GAGAL"
    print(f"Hasil Evaluasi: {outcome}")
    print("=" * 105)

    hex_list = verify_tokens_css()
    print(f"\nDaftar Hex Ditemukan dalam tokens.css ({len(hex_list)} warna unik):")
    for h in hex_list:
        lum = relative_luminance(h)
        print(f"  {h} (luminance: {lum:.4f})")

if __name__ == "__main__":
    main()
