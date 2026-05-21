import os
import string

def get_drives():
    drives = []
    # Check C to Z
    for letter in string.ascii_uppercase:
        drive = f"{letter}:\\"
        if os.path.exists(drive):
            drives.append(drive)
    return drives

drives = get_drives()
print(f"Drives found: {drives}")

target_names = {"model.json", "group1-shard1.bin", "scanner.html"}

print("Searching across all drives...")
for drive in drives:
    # Skip C because we already scanned it deeply or let's scan specific common paths on C
    if drive == "C:\\":
        continue
    print(f"Scanning drive {drive}...")
    try:
        for dirpath, dirnames, filenames in os.walk(drive):
            # Prune commonly large/system directories to keep it fast
            dirnames[:] = [d for d in dirnames if not any(p in d for p in ["node_modules", "$RECYCLE.BIN", "System Volume Information", "AppData", "Package Cache", ".git", ".gradle"])]
            
            for filename in filenames:
                lower_name = filename.lower()
                if "model.json" in lower_name or "shard" in lower_name or "scanner" in lower_name:
                    full_path = os.path.join(dirpath, filename)
                    print(f"Found: {full_path} ({os.path.getsize(full_path)} bytes)")
    except Exception as e:
        print(f"Error scanning {drive}: {e}")

print("Search complete.")
