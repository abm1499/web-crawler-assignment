# Web Crawler Assignment

A full-stack web crawler application built for technical assessment, demonstrating modern development practices and comprehensive feature implementation.

## Overview

This project demonstrates full-stack development skills through a comprehensive web crawling solution that analyzes website structure, links, and content with real-time monitoring capabilities.

![alt text](/main-dashboard.png)
![alt text](/site-dashboard.png)

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │◄──►│   Go Backend    │◄──►│   MySQL DB      │
│   (TypeScript)   │    │   (Gin + GORM)  │    │   (Docker)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
      Port 8081              Port 8080              Port 3306
```

## Technology Stack

### Backend

- **Language**: Go 1.21
- **Framework**: Gin (HTTP framework)
- **Database**: MySQL 8.0 with GORM ORM
- **Authentication**: JWT tokens
- **Infrastructure**: Docker & Docker Compose
- **Features**: Web crawling, HTML parsing, link analysis

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Icons**: Lucide React
- **Charts**: Recharts (ready for implementation)
- **Features**: Real-time updates, responsive design, professional UI

## Features

### Core Functionality

- **Web Crawling**: Analyze websites for HTML structure and content
- **Link Analysis**: Categorize internal vs external links, detect broken links
- **Content Analysis**: Count heading tags (H1-H6), detect HTML version
- **Login Detection**: Identify login forms using multiple detection patterns
- **Real-time Status**: Track crawling progress (queued → running → completed)

### User Interface

- **Professional Dashboard**: Modern, responsive design with statistics overview
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- **Advanced Search**: Filter and search URLs with real-time results
- **Pagination**: Efficient handling of large datasets
- **Detailed Analytics**: Comprehensive analysis view with charts and breakdowns
- **Bulk Operations**: Select multiple URLs for batch delete/rerun operations

### Technical Features

- **JWT Authentication**: Secure API access with token-based auth
- **Real-time Updates**: Automatic polling for status changes
- **Concurrent Processing**: Background crawling with goroutines
- **Error Handling**: Comprehensive error management and user feedback
- **Containerized**: Full Docker setup for easy deployment

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local frontend development)
- Go 1.21+ (for local backend development)

### 1. Clone & Setup

```bash
git clone https://github.com/abm1499/web-crawler-assignmentl
cd web-crawler-assignment
```

### 2. Start Backend Services

```bash
cd backend
docker-compose up -d
```

This starts:

- MySQL database on port 3306
- Go backend API on port 8080

### 3. Start Frontend Development Server

```bash
cd ../frontend
npm install
npm run dev
```

Frontend will be available at http://localhost:8081

### 4. Access the Application

1. Open http://localhost:8081
2. Login with demo credentials:
   - **Username**: admin
   - **Password**: password
3. Start analyzing websites!

## Testing the Application

### Backend API Testing

```bash
# Health check
curl http://localhost:8080/health

# Login and get JWT token
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}'

# Add URL for crawling (replace TOKEN with actual JWT)
curl -X POST http://localhost:8080/api/urls \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"url":"https://example.com"}'

# Get crawling results
curl -X GET http://localhost:8080/api/urls \
  -H "Authorization: Bearer TOKEN"
```

## Contributing

This project was built as a technical assessment demonstrating:

- Full-stack development capabilities
- Modern development practices
- Professional code organization
- Comprehensive feature implementation

## License

This project is created for educational/interview purposes. You retain full ownership and may license as you see fit.

## Author

**Ammar Bin Mannan**  
Technical Assessment Project
