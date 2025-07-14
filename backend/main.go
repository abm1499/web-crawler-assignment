package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
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
