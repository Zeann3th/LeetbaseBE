class Env {
  constructor(schema) {
    this.schema = schema;
    this.errors = [];
    this.validate(process.env);
  }
  validate(env) {
    for (const [key, isRequired] of Object.entries(this.schema)) {
      if (isRequired && !env[key]) {
        this.errors.push(`Missing required environment variable: ${key}`);
      }
    }
    if (this.errors.length > 0) {
      this.logErrors();
      process.exit(1);
    }
  }
  logErrors() {
    console.error("\nEnvironment validation failed:");
    this.errors.forEach(err => console.error(err));
  }
}

new Env({
  PORT: true,
  APP_URL: true,
  SERVICE_TOKEN: true,
  // MONGODB
  MONGO_URI: true,
  MONGO_DB_NAME: true,
  // JWT
  TOKEN_SECRET: true,
  REFRESH_TOKEN_SECRET: true,
  // SMTP
  SMTP_HOST: true,
  SMTP_EMAIL: true,
  SMTP_PASSWORD: true,
  // Cache
  REDIS_URL: true,
  // Cloudflare R2
  CF_ACCOUNT_ID: true,
  CF_BUCKET: true,
  CF_ACCESS_KEY_ID: true,
  CF_SECRET_ACCESS_KEY: true,
  // Github OAuth
  GH_CLIENT_ID: true,
  GH_CLIENT_SECRET: true,

  // Cloudinary
  CLOUDINARY_NAME: true,
  CLOUDINARY_API_KEY: true,
  CLOUDINARY_API_SECRET: true,
})
