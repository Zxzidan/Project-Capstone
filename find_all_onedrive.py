import os

root = r"c:\Users\Dandi\Desktop\OneDrive"
print(f"Scanning ALL files in {root} specifically for model.json, shard, or scanner...")
found = []
try:
    for dirpath, dirnames, filenames in os.walk(root):
        for filename in filenames:
            fn_lower = filename.lower()
            if "model.json" in fn_lower or "shard" in fn_lower or "scanner" in fn_lower or "finova-ai" in fn_lower:
                full_path = os.path.join(dirpath, filename)
                try:
                    size = os.path.getsize(full_path)
                    print(f"Found: {full_path} ({size} bytes)")
                    found.append(full_path)
                except Exception as e:
                    print(f"Found (error reading size): {full_path} - {e}")
except Exception as e:
    print(f"Error during scan: {e}")

print(f"Scan complete. Total found: {len(found)}")
