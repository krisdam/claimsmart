from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle
import os

app = Flask(__name__)
CORS(app)

# Load model and feature columns
model = pickle.load(open('models/claim_model.pkl', 'rb'))
feature_columns = pickle.load(open('models/feature_columns.pkl', 'rb'))

@app.route('/')
def home():
    return jsonify({"message": "ClaimSmart API is running!"})

@app.route('/api/test')
def test():
    return jsonify({"status": "API working", "model_loaded": True})

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Check if a file was uploaded
        if 'file' in request.files:
            file = request.files['file']
            df = pd.read_csv(file)
        else:
            # Fall back to default test data
            df = pd.read_csv('data/test_data.csv')

        # Prepare features
    # One-hot encode categorical columns
        categorical_cols = ['procedure_code', 'denial_reason', 'provider_specialty']
        existing_cats = [col for col in categorical_cols if col in df.columns]
        if existing_cats:
            df = pd.get_dummies(df, columns=existing_cats)
        
        # Align columns with training data
        for col in feature_columns:
            if col not in df.columns:
                df[col] = 0
        X = df[feature_columns]
        
        # Get predictions
        probabilities = model.predict_proba(X)[:, 1]
        df['success_probability'] = probabilities
        df['predicted_recovery'] = df['billed_amount'] * df['success_probability']
        
        # Filter recommended appeals (>50% success probability)
        recommended = df[df['success_probability'] > 0.5].copy()
        recommended = recommended.sort_values('predicted_recovery', ascending=False)
        
        # Top 5
        top_5 = recommended.head(5)
        
        top_5_list = []
        for _, row in top_5.iterrows():
            top_5_list.append({
                'claim_id': row['claim_id'],
                'billed_amount': round(float(row['billed_amount']), 2),
                'success_probability': round(float(row['success_probability']), 4),
                'predicted_recovery': round(float(row['predicted_recovery']), 2)
            })
        
        return jsonify({
            'total_claims': len(df),
            'recommended_appeals': len(recommended),
            'total_estimated_recovery': round(float(recommended['predicted_recovery'].sum()), 2),
            'avg_success_probability': round(float(recommended['success_probability'].mean()), 4),
            'top_5_appeals': top_5_list
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)