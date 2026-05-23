PROJECT_ID  := cloudecodestudy
REGION      := asia-northeast1
SERVICE     := dayly
REPO        := $(REGION)-docker.pkg.dev/$(PROJECT_ID)/$(SERVICE)
IMAGE       := $(REPO)/$(SERVICE)
SHA         := $(shell git rev-parse --short HEAD)

.PHONY: build push deploy logs setup-ar setup-wif

# ---------- ローカルビルド ----------
build:
	docker build -t $(IMAGE):$(SHA) -t $(IMAGE):latest .

# ---------- Artifact Registry へ push ----------
push: build
	docker push $(IMAGE):$(SHA)
	docker push $(IMAGE):latest

# ---------- Cloud Run へデプロイ ----------
deploy: push
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE):$(SHA) \
		--project $(PROJECT_ID) \
		--region $(REGION) \
		--platform managed \
		--allow-unauthenticated \
		--port 8080

# ---------- ログ確認 ----------
logs:
	gcloud run services logs read $(SERVICE) \
		--project $(PROJECT_ID) \
		--region $(REGION) \
		--limit 100

# ---------- 初回セットアップ ----------
# Artifact Registry リポジトリを作成
setup-ar:
	gcloud artifacts repositories create $(SERVICE) \
		--repository-format docker \
		--location $(REGION) \
		--project $(PROJECT_ID)
	gcloud auth configure-docker $(REGION)-docker.pkg.dev

# Workload Identity Federation を設定（GitHub Actions 用・初回のみ実行）
# GITHUB_REPO=org/repo を指定して実行: make setup-wif GITHUB_REPO=your-org/dayly
setup-wif:
	@test -n "$(GITHUB_REPO)" || (echo "Usage: make setup-wif GITHUB_REPO=<org>/<repo>" && exit 1)
	gcloud iam workload-identity-pools create github-pool \
		--project $(PROJECT_ID) \
		--location global \
		--display-name "GitHub Actions Pool"
	gcloud iam workload-identity-pools providers create-oidc github-provider \
		--project $(PROJECT_ID) \
		--location global \
		--workload-identity-pool github-pool \
		--display-name "GitHub provider" \
		--attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository" \
		--issuer-uri "https://token.actions.githubusercontent.com"
	gcloud iam service-accounts create github-deployer \
		--project $(PROJECT_ID) \
		--display-name "GitHub Actions Deployer"
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member "serviceAccount:github-deployer@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role roles/run.admin
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member "serviceAccount:github-deployer@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role roles/artifactregistry.writer
	gcloud projects add-iam-policy-binding $(PROJECT_ID) \
		--member "serviceAccount:github-deployer@$(PROJECT_ID).iam.gserviceaccount.com" \
		--role roles/iam.serviceAccountUser
	gcloud iam service-accounts add-iam-policy-binding \
		github-deployer@$(PROJECT_ID).iam.gserviceaccount.com \
		--project $(PROJECT_ID) \
		--role roles/iam.workloadIdentityUser \
		--member "principalSet://iam.googleapis.com/projects/$$(gcloud projects describe $(PROJECT_ID) --format='value(projectNumber)')/locations/global/workloadIdentityPools/github-pool/attribute.repository/$(GITHUB_REPO)"
	@echo ""
	@echo "=== GitHub Secrets に以下を設定してください ==="
	@echo "WIF_PROVIDER: $$(gcloud iam workload-identity-pools providers describe github-provider --project $(PROJECT_ID) --location global --workload-identity-pool github-pool --format='value(name)')"
	@echo "WIF_SERVICE_ACCOUNT: github-deployer@$(PROJECT_ID).iam.gserviceaccount.com"
