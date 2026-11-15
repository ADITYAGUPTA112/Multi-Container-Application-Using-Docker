pipeline {
    agent any

    environment {
        DOCKER_IMAGE = 'aditya5005/todo-api'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_HUB_CREDS = credentials('docker-hub-credentials')
        KUBECONFIG_CREDENTIAL = 'k8s-kubeconfig'
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
                    sh 'npm.cmd ci || npm ci'
                    sh 'npm.cmd test || npm test'
                }
            }
        }

        stage('Build Multi-Platform Docker Image') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} -t ${DOCKER_IMAGE}:latest ./api"
            }
        }

        stage('Security Scan (Trivy)') {
            steps {
                sh "docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:latest image --severity CRITICAL,HIGH --exit-code 0 ${DOCKER_IMAGE}:${DOCKER_TAG}"
            }
        }

        stage('Push to Docker Hub') {
            steps {
                sh 'echo $DOCKER_HUB_CREDS_PSW | docker login -u $DOCKER_HUB_CREDS_USR --password-stdin'
                sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
                sh "docker push ${DOCKER_IMAGE}:latest"
            }
        }

        stage('Deploy to Kubernetes Cluster') {
            steps {
                script {
                    echo "Applying Kubernetes manifests to todo-platform namespace..."
                    sh '''
                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/configmap-secrets.yaml
                        kubectl apply -f k8s/mongodb-statefulset.yaml
                        kubectl apply -f k8s/redis-deployment.yaml
                        kubectl apply -f k8s/api-deployment.yaml
                        kubectl apply -f k8s/ingress-hpa.yaml
                        kubectl set image deployment/todo-api todo-api=${DOCKER_IMAGE}:${DOCKER_TAG} -n todo-platform
                    '''
                }
            }
        }

        stage('Verify K8s Rollout & Health') {
            steps {
                sh 'kubectl rollout status deployment/todo-api -n todo-platform --timeout=120s'
                sh 'kubectl get pods -n todo-platform -o wide'
                sh 'kubectl get services -n todo-platform'
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
        success {
            echo "🚀 Deployment Succeeded! Docker image published and rolling update completed on Kubernetes."
        }
        failure {
            echo "❌ Pipeline failed. Check console output for debug details."
        }
    }
}
