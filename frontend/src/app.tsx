// frontend/src/App.tsx
import React, { useState, useMemo, useEffect } from "react";
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
  Lock,
  Loader2,
} from "lucide-react";
import ApiService, {
  URLResponse,
  URLDetailResponse,
  BrokenLink,
} from "./services/api";

// Transform backend data to frontend format
interface CrawlResult {
  id: number;
  url: string;
  title: string;
  status: "queued" | "running" | "completed" | "error";
  htmlVersion: string;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  hasLoginForm: boolean;
  createdAt: string;
  headingCounts: {
    h1: number;
    h2: number;
    h3: number;
    h4: number;
    h5: number;
    h6: number;
  };
  errorMessage?: string;
}

const transformBackendData = (data: URLResponse): CrawlResult => ({
  id: data.id,
  url: data.url,
  title: data.title || "Untitled",
  status: data.status === "done" ? "completed" : data.status,
  htmlVersion: data.html_version || "",
  internalLinks: data.internal_links || 0,
  externalLinks: data.external_links || 0,
  brokenLinks: data.inaccessible_links || 0,
  hasLoginForm: data.has_login_form || false,
  createdAt: data.created_at,
  headingCounts: {
    h1: data.h1_count || 0,
    h2: data.h2_count || 0,
    h3: data.h3_count || 0,
    h4: data.h4_count || 0,
    h5: data.h5_count || 0,
    h6: data.h6_count || 0,
  },
  errorMessage: data.error_message,
});

