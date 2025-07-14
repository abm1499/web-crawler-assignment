package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/net/html"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

// Database Models
type URL struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	URL         string    `json:"url" gorm:"unique;not null"`
	Title       string    `json:"title"`
	HTMLVersion string    `json:"html_version"`
	Status      string    `json:"status" gorm:"default:'queued'"` // queued, running, done, error
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Analysis results - will be populated by crawler
	H1Count           int    `json:"h1_count"`
	H2Count           int    `json:"h2_count"`
	H3Count           int    `json:"h3_count"`
	H4Count           int    `json:"h4_count"`
	H5Count           int    `json:"h5_count"`
	H6Count           int    `json:"h6_count"`
	InternalLinks     int    `json:"internal_links"`
	ExternalLinks     int    `json:"external_links"`
	InaccessibleLinks int    `json:"inaccessible_links"`
	HasLoginForm      bool   `json:"has_login_form"`
	ErrorMessage      string `json:"error_message"`
}

type BrokenLink struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	URLID      uint      `json:"url_id"`
	URL        *URL      `json:"url" gorm:"foreignKey:URLID"`
	LinkURL    string    `json:"link_url"`
	StatusCode int       `json:"status_code"`
	CreatedAt  time.Time `json:"created_at"`
}

// Request/Response types
type CrawlRequest struct {
	URL string `json:"url" binding:"required"`
}

type BulkActionRequest struct {
	URLIDs []uint `json:"url_ids" binding:"required"`
	Action string `json:"action" binding:"required"` // delete, rerun
}

type PaginationRequest struct {
	Page     int    `json:"page" form:"page"`
	PageSize int    `json:"page_size" form:"page_size"`
	Sort     string `json:"sort" form:"sort"`
	Order    string `json:"order" form:"order"`
	Search   string `json:"search" form:"search"`
	Filter   string `json:"filter" form:"filter"`
}

type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// Global variables
var db *gorm.DB
var jwtSecret = []byte("your-secret-key-change-in-production")

// JWT Claims
type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// Database connection
func connectDB() {
	// Get database configuration from environment variables
	dbHost := os.Getenv("DB_HOST")
	if dbHost == "" {
		dbHost = "localhost"
	}

	dbPort := os.Getenv("DB_PORT")
	if dbPort == "" {
		dbPort = "3306"
	}

	dbUser := os.Getenv("DB_USER")
	if dbUser == "" {
		dbUser = "root"
	}

	dbPassword := os.Getenv("DB_PASSWORD")
	if dbPassword == "" {
		dbPassword = "password"
	}

	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "webcrawler"
	}

	// Create DSN
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	log.Printf("Attempting to connect to database at %s:%s", dbHost, dbPort)

	// Try to connect, if database doesn't exist, create it
	createDBDSN := fmt.Sprintf("%s:%s@tcp(%s:%s)/", dbUser, dbPassword, dbHost, dbPort)
	if sqlDB, err := sql.Open("mysql", createDBDSN); err == nil {
		sqlDB.Exec("CREATE DATABASE IF NOT EXISTS " + dbName)
		sqlDB.Close()
	}

	var err error
	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		log.Println("Note: Make sure MySQL is running for full functionality")
		// Continue without database for development
		return
	}

	// Auto migrate
	db.AutoMigrate(&URL{}, &BrokenLink{})

	log.Println("Database connected successfully")
}

// JWT Middleware
func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Remove Bearer prefix
		if strings.HasPrefix(tokenString, "Bearer ") {
			tokenString = strings.TrimPrefix(tokenString, "Bearer ")
		}

		token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		if claims, ok := token.Claims.(*Claims); ok {
			c.Set("user_id", claims.UserID)
			c.Set("username", claims.Username)
		}

		c.Next()
	}
}

// Generate JWT Token
func generateToken(userID uint, username string) (string, error) {
	claims := &Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// Auth endpoints
func login(c *gin.Context) {
	// Simple login for demo - in production, validate against user database
	var loginReq struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Demo credentials - in production, hash passwords and check against database
	if loginReq.Username == "admin" && loginReq.Password == "password" {
		token, err := generateToken(1, loginReq.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"token":    token,
			"username": loginReq.Username,
		})
		return
	}

	c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
}

