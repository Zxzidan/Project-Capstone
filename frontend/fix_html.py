import os
import glob

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replacements
    replacements = {
        "Finova AI": "Finova",
        "AI Savings Goal": "Savings Goal",
        "AI-powered": "Smart",
        "AI Recommendations": "Recommendations",
        "(AI Auto-fill)": "(Auto-fill)",
        "rgba(255, 255, 255, 0.1)": "#eff6ff",
        "rgba(255,255,255,0.1)": "#eff6ff",
        "rgba(255,255,255,0.05)": "rgba(0,0,0,0.03)",
        "rgba(255,255,255,0.2)": "rgba(0,0,0,0.08)",
        "rgba(16, 185, 129, 0.2)": "#dcfce7",
        "color: white;": "color: var(--color-text-primary);",
        '<span style="color: var(--color-primary);">🤖</span>': '<span style="color: var(--color-primary);">📊</span>',
        "✨ New AI Insights Engine Live": "🚀 New Financial Dashboard Live",
        "Master Your Finances with <br />\n        <span class=\"text-gradient\">Intelligent Automation</span>": "Master Your Finances with <br />\n        <span class=\"text-gradient\">Smart Tracking</span>",
        "🤖": "📊",
        "color: rgba(255,255,255,0.8);": "color: rgba(255,255,255,0.9);",
    }

    for old, new in replacements.items():
        content = content.replace(old, new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir = r"c:\Users\Dandi\Desktop\OneDrive\FILE BACKUP\PROJECT CAPSTONE\frontend"
files_to_process = glob.glob(os.path.join(base_dir, 'pages', '**', '*.html'), recursive=True)

for f in files_to_process:
    process_file(f)

print("Done processing HTML files.")
