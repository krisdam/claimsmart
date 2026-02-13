import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import pickle

def train_model():
    """Train Random Forest model"""
    
    # Load data
    df = pd.read_csv('data/training_data.csv')
    print(f"Loaded {len(df)} claims")
    print(f"Success rate: {df['appeal_successful'].mean():.2%}\n")
    
    # One-hot encode categorical variables
    df_encoded = pd.get_dummies(df, columns=['procedure_code', 'denial_reason', 'provider_specialty'])
    
    # Define features and target
    feature_cols = [col for col in df_encoded.columns if col not in ['claim_id', 'appeal_successful']]
    X = df_encoded[feature_cols]
    y = df_encoded['appeal_successful']
    
    # Split data
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print(f"Training set: {len(X_train)} claims")
    print(f"Validation set: {len(X_val)} claims\n")
    
    # Train model
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_val)
    
    accuracy = accuracy_score(y_val, y_pred)
    precision = precision_score(y_val, y_pred)
    recall = recall_score(y_val, y_pred)
    f1 = f1_score(y_val, y_pred)
    
    print("\n=== Model Performance ===")
    print(f"Accuracy:  {accuracy:.1%}")
    print(f"Precision: {precision:.1%}")
    print(f"Recall:    {recall:.1%}")
    print(f"F1 Score:  {f1:.1%}")
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_cols,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nTop 10 Important Features:")
    for idx, row in feature_importance.head(10).iterrows():
        print(f"  {row['feature']}: {row['importance']:.3f}")
    
    # Save model
    with open('models/claim_model.pkl', 'wb') as f:
        pickle.dump(model, f)
    
    with open('models/feature_columns.pkl', 'wb') as f:
        pickle.dump(feature_cols, f)
    
    print("\n✓ Model saved to models/claim_model.pkl")
    
    return model, feature_cols

if __name__ == '__main__':
    train_model()