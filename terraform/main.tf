terraform {
  required_providers {
    render = {
      source  = "render-oss/render"
      version = "1.3.0"
    }
  }
}

provider "render" {
  api_key = var.render_api_key
}

variable "render_api_key" {
  type        = string
  description = "Render API Key"
  sensitive   = true
}

# Postgres Database
resource "render_postgres" "db" {
  name      = "proyectosimon-db"
  plan      = "free"
  region    = "ohio"
  version   = "15"
}

# Backend web service
resource "render_service" "backend" {
  name       = "proyectosimon-backend"
  type       = "web_service"
  repo       = "https://github.com/tu-usuario/proyecto-simon" # TODO: Update with your repo
  branch     = "main"
  env        = "docker"
  region     = "ohio"
  plan       = "free"
  
  docker_details {
    docker_context = "./backend"
    docker_file    = "Dockerfile"
  }

  env_vars = {
    DATABASE_URL = { value = render_postgres.db.connection_string }
    NODE_ENV     = { value = "production" }
    PORT         = { value = "4000" }
    AI_PROVIDER  = { value = "groq" }
    AI_MODEL     = { value = "llama-3.1-8b-instant" }
    AI_BASE_URL  = { value = "https://api.groq.com/openai/v1" }
    # Set AI_API_KEY as a secret manually in the Render dashboard
    # FRONTEND_ORIGIN = { value = "https://tu-frontend.onrender.com" }
  }
}

# Frontend static site or web service
resource "render_service" "frontend" {
  name       = "proyectosimon-frontend"
  type       = "web_service"
  repo       = "https://github.com/tu-usuario/proyecto-simon" # TODO: Update
  branch     = "main"
  env        = "docker"
  region     = "ohio"
  plan       = "free"

  docker_details {
    docker_context = "./frontend"
    docker_file    = "Dockerfile"
  }

  env_vars = {
    VITE_API_URL = { value = "https://proyectosimon-backend.onrender.com" }
    VITE_WS_URL  = { value = "https://proyectosimon-backend.onrender.com" }
  }
}
