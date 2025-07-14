import React from "react";

// Mock data for initial development
const mockData = [
  {
    id: 1,
    url: "https://example.com",
    title: "Example Domain",
    status: "completed",
    htmlVersion: "HTML5",
    internalLinks: 0,
    externalLinks: 1,
  },
  {
    id: 2,
    url: "https://github.com",
    title: "GitHub",
    status: "completed",
    htmlVersion: "HTML5",
    internalLinks: 45,
    externalLinks: 12,
  },
];

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">
          Web Crawler Assignment
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          Full-stack application to analyze websites for HTML version, internal
          and external links.
        </p>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            Add Website for Analysis
          </h2>
          <div className="flex gap-3">
            <input
              type="url"
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            />
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Analyze
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Analysis Results</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4">URL</th>
                  <th className="text-left p-4">Title</th>
                  <th className="text-left p-4">HTML Version</th>
                  <th className="text-left p-4">Internal Links</th>
                  <th className="text-left p-4">External Links</th>
                  <th className="text-left p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockData.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 text-blue-600">{item.url}</td>
                    <td className="p-4 font-medium">{item.title}</td>
                    <td className="p-4">{item.htmlVersion}</td>
                    <td className="p-4">{item.internalLinks}</td>
                    <td className="p-4">{item.externalLinks}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
