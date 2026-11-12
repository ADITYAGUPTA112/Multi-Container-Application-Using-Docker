variable "do_token" {
  description = "DigitalOcean Personal Access API Token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean data center region"
  type        = string
  default     = "nyc3"
}

variable "droplet_size" {
  description = "Droplet instance compute size"
  type        = string
  default     = "s-1vcpu-1gb" # Low cost, perfect for Docker Compose setup
}

variable "droplet_image" {
  description = "Base operating system image"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "droplet_name" {
  description = "Hostname for the provisioned server"
  type        = string
  default     = "multi-container-todo-prod"
}

variable "ssh_public_key_path" {
  description = "Path to the public SSH key for administrative access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}
