import pandas as pd
import numpy as np

# Set random seed for reproducibility
np.random.seed(42)

def generate_claims_data(n_claims=1000):
    """Generate synthetic insurance claims data"""
    
    procedure_codes = ['99213', '99214', '99215', '70450', '70553', 
                      '97110', '97112', '20610', '20605', '45378']
    
    denial_reasons = ['Not medically necessary', 'No prior authorization',
                     'Experimental procedure', 'Incorrect coding',
                     'Missing documentation', 'Out of network']
    
    specialties = ['Family Medicine', 'Internal Medicine', 'Orthopedics',
                  'Radiology', 'Physical Therapy', 'Gastroenterology']
    
    claims = []
    
    for i in range(n_claims):
        claim = {
            'claim_id': f'CLM{str(i+1).zfill(5)}',
            'procedure_code': np.random.choice(procedure_codes),
            'billed_amount': np.random.randint(500, 5000),
            'denial_reason': np.random.choice(denial_reasons),
            'days_since_denial': np.random.randint(1, 180),
            'provider_specialty': np.random.choice(specialties),
            'documentation_score': np.random.randint(1, 11),
            'prior_authorization': np.random.choice([0, 1]),
            'patient_age': np.random.randint(18, 85),
        }
        
        # Generate realistic success probability
        success_probability = 0.5
        
        if claim['denial_reason'] == 'Not medically necessary':
            success_probability += 0.2
        elif claim['denial_reason'] == 'Experimental procedure':
            success_probability -= 0.3
        elif claim['denial_reason'] == 'Missing documentation':
            success_probability += 0.15
        
        if claim['documentation_score'] >= 8:
            success_probability += 0.2
        elif claim['documentation_score'] <= 3:
            success_probability -= 0.2
        
        if claim['days_since_denial'] < 30:
            success_probability += 0.1
        elif claim['days_since_denial'] > 120:
            success_probability -= 0.15
        
        if claim['prior_authorization'] == 1:
            success_probability += 0.15
        
        success_probability = max(0, min(1, success_probability))
        claim['appeal_successful'] = 1 if np.random.random() < success_probability else 0
        
        claims.append(claim)
    
    return pd.DataFrame(claims)

if __name__ == '__main__':
    train_df = generate_claims_data(1000)
    train_df.to_csv('data/training_data.csv', index=False)
    print(f"✓ Generated {len(train_df)} training claims")
    print(f"✓ Success rate: {train_df['appeal_successful'].mean():.2%}")
    
    test_df = generate_claims_data(200)
    test_df.to_csv('data/test_data.csv', index=False)
    print(f"✓ Generated {len(test_df)} test claims")
    print("\n✓ Data files created in data/ folder")