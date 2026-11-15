pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'aditya5005/todo-api'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_HUB_CREDS = credentials('docker-hub-credentials')
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

        stage('Deploy to Kubernetes Cluster') {
            steps {
                bat '''
                    kubectl apply -f k8s/namespace.yaml
                    kubectl apply -f k8s/configmap-secrets.yaml
                    kubectl apply -f k8s/mongodb-statefulset.yaml
                    kubectl apply -f k8s/redis-deployment.yaml
                    kubectl apply -f k8s/api-deployment.yaml
                    kubectl apply -f k8s/ingress-hpa.yaml
                    kubectl set image deployment/todo-api todo-api=%DOCKER_IMAGE%:%DOCKER_TAG% -n todo-platform
                '''
            }
        }

        stage('Verify K8s Rollout & Health') {
            steps {
                bat '''
                    kubectl rollout status deployment/todo-api -n todo-platform --timeout=120s
                    kubectl get pods -n todo-platform -o wide
                    kubectl get services -n todo-platform
                '''
            }
        }
    }

    post {
        always {
            bat 'docker logout || ver > nul'
        }
        success {
            echo "🚀 Deployment Succeeded! Docker image published and rolling update completed on Kubernetes."
        }
        failure {
            echo "❌ Pipeline failed. Check console output for debug details."
        }
    }
}
