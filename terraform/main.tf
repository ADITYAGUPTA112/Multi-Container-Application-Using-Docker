# SSH Key Resource
resource "digitalocean_ssh_key" "deployer_key" {
  name       = "multi-container-deployer-key"
  public_key = file(var.ssh_public_key_path)
}

# Remote VPS Instance (Droplet)
resource "digitalocean_droplet" "web_server" {
  image    = var.droplet_image
  name     = var.droplet_name
  region   = var.region
  size     = var.droplet_size
  ssh_keys = [digitalocean_ssh_key.deployer_key.fingerprint]

  tags = ["multi-container", "production", "todo-app"]

  # Basic initial provisioning script
  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y curl ufw
              EOF
}

# Cloud Firewall (Perimeter Security)
resource "digitalocean_firewall" "web_firewall" {
  name = "multi-container-firewall"

  droplet_ids = [digitalocean_droplet.web_server.id]

  # Inbound rule: SSH (Port 22)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Inbound rule: HTTP (Port 80)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Inbound rule: HTTPS (Port 443)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Outbound rules: Allow all outgoing traffic
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
