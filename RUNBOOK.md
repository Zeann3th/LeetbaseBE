# LeetBase Local Deployment Runbook

## Services

This compose stack runs:

- API: `http://localhost:7554`
- Chatbot: `http://localhost:9000`
- MongoDB: `localhost:27017`
- Redis: `localhost:6379`
- MailHog SMTP: `localhost:1025`
- MailHog UI: `http://localhost:8025`
- MinIO API: `http://localhost:9002`
- MinIO Console: `http://localhost:9001`
- Local JavaScript judge: `http://localhost:2000/api/v2/runtimes`

## First Run

```bash
docker compose up -d --build
docker compose --profile seed run --rm seed
```

The seed job clears and recreates local data in `MONGO_DB_NAME`, then uploads function declarations and code templates to MinIO.

## Seeded Login

```text
Admin email: seedadmin@example.com
Admin username: seedadmin
Password: password123
```

Normal users are `seeduser002@example.com` through `seeduser100@example.com`, all with password `password123`.

## Seeded Data

The seed job creates:

- 100 auth/user pairs
- 40 problems
- 30 daily problems for the current month
- 180 submissions
- 80 discussions
- top-level comments and replies
- todo entries for the first 40 users
- MinIO objects under each problem id:
  - `funcs/javascript`
  - `funcs/typescript`
  - `funcs/python`
  - `funcs/java`
  - `funcs/c`
  - `funcs/cpp`
  - `funcs/go`
  - matching `templates/<language>` objects

Problem documents are seeded with:

```json
"supports": ["javascript", "typescript", "python", "java", "c", "cpp", "go"]
```

## Judge Behavior

Submissions call `PISTON_API_URL`.

In Docker, `.env.docker` points it to:

```text
PISTON_API_URL=http://judge:2000/api/v2
```

The included local judge is intentionally small and supports JavaScript execution for the seeded JavaScript templates. JavaScript templates include assertions and print `Accepted` only after all tests pass.

The seed script also uploads runnable assertion harnesses for Python and TypeScript. C, C++, Java, and Go are seeded with starter compile wrappers and the correct `USER CODE HERE` markers, but their generated templates do not yet include full assertions because the current problem schema has no language-specific type metadata.

To use a full external Piston service, change `PISTON_API_URL` in `.env.docker` to that service's API root and ensure the runtimes are installed.

## Common Commands

Start the stack:

```bash
docker compose up -d --build
```

Run or rerun seed data:

```bash
docker compose --profile seed run --rm seed
```

View logs:

```bash
docker compose logs -f api
docker compose logs -f judge
docker compose logs -f chatbot
```

Stop services:

```bash
docker compose down
```

Stop services and remove local MongoDB/MinIO volumes:

```bash
docker compose down -v
```

## Health Checks

API:

```bash
curl http://localhost:7554/healthz
```

Problems:

```bash
curl "http://localhost:7554/v1/problems?limit=5"
```

Judge runtimes:

```bash
curl http://localhost:2000/api/v2/runtimes
```

MailHog:

Open `http://localhost:8025`.

## Environment Notes

`.env.docker` uses local placeholder values. GitHub OAuth and Cloudinary are filled with `abcd` values so the API passes startup validation, but those integrations will not work until real credentials are configured.

MinIO uses:

```text
user: abcdabcd
password: abcdabcd
```

SMTP uses MailHog:

```text
SMTP_HOST=mailhog
SMTP_PORT=1025
```