// Web Crawling Engine
func crawlURL(urlStr string) (*URL, []BrokenLink, error) {
	// Find existing URL record instead of creating a new one
	var urlRecord URL
	if err := db.Where("url = ?", urlStr).First(&urlRecord).Error; err != nil {
		// If URL doesn't exist, create it
		urlRecord = URL{
			URL:    urlStr,
			Status: "running",
		}
		if err := db.Create(&urlRecord).Error; err != nil {
			return nil, nil, fmt.Errorf("failed to save URL: %w", err)
		}
	} else {
		// Update existing record to running status
		urlRecord.Status = "running"
		db.Save(&urlRecord)
	}

	log.Printf("Starting to crawl URL: %s (ID: %d)", urlStr, urlRecord.ID)

	// Fetch the page
	resp, err := http.Get(urlStr)
	if err != nil {
		urlRecord.Status = "error"
		urlRecord.ErrorMessage = err.Error()
		db.Save(&urlRecord)
		log.Printf("Failed to fetch URL %s: %v", urlStr, err)
		return &urlRecord, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		urlRecord.Status = "error"
		urlRecord.ErrorMessage = fmt.Sprintf("HTTP %d", resp.StatusCode)
		db.Save(&urlRecord)
		log.Printf("HTTP error for URL %s: %d", urlStr, resp.StatusCode)
		return &urlRecord, nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	// Parse HTML
	doc, err := html.Parse(resp.Body)
	if err != nil {
		urlRecord.Status = "error"
		urlRecord.ErrorMessage = "Failed to parse HTML"
		db.Save(&urlRecord)
		log.Printf("Failed to parse HTML for URL %s: %v", urlStr, err)
		return &urlRecord, nil, err
	}

	log.Printf("Successfully parsed HTML for URL: %s", urlStr)

	// Reset counters before analysis
	urlRecord.H1Count = 0
	urlRecord.H2Count = 0
	urlRecord.H3Count = 0
	urlRecord.H4Count = 0
	urlRecord.H5Count = 0
	urlRecord.H6Count = 0
	urlRecord.InternalLinks = 0
	urlRecord.ExternalLinks = 0
	urlRecord.HasLoginForm = false

	// Analyze the document
	analyzeDocument(doc, &urlRecord, urlStr)

	log.Printf("Analysis completed for URL %s: H1=%d, H2=%d, Internal=%d, External=%d",
		urlStr, urlRecord.H1Count, urlRecord.H2Count, urlRecord.InternalLinks, urlRecord.ExternalLinks)

	// Delete existing broken links for this URL
	db.Where("url_id = ?", urlRecord.ID).Delete(&BrokenLink{})

	// Find broken links
	brokenLinks := findBrokenLinks(doc, urlStr, urlRecord.ID)
	urlRecord.InaccessibleLinks = len(brokenLinks)

	log.Printf("Found %d broken links for URL: %s", len(brokenLinks), urlStr)

	// Update status to done
	urlRecord.Status = "done"
	urlRecord.ErrorMessage = "" // Clear any previous errors
	db.Save(&urlRecord)

	log.Printf("Crawling completed successfully for URL: %s", urlStr)

	return &urlRecord, brokenLinks, nil
}

func analyzeDocument(n *html.Node, urlRecord *URL, baseURL string) {
	if n.Type == html.ElementNode {
		switch n.Data {
		case "html":
			// Check for HTML version
			for _, attr := range n.Attr {
				if attr.Key == "version" {
					urlRecord.HTMLVersion = attr.Val
				}
			}
			// Default to HTML5 if no version specified
			if urlRecord.HTMLVersion == "" {
				urlRecord.HTMLVersion = "HTML5"
			}
		case "title":
			if n.FirstChild != nil {
				urlRecord.Title = n.FirstChild.Data
			}
		case "h1":
			urlRecord.H1Count++
		case "h2":
			urlRecord.H2Count++
		case "h3":
			urlRecord.H3Count++
		case "h4":
			urlRecord.H4Count++
		case "h5":
			urlRecord.H5Count++
		case "h6":
			urlRecord.H6Count++
		case "a":
			// Analyze links
			for _, attr := range n.Attr {
				if attr.Key == "href" {
					if isInternalLink(attr.Val, baseURL) {
						urlRecord.InternalLinks++
					} else {
						urlRecord.ExternalLinks++
					}
				}
			}
		case "form":
			// Check for login form
			if hasLoginForm(n) {
				urlRecord.HasLoginForm = true
			}
		}
	}

	// Check DOCTYPE for HTML version
	if n.Type == html.DoctypeNode {
		doctype := strings.ToLower(n.Data)
		if strings.Contains(doctype, "html") {
			if strings.Contains(doctype, "4.01") {
				urlRecord.HTMLVersion = "HTML 4.01"
			} else if strings.Contains(doctype, "xhtml") {
				urlRecord.HTMLVersion = "XHTML"
			} else {
				urlRecord.HTMLVersion = "HTML5"
			}
		}
	}

	// Recursively analyze child nodes
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		analyzeDocument(c, urlRecord, baseURL)
	}
}

