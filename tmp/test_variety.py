import sys
import os
import hashlib

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__name__), 'backend')))

from services.ai_agent.universal_patterns import UniversalPatternEngine

def test_variety():
    engine = UniversalPatternEngine()
    
    # Simulate a table with multiple generic columns
    table_name = "raw_data_log"
    columns = ["attr_1", "attr_2", "attr_3", "val_x", "val_y", "info_z"]
    
    print(f"--- Testing Variety for table: {table_name} ---")
    
    meanings = set()
    for col in columns:
        # These should all hit the catch-all pattern
        context = engine.analyze_column(col, "varchar")
        print(f"Col: {col:<10} | Meaning: {context.business_meaning}")
        meanings.add(context.business_meaning)
    
    if len(meanings) > 1:
        print(f"\nSUCCESS: Generated {len(meanings)} unique meanings for {len(columns)} generic columns.")
    else:
        print("\nFAILURE: All columns share the same meaning.")

if __name__ == "__main__":
    test_variety()
