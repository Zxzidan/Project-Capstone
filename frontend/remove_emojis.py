import os
import glob
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The user wants to remove the emoji icons used as logos.
    # In index.html, we already removed the <div class="card-icon"> tags.
    # Let's remove the <div class="t-icon">...</div> in dashboards, 
    # or just remove the emoji characters if they are inside elements.
    
    # Actually, removing the whole <div class="t-icon">...</div> or <div class="card-icon">...</div> 
    # makes the design cleaner.
    
    # Remove <div class="t-icon" ...>...</div> entirely
    content = re.sub(r'<div class="t-icon".*?>.*?</div>', '', content, flags=re.DOTALL)
    content = re.sub(r'<div class="t-icon">.*?</div>', '', content, flags=re.DOTALL)
    
    # Remove <div class="avatar" style="background:.*?>...</div> where it's used as an icon in mobile list
    content = re.sub(r'<div class="avatar" style="background: [^>]+>.*?</div>', '', content, flags=re.DOTALL)

    # Remove the emojis from sidebar navigation
    content = content.replace('💻 Dashboard', 'Dashboard')
    content = content.replace('📊 Insights & Reports', 'Insights & Reports')
    content = content.replace('💳 Add Transaction', 'Add Transaction')
    content = content.replace('💸', '')
    content = content.replace('⬇️', '')
    content = content.replace('➕', '')
    content = content.replace('🏠', '')
    content = content.replace('📊', '')
    content = content.replace('💳', '')
    content = content.replace('⚙️', '')
    content = content.replace('🛒', '')
    content = content.replace('🍔', '')
    content = content.replace('🚗', '')
    content = content.replace('🛍️', '')
    content = content.replace('💼', '')
    content = content.replace('📸', '')
    content = content.replace('⚠️', '')
    content = content.replace('✅', '')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir = r"c:\Users\Dandi\Desktop\OneDrive\FILE BACKUP\PROJECT CAPSTONE\frontend"
files_to_process = glob.glob(os.path.join(base_dir, '**', '*.html'), recursive=True)

for f in files_to_process:
    process_file(f)

# Also clean up app.js emojis
app_js_path = os.path.join(base_dir, 'src', 'js', 'app.js')
if os.path.exists(app_js_path):
    with open(app_js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = re.sub(r'<div class="t-icon mr-4">.*?</div>', '', content, flags=re.DOTALL)
    content = content.replace("let icon = insight.type === 'warning' ? '⚠️' : (insight.type === 'success' ? '✅' : '📊');", "let icon = '';")
    content = content.replace("<span>${icon}</span>", "")
    
    with open(app_js_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Done removing emojis and icon divs.")
