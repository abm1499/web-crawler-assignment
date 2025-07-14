import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import {
  Search,
  Plus,
  Play,
  Square,
  Eye,
  Trash2,
  RotateCcw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// Enhanced mock data with more realistic examples
const mockCrawlResults = [
  {
    id: 1,
    url: "https://example.com",
    title: "Example Domain",
    status: "completed" as const,
    htmlVersion: "HTML5",
    internalLinks: 0,
    externalLinks: 1,
    brokenLinks: 0,
    hasLoginForm: false,
    createdAt: "2025-01-15T10:30:00Z",
    headingCounts: { h1: 1, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
  },
  {
    id: 2,
    url: "https://github.com",
    title:
      "GitHub: Build and ship software on a single, collaborative platform",
    status: "completed" as const,
    htmlVersion: "HTML5",
    internalLinks: 45,
    externalLinks: 12,
    brokenLinks: 0,
    hasLoginForm: true,
    createdAt: "2025-01-15T11:00:00Z",
    headingCounts: { h1: 2, h2: 8, h3: 12, h4: 6, h5: 1, h6: 0 },
  },
  {
    id: 3,
    url: "https://stackoverflow.com",
    title: "Stack Overflow - Where Developers Learn, Share, & Build Careers",
    status: "completed" as const,
    htmlVersion: "HTML5",
    internalLinks: 156,
    externalLinks: 23,
    brokenLinks: 2,
    hasLoginForm: true,
    createdAt: "2025-01-15T11:15:00Z",
    headingCounts: { h1: 1, h2: 5, h3: 18, h4: 12, h5: 3, h6: 1 },
  },
  {
    id: 4,
    url: "https://processing.example.com",
    title: "Processing...",
    status: "running" as const,
    htmlVersion: "",
    internalLinks: 0,
    externalLinks: 0,
    brokenLinks: 0,
    hasLoginForm: false,
    createdAt: "2025-01-15T11:30:00Z",
    headingCounts: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
  },
  {
    id: 5,
    url: "https://broken-site.example",
    title: "",
    status: "error" as const,
    htmlVersion: "",
    internalLinks: 0,
    externalLinks: 0,
    brokenLinks: 0,
    hasLoginForm: false,
    createdAt: "2025-01-15T12:00:00Z",
    headingCounts: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
  },
];

type CrawlResult = (typeof mockCrawlResults)[0];

function App() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<keyof CrawlResult>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [newUrl, setNewUrl] = useState("");
  const [currentView, setCurrentView] = useState<"dashboard" | "detail">(
    "dashboard"
  );
  const [selectedResult, setSelectedResult] = useState<CrawlResult | null>(
    null
  );

  const itemsPerPage = 10;

  // Filter and sort results
  const filteredAndSortedResults = useMemo(() => {
    let filtered = mockCrawlResults.filter((result) => {
      const matchesSearch =
        result.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || result.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [searchTerm, statusFilter, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedResults = filteredAndSortedResults.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedResults.map((result) => result.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectResult = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  const handleSort = (column: keyof CrawlResult) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getStatusBadge = (status: CrawlResult["status"]) => {
    const statusConfig = {
      queued: { label: "Queued", className: "bg-yellow-100 text-yellow-800" },
      running: { label: "Running", className: "bg-blue-100 text-blue-800" },
      completed: {
        label: "Completed",
        className: "bg-green-100 text-green-800",
      },
      error: { label: "Error", className: "bg-red-100 text-red-800" },
    };

    const config = statusConfig[status];
    return (
      <span
        className={`px-2 py-1 rounded-md text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    );
  };

  const handleAddUrl = () => {
    if (newUrl.trim()) {
      console.log("Would add URL:", newUrl);
      setNewUrl("");
    }
  };

  const handleViewDetails = (result: CrawlResult) => {
    setSelectedResult(result);
    setCurrentView("detail");
  };

  const handleBackToDashboard = () => {
    setSelectedResult(null);
    setCurrentView("dashboard");
  };

  // Calculate stats for overview
  const stats = {
    total: mockCrawlResults.length,
    completed: mockCrawlResults.filter((r) => r.status === "completed").length,
    running: mockCrawlResults.filter((r) => r.status === "running").length,
    errors: mockCrawlResults.filter((r) => r.status === "error").length,
  };

  if (currentView === "detail" && selectedResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="outline" onClick={handleBackToDashboard}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {selectedResult.title}
              </h2>
              <p className="text-slate-600">{selectedResult.url}</p>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  HTML Version
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedResult.htmlVersion || "N/A"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {selectedResult.internalLinks + selectedResult.externalLinks}
                </div>
                <p className="text-xs text-gray-500">
                  {selectedResult.internalLinks} internal,{" "}
                  {selectedResult.externalLinks} external
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Broken Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {selectedResult.brokenLinks}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Login Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {selectedResult.hasLoginForm ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="text-green-600 font-medium">
                        Present
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-600">Not Found</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mock chart placeholders */}
            <Card>
              <CardHeader>
                <CardTitle>Links Distribution</CardTitle>
                <CardDescription>
                  Internal vs External links breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Chart visualization</p>
                    <p className="text-sm text-gray-400">
                      Will be implemented with Recharts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Heading Structure</CardTitle>
                <CardDescription>Distribution of heading tags</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(selectedResult.headingCounts).map(
                    ([level, count]) => (
                      <div
                        key={level}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium">
                          {level.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-600">{count}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">
            Web Crawler Assignment
          </h1>
          <p className="text-slate-600 text-lg">
            Full-stack application built in 8 hours • React + TypeScript + Go +
            MySQL
          </p>
          <p className="text-slate-500 text-sm mt-1">
            Technical assessment project by Ammar
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Total URLs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.completed}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Running
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.running}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.errors}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* URL Manager */}
        <Card className="shadow-lg border-0 bg-white mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Globe className="h-5 w-5 text-blue-600" />
              Add Website for Analysis
            </CardTitle>
            <CardDescription>
              Enter a website URL to crawl and analyze its structure, links, and
              content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <input
                type="url"
                placeholder="https://example.com"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleAddUrl}>
                <Plus className="mr-2 h-4 w-4" />
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-xl">Analysis Results</CardTitle>

              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    placeholder="Search URLs or titles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-3 py-2 border border-gray-300 rounded-md w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-40"
                >
                  <option value="all">All Status</option>
                  <option value="queued">Queued</option>
                  <option value="running">Running</option>
                  <option value="completed">Completed</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded-lg">
                <span className="text-sm text-blue-700">
                  {selectedIds.length} item(s) selected
                </span>
                <Button size="sm" variant="outline" className="ml-auto">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Re-run
                </Button>
                <Button size="sm" variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3">
                      <input
                        type="checkbox"
                        checked={
                          selectedIds.length === paginatedResults.length &&
                          paginatedResults.length > 0
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("url")}
                        className="font-semibold"
                      >
                        URL <ArrowUpDown className="ml-1 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("title")}
                        className="font-semibold"
                      >
                        Title <ArrowUpDown className="ml-1 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="text-left p-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("htmlVersion")}
                        className="font-semibold"
                      >
                        HTML Version <ArrowUpDown className="ml-1 h-4 w-4" />
                      </Button>
                    </th>
                    <th className="text-left p-3">Internal Links</th>
                    <th className="text-left p-3">External Links</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.map((result) => (
                    <tr
                      key={result.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(result.id)}
                          onChange={(e) =>
                            handleSelectResult(result.id, e.target.checked)
                          }
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="p-3">
                        <div className="max-w-xs truncate text-blue-600">
                          {result.url}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="max-w-xs truncate font-medium">
                          {result.title || "Untitled"}
                        </div>
                      </td>
                      <td className="p-3">{result.htmlVersion || "-"}</td>
                      <td className="p-3">{result.internalLinks}</td>
                      <td className="p-3">{result.externalLinks}</td>
                      <td className="p-3">{getStatusBadge(result.status)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {result.status === "queued" && (
                            <Button size="sm" variant="outline">
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {result.status === "running" && (
                            <Button size="sm" variant="outline">
                              <Square className="h-4 w-4" />
                            </Button>
                          )}
                          {result.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(result)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">
                  Showing {startIndex + 1}-
                  {Math.min(
                    startIndex + itemsPerPage,
                    filteredAndSortedResults.length
                  )}{" "}
                  of {filteredAndSortedResults.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {filteredAndSortedResults.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {mockCrawlResults.length === 0
                  ? "No URLs analyzed yet"
                  : "No results match your filters"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default App;
