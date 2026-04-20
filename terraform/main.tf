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

resource "render_postgres" "db" {
  name      = "proyectosimon-db"
  plan      = "free"
  region    = "ohio"
  version   = "15"
}

resource "render_web_service" "backend" {
  name       = "proyectosimon-backend"
  region     = "ohio"
  plan       = "free"
  
  runtime_source = {
    docker = {
      repo_url       = "https://github.com/Cmon88/proyecto-simon-test"
      branch         = "main"
      context        = "./backend"
      dockerfile_path = "./backend/Dockerfile"
    }
  }

  env_vars = {
    DATABASE_URL = { value = render_postgres.db.connection_info.internal_connection_string }
    NODE_ENV     = { value = "production" }
    PORT         = { value = "4000" }
    AI_PROVIDER  = { value = "groq" }
    AI_MODEL     = { value = "llama-3.1-8b-instant" }
    AI_BASE_URL  = { value = "https://api.groq.com/openai/v1" }
    AI_API_KEY   = { value = "PASA_AI_KEY_POR_VARIABLE" }
  }
}

resource "render_web_service" "frontend" {
  name       = "proyectosimon-frontend"
  region     = "ohio"
  plan       = "free"

  runtime_source = {
    docker = {
      repo_url       = "https://github.com/Cmon88/proyecto-simon-test"
      branch         = "main"
      context        = "./frontend"
      dockerfile_path = "./frontend/Dockerfile"
    }
  }

  env_vars = {
    VITE_API_URL = { value = "https://proyectosimon-backend.onrender.com" }
    VITE_WS_URL  = { value = "https://proyectosimon-backend.onrender.com" }
  }
}

