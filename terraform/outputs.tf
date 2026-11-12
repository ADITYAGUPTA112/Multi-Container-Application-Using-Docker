output "server_public_ip" {
  description = "Public IPv4 address of the remote cloud server"
  value       = digitalocean_droplet.web_server.ipv4_address
}

output "ssh_connection_string" {
  description = "Command string to SSH into the provisioned server"
  value       = "ssh root@${digitalocean_droplet.web_server.ipv4_address}"
}

output "application_url" {
  description = "Public URL to access the deployed multi-container application"
  value       = "http://${digitalocean_droplet.web_server.ipv4_address}"
}
