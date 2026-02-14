import React, { useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const analyzeClaimsData = async (file) => {
    setLoading(true);
    setError(null);
    try {
      let options;
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        options = { method: 'POST', body: formData };
      } else {
        options = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        };
      }
      const response = await fetch('https://claimsmart-api.onrender.com/api/predict', options);
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError('Could not connect to the API. Make sure Flask is running on port 5000.');
    }
    setLoading(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      analyzeClaimsData(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      analyzeClaimsData(file);
    }
  };

  const downloadCSV = () => {
    if (!results) return;
    const headers = 'Claim ID,Billed Amount,Success Probability,Predicted Recovery\n';
    const rows = results.top_5_appeals.map(c =>
      `${c.claim_id},${c.billed_amount},${(c.success_probability * 100).toFixed(1)}%,$${c.predicted_recovery.toFixed(2)}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claimsmart_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getBarColor = (probability) => {
    if (probability >= 0.75) return '#16a34a';
    if (probability >= 0.5) return '#ca8a04';
    return '#dc2626';
  };

  const totalRecovery = results
    ? results.total_estimated_recovery || results.top_5_appeals.reduce((sum, c) => sum + c.predicted_recovery, 0)
    : 0;

  const avgProbability = results
    ? results.avg_success_probability || results.top_5_appeals.reduce((sum, c) => sum + c.success_probability, 0) / results.top_5_appeals.length
    : 0;

  const pieData = results
    ? [
        { name: 'Recommend Appeal', value: results.recommended_appeals, fill: '#16a34a' },
        { name: 'Do Not Appeal', value: results.total_claims - results.recommended_appeals, fill: '#e5e7eb' }
      ]
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white py-6 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">ClaimSmart</h1>
            <p className="text-blue-200 mt-1">AI-Powered Insurance Claim Appeal Optimizer</p>
          </div>
          {results && (
            <button
              onClick={downloadCSV}
              className="bg-white text-blue-700 font-semibold py-2 px-6 rounded-lg hover:bg-blue-50 transition text-sm"
            >
              Export Results CSV
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Get Started</h2>
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <button
              onClick={() => analyzeClaimsData(null)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow disabled:opacity-50 transition"
            >
              {loading ? 'Analyzing...' : 'Use Sample Data'}
            </button>

            <div className="flex-1 w-full">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <svg className="mx-auto h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-gray-600 font-medium">
                  {fileName ? `Uploaded: ${fileName}` : 'Drag & drop a CSV file here, or click to browse'}
                </p>
                <p className="text-gray-400 text-sm mt-1">Supports .csv files with claims data</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="ml-4 text-gray-600 font-medium">Analyzing claims...</p>
          </div>
        )}

        {results && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-500 text-sm">Total Claims</p>
                <p className="text-3xl font-bold text-gray-800">{results.total_claims}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-500 text-sm">Recommended Appeals</p>
                <p className="text-3xl font-bold text-green-600">{results.recommended_appeals}</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-500 text-sm">Avg Success Rate</p>
                <p className="text-3xl font-bold text-blue-600">{(avgProbability * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-xl shadow p-6">
                <p className="text-gray-500 text-sm">Total Est. Recovery</p>
                <p className="text-3xl font-bold text-purple-600">${totalRecovery.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Top 5 — Success Probability</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={results.top_5_appeals}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="claim_id" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                    <Tooltip formatter={(v) => `${(v * 100).toFixed(1)}%`} />
                    <Bar dataKey="success_probability" radius={[6, 6, 0, 0]}>
                      {results.top_5_appeals.map((entry, index) => (
                        <Cell key={index} fill={getBarColor(entry.success_probability)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Appeal Recommendation Breakdown</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Top 5 Recommended Appeals</h2>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Billed Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Success Probability</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Predicted Recovery</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.top_5_appeals.map((claim) => (
                    <tr key={claim.claim_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{claim.claim_id}</td>
                      <td className="px-6 py-4 text-gray-700">${claim.billed_amount.toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-sm font-semibold ${
                          claim.success_probability >= 0.75
                            ? 'bg-green-100 text-green-800'
                            : claim.success_probability >= 0.5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {(claim.success_probability * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">${claim.predicted_recovery.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      <footer className="text-center text-gray-400 text-sm py-6 mt-8 border-t">
        ClaimSmart © 2025 — Built by Krishna Damaraju
      </footer>
    </div>
  );
}

export default App;