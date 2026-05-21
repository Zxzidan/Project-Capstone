import os
import zipfile

root = r"C:\Users\Dandi\Downloads"
print(f"Scanning all zip files in {root} specifically for model.json or .bin files...")
for dirpath, dirnames, filenames in os.walk(root):
    for filename in filenames:
        if filename.endswith(".zip"):
            full_path = os.path.join(dirpath, filename)
            try:
                with zipfile.ZipFile(full_path, 'r') as zf:
                    names = zf.namelist()
                    # Look strictly for model.json, scanner.html or any .bin files
                    matched = [name for name in names if name.lower().endswith("model.json") or name.lower().endswith(".bin") or "scanner.html" in name.lower()]
                    if matched:
                        print(f"\n--- MATCH IN ZIP: {full_path} ---")
                        for m in matched:
                            print(f"  {m}")
            except Exception as e:
                pass
print("Strict ZIP scan completed.")
