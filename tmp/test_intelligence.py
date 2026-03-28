import sys
import os

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__name__), 'backend')))

from services.ai_agent.domain_classifier import UniversalDomainClassifier
from services.ai_agent.context_generator import IntelligentContextGenerator

def test_intelligence():
    classifier = UniversalDomainClassifier()
    generator = IntelligentContextGenerator()
    
    # Test Cases
    test_suites = [
        {
            'name': 'Blockchain / Ethereum Dataset',
            'tables': [{'name': 'eth_txns', 'columns': [
                {'name': 'txn_hash', 'type': 'VARCHAR'},
                {'name': 'from_addr', 'type': 'VARCHAR'},
                {'name': 'wei_amt', 'type': 'BIGINT'},
                {'name': 'gas_used', 'type': 'INTEGER'}
            ]}],
            'samples': {'eth_txns': {
                'txn_hash': ['0x7a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b'],
                'from_addr': ['0x742d35Cc6634C0532925a3b8D0Ac9E5F8181c000'],
                'wei_amt': ['1500000000000000000'],
                'gas_used': ['21000']
            }},
            'inferred': {'eth_txns': {
                'txn_hash': 'Transaction Hash',
                'from_addr': 'Blockchain Address',
                'wei_amt': 'Network Fee (Gas)',
                'gas_used': 'Network Fee (Gas)'
            }}
        },
        {
            'name': 'Aerospace Telemetry',
            'tables': [{'name': 'flt_telm', 'columns': [
                {'name': 'v2_kts', 'type': 'INTEGER'},
                {'name': 'alt_ft', 'type': 'FLOAT'},
                {'name': 'mach_num', 'type': 'FLOAT'}
            ]}],
            'samples': {'flt_telm': {
                'v2_kts': ['172'], 
                'alt_ft': ['41000.0'],
                'mach_num': ['0.825']
            }},
            'inferred': {'flt_telm': {
                'v2_kts': 'Airspeed',
                'alt_ft': 'Altitude',
                'mach_num': 'Airspeed'
            }}
        },
        {
            'name': 'IoT / Environmental Advanced',
            'tables': [{'name': 'sensor_grid', 'columns': [
                {'name': 'rssi_dbm', 'type': 'INTEGER'},
                {'name': 'co2_ppm', 'type': 'FLOAT'},
                {'name': 'turb_ntu', 'type': 'FLOAT'}
            ]}],
            'samples': {'sensor_grid': {
                'rssi_dbm': ['-89'], 
                'co2_ppm': ['412.5'],
                'turb_ntu': ['2.1']
            }},
            'inferred': {'sensor_grid': {
                'rssi_dbm': 'Signal Strength',
                'co2_ppm': 'Particulate Matter',
                'turb_ntu': 'Turbidity'
            }}
        }
    ]
    
    for suite in test_suites:
        print(f"\n--- Testing: {suite['name']} ---")
        analysis = classifier.classify_schema(suite['tables'])
        
        context = generator.generate_comprehensive_context(
            suite['tables'], 
            sample_data=suite['samples'],
            inferred_types=suite.get('inferred')
        )
        
        table_context_map = {t.name: t for t in context.tables}
        
        for table in suite['tables']:
            table_name = table['name']
            print(f"Detected Domain: {analysis.primary_domain} ({analysis.confidence:.2f})")
            print(f"Industry: {analysis.industry_vertical}")
            
            orig_columns = table['columns']
            col_contexts = context.columns[table_name]
            
            for orig_col, ctx in zip(orig_columns, col_contexts):
                print(f"  Col: {orig_col['name']:<15} | Meaning: {ctx.business_meaning}")

if __name__ == "__main__":
    test_intelligence()