func isInternalLink(href, baseURL string) bool {
	if href == "" || strings.HasPrefix(href, "#") {
		return true
	}

	if strings.HasPrefix(href, "/") {
		return true
	}

	linkURL, err := url.Parse(href)
	if err != nil {
		return false
	}

	baseURLParsed, err := url.Parse(baseURL)
	if err != nil {
		return false
	}

	return linkURL.Host == baseURLParsed.Host || linkURL.Host == ""
}

func hasLoginForm(n *html.Node) bool {
	// Check for password input fields
	if n.Type == html.ElementNode && n.Data == "input" {
		for _, attr := range n.Attr {
			if attr.Key == "type" && attr.Val == "password" {
				return true
			}
		}
	}

	// Check for common login form patterns
	for _, attr := range n.Attr {
		if attr.Key == "id" || attr.Key == "class" || attr.Key == "name" {
			val := strings.ToLower(attr.Val)
			if strings.Contains(val, "login") || strings.Contains(val, "signin") || strings.Contains(val, "auth") {
				return true
			}
		}
	}

	// Recursively check child nodes
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if hasLoginForm(c) {
			return true
		}
	}

	return false
}

func findBrokenLinks(n *html.Node, baseURL string, urlID uint) []BrokenLink {
	var brokenLinks []BrokenLink
	var links []string

	// Collect all links
	collectLinks(n, &links)

	// Test each link
	for _, link := range links {
		if link == "" || strings.HasPrefix(link, "#") || strings.HasPrefix(link, "mailto:") || strings.HasPrefix(link, "tel:") {
			continue
		}

		fullURL := resolveURL(link, baseURL)
		if fullURL == "" {
			continue
		}

		// Make HEAD request to check if link is accessible
		client := &http.Client{
			Timeout: 10 * time.Second,
		}

		resp, err := client.Head(fullURL)
		if err != nil {
			// Try GET request if HEAD fails
			resp, err = client.Get(fullURL)
			if err != nil {
				continue
			}
		}

		if resp.StatusCode >= 400 {
			brokenLink := BrokenLink{
				URLID:      urlID,
				LinkURL:    fullURL,
				StatusCode: resp.StatusCode,
			}
			brokenLinks = append(brokenLinks, brokenLink)
			db.Create(&brokenLink)
		}
	}

	return brokenLinks
}

func collectLinks(n *html.Node, links *[]string) {
	if n.Type == html.ElementNode && n.Data == "a" {
		for _, attr := range n.Attr {
			if attr.Key == "href" {
				*links = append(*links, attr.Val)
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		collectLinks(c, links)
	}
}

func resolveURL(href, baseURL string) string {
	if strings.HasPrefix(href, "http://") || strings.HasPrefix(href, "https://") {
		return href
	}

	baseURLParsed, err := url.Parse(baseURL)
	if err != nil {
		return ""
	}

	linkURL, err := url.Parse(href)
	if err != nil {
		return ""
	}

	return baseURLParsed.ResolveReference(linkURL).String()
}

// API Handlers (basic CRUD - no crawling yet)
func addURL(c *gin.Context) {
	var req CrawlRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	// Create URL record (queued status)
	urlRecord := URL{
		URL:    req.URL,
		Status: "queued",
	}

	if err := db.Create(&urlRecord).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save URL"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "URL added successfully",
		"url":     urlRecord,
		"note":    "Crawling functionality will be implemented next",
	})
}

func getURLs(c *gin.Context) {
	if db == nil {
		// Return mock data for development without database
		c.JSON(http.StatusOK, gin.H{
			"data": []gin.H{
				{
					"id":     1,
					"url":    "https://example.com",
					"status": "queued",
					"note":   "Mock data - database not connected",
				},
			},
			"total": 1,
		})
		return
	}

	var urls []URL
	if err := db.Find(&urls).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch URLs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":  urls,
		"total": len(urls),
	})
}

func main() {
	// Connect to database (optional for this stage)
	connectDB()

	// Initialize Gin router
	router := gin.Default()

	// CORS middleware for development
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://localhost:5173", "http://localhost:8081"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Public routes
	router.POST("/login", login)

	// Health check endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"service": "web-crawler-backend",
			"auth":    "implemented",
			"database": func() string {
				if db != nil {
					return "connected"
				}
				return "optional"
			}(),
		})
	})

	// Protected API routes
	api := router.Group("/api")
	api.Use(authMiddleware())
	{
		api.POST("/urls", addURL)
		api.GET("/urls", getURLs)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("Features: JWT Auth ✓, Database Models ✓, Basic CRUD ✓")
	log.Printf("Next: Web crawling engine")
	log.Fatal(router.Run(":" + port))
}
