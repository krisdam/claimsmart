from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import pickle

app = Flask(__name__)
CORS(app)

# Load model at startup
with open('models/claim_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('models/feature_columns.pkl', 'rb') as f:
    feature_columns = pickle.load(f)

@app.route('/')
def home():
    return jsonify({
        'message': 'ClaimSmart API v1.0',
        'status': 'running',
        'model_loaded': True
    })

@app.route('/api/test')
def test():
    return jsonify({
        'message': 'API is working!',
        'features_count': len(feature_columns)
    })

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        # Get data from request
        data = request.get_json()
        
        # Example: predict on test data
        test_df = pd.read_csv('data/test_data.csv')
        
        # Prepare features
        df_encoded = pd.get_dummies(test_df, columns=['procedure_code', 'denial_reason', 'provider_specialty'])
        
        # Ensure all feature columns exist
        for col in feature_columns:
            if col not in df_encoded.columns:
                df_encoded[col] = 0
        
        X = df_encoded[feature_columns]
        
        # Make predictions
        predictions = model.predict(X)
        probabilities = model.predict_proba(X)[:, 1]
        
        # Get top 5 recommendations
        test_df['success_probability'] = probabilities
        test_df['predicted_recovery'] = test_df['billed_amount'] * probabilities
        top_5 = test_df.nlargest(5, 'predicted_recovery')
        
        return jsonify({
            'total_claims': len(test_df),
            'recommended_appeals': int(predictions.sum()),
            'top_5_appeals': top_5[['claim_id', 'billed_amount', 'success_probability', 'predicted_recovery']].to_dict('records')
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(debug=True, port=5000)