pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'aditya5005/todo-api'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_HUB_CREDS = credentials('docker-hub-credentials')
        KUBECONFIG = 'C:\\Users\\ag683\\.kube\\config'
    }

    stages {
        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies & Run Tests') {
            steps {
                dir('api') {
                    bat 'npm.cmd install || npm install'
                    bat 'npm.cmd test || npm test'
                }
            }
        }

        stage('Build Multi-Platform Docker Image') {
            steps {
                bat "docker build -t %DOCKER_IMAGE%:%DOCKER_TAG% -t %DOCKER_IMAGE%:latest ./api"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                bat 'docker login -u %DOCKER_HUB_CREDS_USR% -p %DOCKER_HUB_CREDS_PSW%'
                bat 'docker push %DOCKER_IMAGE%:%DOCKER_TAG%'
                bat 'docker push %DOCKER_IMAGE%:latest'
            }
        }

        stage('Deploy to Kubernetes or Docker Stack') {
            steps {
                bat '''
                    kubectl cluster-info > nul 2>&1
                    if %ERRORLEVEL% EQU 0 (
                        echo [Deploy] Active Kubernetes cluster detected. Applying K8s manifests...
                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/configmap-secrets.yaml
                        kubectl apply -f k8s/mongodb-statefulset.yaml
                        kubectl apply -f k8s/redis-deployment.yaml
                        kubectl apply -f k8s/api-deployment.yaml
                        kubectl apply -f k8s/ingress-hpa.yaml
                        kubectl set image deployment/todo-api todo-api=%DOCKER_IMAGE%:%DOCKER_TAG% -n todo-platform
                        kubectl rollout status deployment/todo-api -n todo-platform --timeout=60s
                    ) else (
                        echo [Deploy] No active Kubernetes cluster found. Deploying via Docker Compose Production Stack...
                        docker stop todo-api-prod > nul 2>&1 || ver > nul
                        docker rm -f todo-api-prod > nul 2>&1 || ver > nul
                        docker compose -p aae -f docker-compose.prod.yml pull || docker-compose -p aae -f docker-compose.prod.yml pull
                        docker compose -p aae -f docker-compose.prod.yml up -d --remove-orphans || docker-compose -p aae -f docker-compose.prod.yml up -d --remove-orphans
                    )
                '''
            }
        }

        stage('Verify Health') {
            steps {
                bat '''
                    kubectl cluster-info > nul 2>&1
                    if %ERRORLEVEL% EQU 0 (
                        echo [Verify] Fetching Kubernetes Pods and Services...
                        kubectl get pods -n todo-platform
                        kubectl get services -n todo-platform
                    ) else (
                        docker compose -p aae -f docker-compose.prod.yml ps || docker-compose -p aae -f docker-compose.prod.yml ps
                    )
                '''
            }
        }
    }

    post {
        always {
            bat 'docker logout || ver > nul'
        }
        success {
            echo "=== Deployment Succeeded! Code tested, Docker image published to Docker Hub, and services deployed. ==="
        }
        failure {
            echo "=== Pipeline failed. Check console output for debug details. ==="
        }
    }
}
