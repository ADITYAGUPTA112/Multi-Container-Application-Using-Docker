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

        stage('Install & Test') {
            steps {
                dir('api') {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest ./api"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                sh 'echo $DOCKER_HUB_CREDS_PSW | docker login -u $DOCKER_HUB_CREDS_USR --password-stdin'
                sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
                sh "docker push ${DOCKER_IMAGE}:latest"
            }
        }

        stage('Deploy Multi-Container Stack') {
            steps {
                sh 'docker compose -f docker-compose.prod.yml pull || docker-compose -f docker-compose.prod.yml pull'
                sh 'docker compose -f docker-compose.prod.yml up -d --remove-orphans || docker-compose -f docker-compose.prod.yml up -d --remove-orphans'
            }
        }

        stage('Verify Health') {
            steps {
                sh 'sleep 5'
                sh 'curl -f http://localhost/health || curl -f http://localhost:5000/health'
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
        success {
            echo "Pipeline succeeded! Application deployed and healthy."
        }
        failure {
            echo "Pipeline failed. Inspect stage logs for errors."
        }
    }
}