// Login Component
const LoginForm = ({ onLogin }: { onLogin: () => void }) => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("password");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await ApiService.login(username, password);
      onLogin();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Lock className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Web Crawler Assignment</CardTitle>
          <CardDescription>
            Demo authentication for technical assessment project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
          <div className="mt-4 text-sm text-gray-600 text-center">
            <p>Demo credentials:</p>
            <p>
              <strong>Username:</strong> admin
            </p>
            <p>
              <strong>Password:</strong> password
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [crawlResults, setCrawlResults] = useState<CrawlResult[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<keyof CrawlResult>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [newUrl, setNewUrl] = useState("");
  const [currentView, setCurrentView] = useState<"dashboard" | "detail">(
    "dashboard"
  );
  const [selectedResult, setSelectedResult] = useState<CrawlResult | null>(
    null
  );
  const [selectedResultDetail, setSelectedResultDetail] =
    useState<URLDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUrlLoading, setIsUrlLoading] = useState(false);

  const itemsPerPage = 10;

  // Check authentication on mount
  useEffect(() => {
    const token = ApiService.getToken();
    if (token) {
      setIsAuthenticated(true);
    }
    setIsCheckingAuth(false);
  }, []);

  // Fetch URLs when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUrls();
      // Set up polling for real-time updates
      const interval = setInterval(fetchUrls, 5000);
      return () => clearInterval(interval);
    }
  }, [
    isAuthenticated,
    currentPage,
    searchTerm,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchUrls = async () => {
    try {
      const response = await ApiService.getUrls({
        page: currentPage,
        page_size: itemsPerPage,
        sort: sortBy === "createdAt" ? "created_at" : sortBy,
        order: sortOrder,
        search: searchTerm || undefined,
        filter: statusFilter !== "all" ? statusFilter : undefined,
      });

      const transformedData = response.data.map(transformBackendData);
      setCrawlResults(transformedData);
      setTotalResults(response.total);
      setTotalPages(response.total_pages);
    } catch (error) {
      console.error("Failed to fetch URLs:", error);
      // Don't show error for auth issues - handled in handleResponse
      if (
        !(error instanceof Error && error.message.includes("Authentication"))
      ) {
        // Could add a toast notification here
      }
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    ApiService.clearToken();
    setIsAuthenticated(false);
    setCrawlResults([]);
    setSelectedResult(null);
    setCurrentView("dashboard");
  };

  const handleAddUrl = async () => {
    if (!newUrl.trim()) return;

    setIsUrlLoading(true);
    try {
      console.log("Adding URL:", newUrl);
      const response = await ApiService.addUrl(newUrl);
      console.log("URL added:", response);
      setNewUrl("");

      // Start crawling immediately if we got a valid response
      if (response && response.id) {
        setTimeout(async () => {
          try {
            console.log("Starting crawl for ID:", response.id);
            await ApiService.startCrawling(response.id);
            fetchUrls();
          } catch (error) {
            console.error("Failed to start crawling:", error);
          }
        }, 1000);
      }

      fetchUrls();
    } catch (error) {
      console.error("Failed to add URL:", error);
      alert(
        "Failed to add URL: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    } finally {
      setIsUrlLoading(false);
    }
  };

  const handleStartCrawl = async (id: number) => {
    try {
      await ApiService.startCrawling(id);
      fetchUrls();
    } catch (error) {
      console.error("Failed to start crawling:", error);
    }
  };

  const handleStopCrawl = async (id: number) => {
    try {
      await ApiService.stopCrawling(id);
      fetchUrls();
    } catch (error) {
      console.error("Failed to stop crawling:", error);
    }
  };

  const handleBulkAction = async (action: "delete" | "rerun") => {
    if (selectedIds.length === 0) return;

    try {
      await ApiService.bulkAction(selectedIds, action);
      setSelectedIds([]);
      fetchUrls();
    } catch (error) {
      console.error(`Failed to ${action} URLs:`, error);
    }
  };

  const handleViewDetails = async (result: CrawlResult) => {
    try {
      setIsLoading(true);
      const detailResponse = await ApiService.getUrlDetails(result.id);
      setSelectedResult(result);
      setSelectedResultDetail(detailResponse);
      setCurrentView("detail");
    } catch (error) {
      console.error("Failed to fetch URL details:", error);
      setSelectedResult(result);
      setSelectedResultDetail(null);
      setCurrentView("detail");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort results (server-side now)
  const filteredAndSortedResults = crawlResults;
  const paginatedResults = filteredAndSortedResults;

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

  const handleBackToDashboard = () => {
    setSelectedResult(null);
    setSelectedResultDetail(null);
    setCurrentView("dashboard");
  };

  // Calculate stats
  const stats = {
    total: totalResults,
    completed: crawlResults.filter((r) => r.status === "completed").length,
    running: crawlResults.filter((r) => r.status === "running").length,
    errors: crawlResults.filter((r) => r.status === "error").length,
  };

  // Show loading screen while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return <LoginForm onLogin={handleLogin} />;
  }

  // Detail view
  if (currentView === "detail" && selectedResult) {
    const brokenLinks = selectedResultDetail?.broken_links || [];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
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
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
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
                  {brokenLinks.length}
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
            {/* Chart placeholder */}
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
                    <p className="text-gray-500">
                      {selectedResult.internalLinks} internal,{" "}
                      {selectedResult.externalLinks} external
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

          {/* Broken Links */}
          {brokenLinks.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Broken Links ({brokenLinks.length})
                </CardTitle>
                <CardDescription>
                  Links that returned error status codes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {brokenLinks.map((link, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-red-600 text-white rounded text-xs font-medium">
                          {link.status_code}
                        </span>
                        <span className="text-sm font-mono">
                          {link.link_url}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Web Crawler Assignment
            </h1>
            <p className="text-slate-600 text-lg">
              Full-stack application built in 8 hours • React + TypeScript + Go
              + MySQL
            </p>
            <p className="text-slate-500 text-sm mt-1">
              Technical assessment project by Ammar
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
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
                onKeyPress={(e) => e.key === "Enter" && handleAddUrl()}
                disabled={isUrlLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleAddUrl} disabled={isUrlLoading}>
                {isUrlLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Analyze
                  </>
                )}
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
                  <option value="done">Completed</option>
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
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto"
                  onClick={() => handleBulkAction("rerun")}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Re-run
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction("delete")}
                >
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
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartCrawl(result.id)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {result.status === "running" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStopCrawl(result.id)}
                            >
                              <Square className="h-4 w-4" />
                            </Button>
                          )}
                          {result.status === "completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewDetails(result)}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
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
                  Showing page {currentPage} of {totalPages} ({totalResults}{" "}
                  total results)
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
                {crawlResults.length === 0
                  ? "No URLs analyzed yet"
                  : "No results match your filters"}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-gray-500">
          <p>✅ Full-stack integration complete • Live data from Go backend</p>
          <p className="text-sm">
            Features: JWT Auth, Real-time polling, API integration, Error
            handling
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
