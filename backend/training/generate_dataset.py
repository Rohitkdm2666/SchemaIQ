import csv
import random
import os

# Configuration for "The Industrial Scale Dataset"
NUM_ROWS = 500000
OUTPUT_FILE = "metadata_dataset_v2.csv"

# Sample metadata components for generation (Multi-Industry)
prefixes = [
    "user", "cust", "order", "txn", "sale", "prod", "inv", "supp", "dept", "emp", "addr",
    "patient", "claim", "diag", "med", "hosp", "appt", "vitals", # Healthcare
    "acct", "bal", "cred", "debt", "rate", "fx", "ledger", "stmt", # Finance
    "ship", "carr", "whse", "bin", "pal", "trk", "route", "eta"      # Logistics
]
middles = [
    "id", "code", "ref", "dt", "amt", "stat", "name", "desc", "qty", "cat", "uuid",
    "hash", "key", "val", "type", "grp", "sub", "link", "map", "auth"
]
suffixes = [
    "_pk", "_fk", "_01", "_v2", "_raw", "_norm", "_sys", "_audit", "_meta", "_tmp",
    "_encoded", "_hashed", "_encrypted", "_deprecated", "_v3"
]

business_contexts = [
    "unique identifier for the primary relational entity",
    "secondary reference index for cross-table lookup and join-path resolution",
    "temporal marker for transaction lifecycle and audit logging",
    "normalized quantitative value for aggregate reporting and financial modeling",
    "descriptive string for human-readable indexing and business intelligence",
    "categorical label for domain classification and subset filtering",
    "status flag indicating current operational state within the state machine",
    "foreign key mapping to parent entity relational graph",
    "PII-sensitive field encrypted for compliance and security audit",
    "Legacy attribute maintained for backward compatibility with v2 systems",
    "Calculated metric derived from multiple source transaction points",
    "Metadata hash for integrity verification and version control"
]

def generate():
    print(f"Generating RGT-1 Research Dataset ({NUM_ROWS} samples)...")
    
    with open(OUTPUT_FILE, mode='w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(["column_name", "data_type", "is_key", "business_description"])
        
        for i in range(NUM_ROWS):
            col = random.choice(prefixes) + "_" + random.choice(middles) + random.choice(suffixes)
            dtype = random.choice(["INTEGER", "VARCHAR(255)", "DATETIME", "DECIMAL(10,2)", "UUID"])
            is_key = "PRIMARY" if "_pk" in col else ("FOREIGN" if "_fk" in col else "NONE")
            desc = random.choice(business_contexts)
            
            writer.writerow([col, dtype, is_key, desc])
            
            if (i + 1) % 20000 == 0:
                print(f"  - Progress: {i + 1} samples generated...")

    print(f"\n[SUCCESS] Dataset Saved: {os.path.abspath(OUTPUT_FILE)}")
    print(f"[INFO] Size: {os.path.getsize(OUTPUT_FILE) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    generate()
